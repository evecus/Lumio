/**
 * MV 播放器管理器
 *
 * 挂载在应用根节点，监听 app_event.showVideoPlayer(url) 全局事件，
 * 弹出 VideoPlayerModal 进行内嵌播放。
 */
import { useEffect, useRef, useState } from 'react'
import VideoPlayerModal, { type VideoPlayerModalType } from './VideoPlayerModal'

export default () => {
  const modalRef = useRef<VideoPlayerModalType>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const handleShow = (url: string) => {
      if (mounted) {
        modalRef.current?.show(url)
      } else {
        setMounted(true)
        requestAnimationFrame(() => {
          modalRef.current?.show(url)
        })
      }
    }

    global.app_event.on('showVideoPlayer', handleShow)
    return () => {
      global.app_event.off('showVideoPlayer', handleShow)
    }
  }, [mounted])

  return mounted ? <VideoPlayerModal ref={modalRef} /> : null
}
