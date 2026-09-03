/**
 * MV 播放弹窗（TV 适配版）
 *
 * - 底层用 react-native-video（Android 上自动使用 ExoPlayer）
 * - controls={false}，使用与「TV 播放详情页」一致的自定义控制栏：
 *   - 聚焦 OK/确认键：播放/暂停
 *   - 进度条聚焦后左右键：±10s 快进快退（连续按自动合并，松开 1s 后提交 seek）
 *   - 5s 无操作自动隐藏控制栏；隐藏时按任意方向键重新呼出
 *   - 返回键：控制栏隐藏时先呼出，控制栏可见时才退出播放器（防误触退出）
 *   - 遥控器媒体键（播放/暂停）：直接切换播放状态
 * - 顶部显示歌曲名 + 歌手名
 * - 加载/缓冲统一显示 loading 指示器，20s 超时提示失败
 * - 播放出错 toast 提示后自动退出，不再静默关闭
 */
import { forwardRef, useImperativeHandle, useRef, useState, useCallback, useEffect } from 'react'
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Animated,
  DeviceEventEmitter,
} from 'react-native'
import Modal, { type ModalType } from '@/components/common/Modal'
import Video, { type VideoRef } from 'react-native-video'
import TVButton, { type TVButtonType } from '@/components/common/TVButton'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { toast } from '@/utils/tools'

export interface VideoPlayerModalType {
  show: (url: string, title?: string, singer?: string) => void
}

const SEEK_STEP = 10          // 左右键快进/快退步长（秒）
const AUTO_HIDE_DELAY = 5000  // 控制栏自动隐藏延时
const SLIDE_DURATION = 260    // 控制栏滑入滑出动画时长
const BAR_HEIGHT = 148        // 底部控制栏总高度（含进度条+按钮）
const LOAD_TIMEOUT = 20000    // 加载超时（毫秒）

