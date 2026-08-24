import { httpFetch } from '../../request'

/**
 * 酷狗 MV 播放直链获取
 *
 * 两步走，逻辑与 wy/mv.js 完全对齐：
 *   1. 歌曲列表/搜索结果里已携带 `mv`（即 mvhash 字符串）
 *   2. 本函数用 mvhash 换取真实播放 URL
 *
 * 接口说明：
 *   http://m.kugou.com/app/i/mv.php?cmd=100&hash=<mvhash>&ismp3=1&ext=mp4
 * 返回结构：
 *   { mvdata: { sq: { downurl, filesize }, le: { ... }, rq: { ... } } }
 * 画质优先级：超清(sq) > 标清(le) > 流畅(rq)
 */
export const getMvUrl = (mvHash, retryNum = 0) => {
  if (retryNum > 2) return Promise.reject(new Error('try max num'))

  const requestObj = httpFetch(
    `http://m.kugou.com/app/i/mv.php?cmd=100&hash=${mvHash}&ismp3=1&ext=mp4`,
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 11; SAMSUNG SM-G973U) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/14.2 Chrome/87.0.4280.141 Mobile Safari/537.36',
      },
    },
  )

  return requestObj.promise.then(({ body, statusCode }) => {
    if (statusCode !== 200 || !body?.mvdata) {
      return getMvUrl(mvHash, retryNum + 1)
    }

    // 按画质优先级取第一个有 downurl 的清晰度
    const mvdata = body.mvdata
    const quality = mvdata.sq ?? mvdata.le ?? mvdata.rq ?? null
    if (!quality?.downurl) {
      return Promise.reject(new Error('获取MV链接失败'))
    }

    return { url: quality.downurl, mvdata }
  })
}
