/**
 * 歌手图片获取模块
 *
 * 由于当前播放的歌曲信息（LX.Music.MusicInfo）里只有歌手名字符串，
 * 没有保存各音源的歌手 ID，因此无法直接调用各源的“按 ID 查歌手详情”接口
 * （如 wy 的 /weapi/artist/head/info/get、kg 的 /api/v5/singer/info 等）。
 *
 * 图源优先级：QQ音乐 → 网易云，两个都失败才返回 null。
 *
 * - QQ音乐：走 smartbox 联想搜索接口按歌手名匹配，取 singerMID 后用官方 CDN
 *   规则拼接歌手头图（T001 开头 = 歌手图，T002 开头 = 专辑图，是两类不同资源位）。
 *   华语歌手覆盖率和图片准确率是几个音源里最好的，且完全不需要 Cookie/Key。
 * - 网易云：按歌手名搜索，取排名第一的歌手头图，作为 QQ音乐查不到时的兜底。
 *
 * 使用方就算请求失败也不应该影响正常播放，因此这里内部吞掉了错误，
 * 失败时返回 null，由调用方自行决定 fallback（例如回退到专辑封面）。
 */
import { httpFetch } from '../request'
import { weapi } from './wy/utils/crypto'

// 内存缓存，key 为歌手名，避免同一歌手在会话内重复请求
const singerPicCache = new Map<string, string | null>()
// 避免同一歌手并发请求多次
const pendingRequests = new Map<string, Promise<string | null>>()

interface WySearchArtist {
  id: number
  name: string
  picUrl?: string | null
  img1v1Url?: string | null
  albumSize?: number
}

interface WySearchResult {
  code: number
  result?: {
    artists?: WySearchArtist[]
  }
}

interface TxSmartboxSinger {
  singerMID?: string
  singerName?: string
}

interface TxSmartboxResult {
  code: number
  data?: {
    singer?: {
      itemlist?: TxSmartboxSinger[]
    }
  }
}

const MAX_RETRY = 1

/**
 * 从歌手名字符串里粗略取出可比较的"核心名字"，用于校验 QQ音乐联想接口
 * 返回的候选歌手是否真的对应我们要找的歌手（联想接口本质是模糊搜索，
 * 排第一的不一定是精确匹配，尤其同名歌手或歌手名是常见词时）。
 */
const normalizeSingerName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, '')

const requestSingerPicFromTx = async(singerName: string, retryNum = 0): Promise<string | null> => {
  const requestObj = httpFetch(`https://c.y.qq.com/splcloud/fcgi-bin/smartbox_new.fcg?is_xml=0&format=json&key=${encodeURIComponent(singerName)}&loginUin=0&hostUin=0&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq&needNewCode=0`, {
    headers: {
      Referer: 'https://y.qq.com/portal/player.html',
    },
  })

  let body: TxSmartboxResult
  try {
    const result = await requestObj.promise
    body = result.body as TxSmartboxResult
  } catch (err) {
    if (retryNum >= MAX_RETRY) return null
    return requestSingerPicFromTx(singerName, retryNum + 1)
  }

  if (body.code !== 0) return null

  const singerList = body.data?.singer?.itemlist
  if (!singerList?.length) return null

  // 联想接口返回的是模糊匹配列表，优先取名字完全一致的项，
  // 避免歌手名是常见字/词时（如"海豚"）被无关结果顶掉
  const target = normalizeSingerName(singerName)
  const singer = singerList.find(item => item.singerName && normalizeSingerName(item.singerName) === target) ?? singerList[0]
  if (!singer?.singerMID) return null

  return `https://y.gtimg.cn/music/photo_new/T001R800x800M000${singer.singerMID}.jpg`
}

const requestSingerPicFromWy = async(singerName: string, retryNum = 0): Promise<string | null> => {
  const requestObj = httpFetch('https://music.163.com/weapi/cloudsearch/get/web', {
    method: 'post',
    form: weapi({
      s: singerName,
      type: 100, // 100: 歌手
      limit: 1,
      offset: 0,
    }),
  })

  let body: WySearchResult
  try {
    const result = await requestObj.promise
    body = result.body as WySearchResult
  } catch (err) {
    if (retryNum >= MAX_RETRY) return null
    return requestSingerPicFromWy(singerName, retryNum + 1)
  }

  if (body.code !== 200) return null

  const artist = body.result?.artists?.[0]
  if (!artist) return null

  // img1v1Url 是网易云默认头像时会指向一张统一的占位图（id 为 5639395138885805），
  // 这种情况下认为没有真实头像，避免把占位图当成“歌手图片”用作背景
  const rawUrl = artist.picUrl || artist.img1v1Url
  if (!rawUrl || rawUrl.includes('5639395138885805')) return null

  // 请求一张更高清的图（网易云支持在图片链接后拼接 ?param=宽x高）
  return `${rawUrl}?param=1024y1024`
}

/**
 * 依次尝试各音源，返回第一个命中的歌手图链接
 */
const requestSingerPic = async(name: string): Promise<string | null> => {
  try {
    const txUrl = await requestSingerPicFromTx(name)
    if (txUrl) return txUrl
  } catch (err) {
    // QQ音乐失败不影响继续尝试网易云
  }

  try {
    return await requestSingerPicFromWy(name)
  } catch (err) {
    return null
  }
}

/**
 * 根据歌手名获取歌手图片链接
 * @param singerName 歌手名，支持“歌手A、歌手B”这种多歌手拼接的字符串，取第一个歌手
 * @returns 图片链接，获取失败时返回 null
 */
export const getSingerPicBySingerName = async(singerName: string | null | undefined): Promise<string | null> => {
  const name = singerName?.trim().split(/[、,，/&]/)[0]?.trim()
  if (!name) return null

  if (singerPicCache.has(name)) return singerPicCache.get(name) ?? null

  const pending = pendingRequests.get(name)
  if (pending) return pending

  const requestPromise = requestSingerPic(name)
    .then(url => {
      singerPicCache.set(name, url)
      return url
    })
    .catch(() => {
      singerPicCache.set(name, null)
      return null
    })
    .finally(() => {
      pendingRequests.delete(name)
    })

  pendingRequests.set(name, requestPromise)
  return requestPromise
}

export default {
  getSingerPicBySingerName,
}
