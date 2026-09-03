import getWyMusicInfo from '@/utils/musicSdk/wy/musicInfo'
import { getListMusics, updateListMusics } from '@/core/list'
import { httpFetch } from '@/utils/request'
import { toast } from '@/utils/tools'

const REFRESH_DELAY = 300

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 只有网易(wy)/酷狗(kg)源的歌曲支持播放MV，其他源重新拉取没有意义；
// 仅挑选 meta.mv 缺失的歌曲进行补全。
// 注意：酷狗无 MV 时存的是空字符串、网易是无 MV 时存的是 0，
// 这些值与 null/undefined 一样都视为“缺失”
const isMvMissing = (musicInfo: LX.Music.MusicInfo) => {
  if (musicInfo.source != 'wy' && musicInfo.source != 'kg') return false
  const mv = (musicInfo.meta as LX.Music.MusicInfoMeta_online).mv
  return mv == null || mv === '' || mv === 0
}

/**
 * “重新导入”：逐首从歌曲对应平台（仅网易/酷狗）拉取最新歌曲信息，
 * 补全列表内旧数据缺失的 meta.mv 字段，使播放MV菜单可用。
 * 拉取成功但源本身没有 MV 的歌曲不会写入（保持无 MV 状态）。
 */
export const refreshListMvInfo = async(listId: string) => {
  const list = await getListMusics(listId)
  const targets = list.filter(isMvMissing)
  if (!targets.length) {
    toast('列表内没有需要重新导入的网易/酷狗歌曲', 'long')
    return
  }

  toast(`开始重新拉取 ${targets.length} 首歌曲的信息...`, 'long')
  const updated: Array<{ id: string, musicInfo: LX.Music.MusicInfo }> = []
  let failed = 0

  for (const musicInfo of targets) {
    try {
      const meta = musicInfo.meta as LX.Music.MusicInfoMeta_online
      if (musicInfo.source == 'wy') {
        if (!meta.songId) throw new Error('缺少歌曲ID')
        const song = await getWyMusicInfo(meta.songId).promise
        const mv: number = song?.mv ?? 0
        // 网易的 mv 字段为数值型 id，0 表示没有 MV
        if (mv > 0) {
          updated.push({ id: musicInfo.id, musicInfo: { ...musicInfo, meta: { ...musicInfo.meta, mv } } })
        }
      } else {
        const hash = (musicInfo.meta as LX.Music.MusicInfo_kg['meta']).hash
        if (!hash) throw new Error('缺少hash')
        // 聚合接口（v2/album_audio/audio）不返回 mvhash，改用 v3/song/info 直接查（已实测返回 data.mvhash）
        const { body } = await (httpFetch(`http://mobilecdnbj.kugou.com/api/v3/song/info?hash=${hash}&version=9108&plat=0&area_code=1`) as {
          promise: Promise<{ body: { status: number, data?: { mvhash?: string } } }>
        }).promise
        const mv = body?.data?.mvhash
        // 酷狗的 mv 为 mvhash 字符串，空表示没有 MV
        if (mv) {
          updated.push({ id: musicInfo.id, musicInfo: { ...musicInfo, meta: { ...musicInfo.meta, mv } } })
        }
      }
    } catch {
      failed++
    }
    await delay(REFRESH_DELAY)
  }

  if (updated.length) void updateListMusics(updated)
  toast(`重新导入完成：${updated.length} 首补全了MV信息${failed ? `，${failed} 首获取失败` : ''}`, 'long')
}
