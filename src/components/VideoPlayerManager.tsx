/**
 * MV 播放器管理器
 *
 * 挂载在应用根节点，监听 app_event.showVideoPlayer(url) 全局事件，
 * 弹出 VideoPlayerModal 进行内嵌播放。
 *
 * 本项目基于 react-native-navigation，不同 Screen 各自独立渲染、没有
 * 单一常驻的根组件树，因此多个页面（如 Home/TV 和 TVMusicDetailScreen）
 * 可能同时挂载各自的 VideoPlayerManager 实例。用模块级标记确保同一时刻
 * 只有一个实例真正响应 showVideoPlayer，避免重复弹出多个播放弹窗。
 */
import { useEffect, useRef, useState } from 'react'
import VideoPlayerModal, { type VideoPlayerModalType } from './VideoPlayerModal'

let activeHandlerId = 0

export default () => {
  const modalRef = useRef<VideoPlayerModalType>(null)
  const [mounted, setMounted] = useState(false)
  const idRef = useRef(0)

  useEffect(() => {
    const myId = ++activeHandlerId
    idRef.current = myId

    const handleShow = (url: string, title?: string, singer?: string) => {
      // 若同一时刻已有更晚挂载（更贴近当前可见页面）的实例接管，本实例不再响应
      if (activeHandlerId !== myId) return
      if (mounted) {
        modalRef.current?.show(url, title, singer)
      } else {
        setMounted(true)
        requestAnimationFrame(() => {
          modalRef.current?.show(url, title, singer)
        })
      }
    }

    global.app_event.on('showVideoPlayer', handleShow)
    return () => {
      global.app_event.off('showVideoPlayer', handleShow)
      // 卸载时若自己是当前激活实例，交还给上一个仍存活的实例（若有）
      if (activeHandlerId === myId) activeHandlerId = myId - 1
    }
  }, [mounted])

  return mounted ? <VideoPlayerModal ref={modalRef} /> : null
}
