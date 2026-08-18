/**
 * MV 播放弹窗（TV 适配版）
 *
 * - 底层用 react-native-video（Android 上自动使用 ExoPlayer）
 * - controls={true} 直接启用 ExoPlayer 原生控制条，遥控器可操作
 * - 按遥控器返回键或点击右上角关闭按钮退出
 */
import { forwardRef, useImperativeHandle, useRef, useState, useCallback } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Text,
} from 'react-native'
import Modal, { type ModalType } from '@/components/common/Modal'
import Video, { type VideoRef } from 'react-native-video'

export interface VideoPlayerModalType {
  show: (url: string) => void
}

export default forwardRef<VideoPlayerModalType, {}>((_, ref) => {
  const videoRef  = useRef<VideoRef>(null)
  const modalRef  = useRef<ModalType>(null)
  const [videoUrl, setVideoUrl]   = useState('')
  const [loading,  setLoading]    = useState(true)

  useImperativeHandle(ref, () => ({
    show(url: string) {
      setVideoUrl(url)
      setLoading(true)
      modalRef.current?.setVisible(true)
    },
  }))

  const handleClose = useCallback(() => {
    modalRef.current?.setVisible(false)
  }, [])

  const handleModalHide = useCallback(() => {
    // 关闭后清空 URL，释放播放器资源
    setVideoUrl('')
    setLoading(true)
  }, [])

  return (
    <Modal
      ref={modalRef}
      onHide={handleModalHide}
      statusBarPadding={false}
      bgHide={false}      // 禁止点背景关闭，避免误触
      keyHide             // 遥控器返回键关闭
    >
      <View style={s.container}>
        {videoUrl ? (
          <Video
            ref={videoRef}
            source={{ uri: videoUrl }}
            style={s.video}
            controls={true}        // 启用 ExoPlayer 原生控制条（可遥控操作）
            resizeMode="contain"
            onLoadStart={() => setLoading(true)}
            onLoad={() => setLoading(false)}
            onError={() => handleClose()}
          />
        ) : null}

        {/* 加载指示器 */}
        {loading && (
          <ActivityIndicator style={s.loading} size="large" color="#FFF" />
        )}

        {/* 右上角关闭按钮，遥控器可聚焦 */}
        <TouchableOpacity
          style={s.closeBtn}
          onPress={handleClose}
          accessible
          accessibilityLabel="关闭"
          hasTVPreferredFocus
        >
          <Text style={s.closeTxt}>✕</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
})

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  loading: {
    position: 'absolute',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeTxt: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 22,
  },
})