const formatTime = (sec: number) => {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  const ss = s % 60
  return m >= 60
    ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

export default forwardRef<VideoPlayerModalType, {}>((_, ref) => {
  const videoRef = useRef<VideoRef>(null)
  const modalRef = useRef<ModalType>(null)
  const playBtnRef = useRef<TVButtonType>(null)

  const [videoUrl, setVideoUrl] = useState('')
  const [title, setTitle] = useState('')
  const [singer, setSinger] = useState('')
  const [loading, setLoading] = useState(true)
  const [buffering, setBuffering] = useState(false)
  const [paused, setPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)

  // 控制栏显隐（ref 供按键回调读取最新值，避免闭包陈旧问题）
  const [barVisible, setBarVisible] = useState(true)
  const barVisibleRef = useRef(true)
  const slideAnim = useRef(new Animated.Value(0)).current
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const endedRef = useRef(false)
  const seekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showBar = useCallback(() => {
    barVisibleRef.current = true
    setBarVisible(true)
    Animated.timing(slideAnim, { toValue: 0, duration: SLIDE_DURATION, useNativeDriver: true }).start()
  }, [slideAnim])

  const hideBar = useCallback(() => {
    barVisibleRef.current = false
    setBarVisible(false)
    Animated.timing(slideAnim, { toValue: BAR_HEIGHT, duration: SLIDE_DURATION, useNativeDriver: true }).start()
  }, [slideAnim])

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      hideBar()
      hideTimerRef.current = null
    }, AUTO_HIDE_DELAY)
  }, [hideBar])

  const handleClose = useCallback(() => {
    modalRef.current?.setVisible(false)
  }, [])

  const handleModalHide = useCallback(() => {
    // 关闭后清空 URL，释放播放器资源
    setVideoUrl('')
    setLoading(true)
    setBuffering(false)
    setPaused(false)
    setCurrentTime(0)
    setDuration(0)
    setBuffered(0)
    setTitle('')
    setSinger('')
    endedRef.current = false
    barVisibleRef.current = true
    setBarVisible(true)
    slideAnim.setValue(0)
    if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null }
    if (seekTimerRef.current) { clearTimeout(seekTimerRef.current); seekTimerRef.current = null }
  }, [slideAnim])

  useImperativeHandle(ref, () => ({
    show(url: string, _title?: string, _singer?: string) {
      setVideoUrl(url)
      setTitle(_title ?? '')
      setSinger(_singer ?? '')
      setLoading(true)
      setBuffering(false)
      setPaused(false)
      setCurrentTime(0)
      setDuration(0)
      setBuffered(0)
      endedRef.current = false
      modalRef.current?.setVisible(true)
      // 显式把焦点推给播放按钮：弹窗二次打开时 hasTVPreferredFocus 不一定再次生效
      requestAnimationFrame(() => {
        playBtnRef.current?.requestFocus()
      })
      // 打开后 5s 无操作自动隐藏控制栏
      scheduleHide()
    },
  }))

  // ── 播放/暂停 ────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    if (endedRef.current) {
      // 播放结束后再按播放：从头重播
      endedRef.current = false
      videoRef.current?.seek(0)
      setPaused(false)
    } else {
      setPaused(p => !p)
    }
    showBar()
    scheduleHide()
  }, [showBar, scheduleHide])

  // ── 遥控器媒体键（播放/暂停） ────────────────────────────────
  useEffect(() => {
    if (!videoUrl) return
    const sub = DeviceEventEmitter.addListener('tvMediaKey', () => {
      togglePlay()
    })
    return () => { sub.remove() }
  }, [videoUrl, togglePlay])

  // ── 进度条左右键 seek（防抖合并，松开 1s 后提交） ────────────
  const draftProgressRef = useRef(0)
  const handleSeekDirection = useCallback((direction: 'left' | 'right') => {
    if (!barVisibleRef.current) {
      showBar()
    }
    if (!duration) return
    const step = (direction === 'right' ? SEEK_STEP : -SEEK_STEP) / duration
    const next = Math.min(1, Math.max(0, (draftProgressRef.current || currentTime / duration) + step))
    draftProgressRef.current = next
    setCurrentTime(next * duration)
    if (seekTimerRef.current) clearTimeout(seekTimerRef.current)
    seekTimerRef.current = setTimeout(() => {
      videoRef.current?.seek(draftProgressRef.current * duration)
      seekTimerRef.current = null
      draftProgressRef.current = 0
    }, 1000)
    scheduleHide()
  }, [duration, currentTime, showBar, scheduleHide])

  // 进度条聚焦进入编辑态时，以当前进度为基准
  const handleSeekFocus = useCallback(() => {
    if (!barVisibleRef.current) showBar()
    draftProgressRef.current = 0
    scheduleHide()
  }, [showBar, scheduleHide])

  const handleAnyControlFocus = useCallback(() => {
    if (!barVisibleRef.current) showBar()
    scheduleHide()
  }, [showBar, scheduleHide])

  // ── 加载超时保护 ─────────────────────────────────────────────
  useEffect(() => {
    if (!videoUrl || !loading) return
    const timer = setTimeout(() => {
      if (loading) {
        toast('MV 加载超时，请重试')
        handleClose()
      }
    }, LOAD_TIMEOUT)
    return () => clearTimeout(timer)
  }, [videoUrl, loading, handleClose])

  const handleError = useCallback(() => {
    toast('MV 播放失败，请稍后重试')
    handleClose()
  }, [handleClose])

  const show = videoUrl && duration > 0 ? Math.min(1, currentTime / duration) : 0

  return (
    <Modal
      ref={modalRef}
      onHide={handleModalHide}
      statusBarPadding={false}
      bgHide={false}      // 禁止点背景关闭，避免误触
      keyHide={false}     // 返回键由自定义 onRequestClose 处理（先呼出控制栏再退出）
      onRequestClose={() => {
        // 与 TV 播放详情页一致的返回键语义：防误触退出
        if (!barVisibleRef.current) {
          showBar()
          scheduleHide()
        } else {
          handleClose()
        }
      }}
    >
      <View style={s.container}>
        {videoUrl ? (
          <Video
            ref={videoRef}
            source={{ uri: videoUrl }}
            style={s.video}
            controls={false}       // 自定义 TV 控制栏（原生控制条不适合遥控器）
            resizeMode="contain"
            paused={paused}
            onLoadStart={() => { setLoading(true) }}
            onLoad={data => {
              setLoading(false)
              setDuration(data.duration || 0)
            }}
            onProgress={data => {
              setCurrentTime(data.currentTime)
              if (data.playableDuration) setBuffered(data.playableDuration)
            }}
            onBuffer={({ isBuffering }) => { setBuffering(isBuffering) }}
            onEnd={() => {
              endedRef.current = true
              setPaused(true)
              showBar()
              scheduleHide()
            }}
            onError={handleError}
          />
        ) : null}

        {/* 加载/缓冲指示器 */}
        {(loading || buffering) && (
          <ActivityIndicator style={s.loading} size="large" color="#FFF" />
        )}

        {/* 顶部标题栏 */}
        {barVisible && !!title && (
          <View style={s.titleBar} pointerEvents="none">
            <Text size={20} color="#ffffff" numberOfLines={1} style={s.titleText}>{title}</Text>
            {!!singer && (
              <Text size={14} color="rgba(255,255,255,0.7)" numberOfLines={1} style={s.titleText}>{singer}</Text>
            )}
          </View>
        )}

        {/* 底部自定义控制栏 */}
        <Animated.View style={[s.bottomBar, { transform: [{ translateY: slideAnim }] }]}>
          {/* 进度条：聚焦后左右键 seek，与 TV 播放详情页交互一致 */}
          <TVButton
            onFocus={handleSeekFocus}
            onDirection={handleSeekDirection}
            onPress={() => {}}
            lockHorizontal
            style={s.seekBarHitArea}
          >
            <View style={s.progressBarTrack}>
              <View style={[s.track, { backgroundColor: 'rgba(255,255,255,0.3)', width: '100%' }]} />
              <View style={[s.track, { backgroundColor: 'rgba(255,255,255,0.5)', width: `${(duration > 0 ? buffered / duration : 0) * 100}%` }]} />
              <View style={[s.track, { backgroundColor: '#4daf7c', width: `${show * 100}%` }]} />
            </View>
          </TVButton>
          <View style={s.timeRow}>
            <Text size={12} color="rgba(255,255,255,0.8)">{formatTime(currentTime)}</Text>
            <Text size={12} color="rgba(255,255,255,0.8)">{formatTime(duration)}</Text>
          </View>
          <View style={s.controls}>
            <TVButton
              ref={playBtnRef}
              style={s.btn}
              onPress={togglePlay}
              onFocus={handleAnyControlFocus}
              hasTVPreferredFocus
              borderRadius={36}
            >
              <Icon name={paused ? 'play' : 'pause'} color="#ffffff" rawSize={28} />
            </TVButton>
          </View>
        </Animated.View>
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

  // ── 顶部标题栏 ──
  titleBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 48,
    paddingVertical: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  titleText: { textAlign: 'left' },

  // ── 底部控制栏 ──
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: BAR_HEIGHT,
    paddingHorizontal: 120,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  seekBarHitArea: { width: '100%', paddingVertical: 8, paddingHorizontal: 2 },
  progressBarTrack: { height: 5, borderRadius: 3, overflow: 'hidden', position: 'relative' },
  track: { position: 'absolute', height: '100%', top: 0, left: 0, borderRadius: 3 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 8,
  },
  btn: {
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
})
