/**
 * 歌手图片获取模块
 *
 * 由于当前播放的歌曲信息（LX.Music.MusicInfo）里只有歌手名字符串，
 * 没有保存各音源的歌手 ID，因此无法直接调用各源的“按 ID 查歌手详情”接口
 * （如 wy 的 /weapi/artist/head/info/get、kg 的 /api/v5/singer/info 等）。
 *
 * 这里统一走网易云的歌手搜索接口：按歌手名搜索，取排名第一的歌手头图。
 * 网易云歌手图覆盖率和清晰度都不错，且不需要额外的 Cookie。
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

const MAX_RETRY = 1

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

  const requestPromise = requestSingerPicFromWy(name)
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
