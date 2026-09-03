// import { httpFetch } from '../../request'
// import { weapi } from './utils/crypto'
import { sizeFormate, formatPlayTime } from '../../index'
// import musicDetailApi from './musicDetail'
import { eapiRequest } from './utils/index'

export default {
  limit: 30,
  total: 0,
  page: 0,
  allPage: 1,
  musicSearch(str, page, limit) {
    // const searchRequest = eapiRequest('/api/cloudsearch/pc', {
    //   s: str,
    //   type: 1, // 1: 单曲, 10: 专辑, 100: 歌手, 1000: 歌单, 1002: 用户, 1004: MV, 1006: 歌词, 1009: 电台, 1014: 视频
    //   limit,
    //   total: page == 1,
    //   offset: limit * (page - 1),
    // })
    const searchRequest = eapiRequest('/api/search/song/list/page', {
      keyword: str,
      needCorrect: '1',
      channel: 'typing',
      offset: limit * (page - 1),
      scene: 'normal',
      total: page == 1,
      limit,
    })
    return searchRequest.promise.then(({ body }) => body)
  },
  getSinger(singers) {
    let arr = []
    singers.forEach(singer => {
      arr.push(singer.name)
    })
    return arr.join('、')
  },
  handleResult(rawList) {
    // console.log(rawList)
    if (!rawList) return []
    return rawList.map(item => {
      item = item.baseInfo.simpleSongData

      const types = []
      const _types = {}
      let size

      if (item.privilege.maxBrLevel == 'hires') {
        size = item.hr ? sizeFormate(item.hr.size) : null
        types.push({ type: 'flac24bit', size })
        _types.flac24bit = {
          size,
        }
      }
      // 注意：这里必须用独立的 if 判断，不能用 switch 无 break 的写法。
      // 原来的 switch(maxbr) { case 999000: ... case 320000: ... case 192000: case 128000: ... }
      // 完全没有写 break，会导致一旦命中 999000（无损）这一档，就会顺着往下
      // 把 320k、128k 也全部当作"可用音质"塞进结果里，即使服务端实际上根本
      // 没有这些码率的资源，播放时会因为拿不到对应码率的播放链接而失败。
      // 只有真正达到某个码率上限时，才添加对应的那一档音质标签。
      if (item.sq) {
        size = sizeFormate(item.sq.size)
        types.push({ type: 'flac', size })
        _types.flac = {
          size,
        }
      }
      if (item.h) {
        size = sizeFormate(item.h.size)
        types.push({ type: '320k', size })
        _types['320k'] = {
          size,
        }
      }
      if (item.l) {
        size = sizeFormate(item.l.size)
        types.push({ type: '128k', size })
        _types['128k'] = {
          size,
        }
      }

      types.reverse()

      return {
        singer: this.getSinger(item.ar),
        name: item.name,
        albumName: item.al.name,
        albumId: item.al.id,
        source: 'wy',
        interval: formatPlayTime(item.dt / 1000),
        songmid: item.id,
        img: item.al.picUrl,
        lrc: null,
        types,
        _types,
        typeUrl: {},
        mv: item.mv,
      }
    })
  },
  search(str, page = 1, limit, retryNum = 0) {
    if (++retryNum > 3) return Promise.reject(new Error('try max num'))
    if (limit == null) limit = this.limit
    return this.musicSearch(str, page, limit).then(result => {
      // console.log(result)
      if (!result || result.code !== 200) return this.search(str, page, limit, retryNum)
      let list = this.handleResult(result.data.resources || [])
      // console.log(list)

      if (list == null) return this.search(str, page, limit, retryNum)

      this.total = result.data.totalCount || 0
      this.page = page
      this.allPage = Math.ceil(this.total / this.limit)

      return {
        list,
        allPage: this.allPage,
        limit: this.limit,
        total: this.total,
        source: 'wy',
      }
      // return result.data
    })
  },
}
