/**
 * TV 播放详情页 — 重构版
 *
 * 布局：
 * - 左侧：封面图，顶部与右侧歌手名平行
 * - 右侧：上部固定显示歌曲名+歌手名，下部歌词滚动区
 *
 * 控制栏交互：
 * - 默认隐藏（translate Y 偏移出屏），无背景蒙层
 * - 任意 TVButton 获焦 → 控制栏滑入 + 重置 5s 计时器
 * - 5s 无焦点变化 → 控制栏滑出隐藏
 * - 返回键：控制栏隐藏时先滑入；控制栏可见时退出页面
 * - 控制栏以 position:absolute 悬浮，出现/消失时主体布局不移动
 * - 控制栏出现时部分遮挡歌词底部区域，消失时歌词完整显示
 */
import { memo, useEffect, useRef, useCallback, useState, forwardRef } from 'react'
import {
  View,
  FlatList,
  AppState,
  StyleSheet,
  BackHandler,
  Animated,
  DeviceEventEmitter,
} from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { useIsPlay, usePlayerMusicInfo, usePlayMusicInfo, useProgress, useStatusText, useSingerPic } from '@/store/player/hook'
import { playNext, playPrev, togglePlay } from '@/core/player/player'
import { useBufferProgress } from '@/plugins/player'
import { useLrcPlay, useLrcSet, type Line } from '@/plugins/lyric'
import { pop } from '@/navigation'
import commonState, { type InitState as CommonState } from '@/store/common/state'
import { useStatusbarHeight } from '@/store/common/hook'
import { setComponentId } from '@/core/common'
import { COMPONENT_IDS, LIST_IDS, NAV_SHEAR_NATIVE_IDS, MUSIC_TOGGLE_MODE } from '@/config/constant'
import { screenkeepAwake, screenUnkeepAwake } from '@/utils/nativeModules/utils'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import Image from '@/components/common/Image'
import ImageBackground from '@/components/common/ImageBackground'
import { defaultHeaders } from '@/components/common/Image'
import TVButton, { type TVButtonType } from '@/components/common/TVButton'
import PageContent from '@/components/PageContent'
import StatusBar from '@/components/common/StatusBar'
import { addListMusics } from '@/core/list'
import settingState from '@/store/setting/state'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { toast } from '@/utils/tools'

const BTN_SM = 56
const BTN_LG = 72
const SEEK_STEP = 10
const AUTO_HIDE_DELAY = 5000
const SLIDE_DURATION = 280
const BOTTOM_BAR_HEIGHT = 148

const SingerBackground = memo(({ enabled }: { enabled: boolean }) => {
  const singerPic = useSingerPic()
  const musicInfo = usePlayerMusicInfo()
  const bgUrl = enabled ? (singerPic || musicInfo.pic) : null

  const fadeAnim = useRef(new Animated.Value(0)).current
  const prevUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!bgUrl || bgUrl === prevUrlRef.current) return
    prevUrlRef.current = bgUrl
    fadeAnim.setValue(0)
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start()
  }, [bgUrl, fadeAnim])

  if (!bgUrl) return null

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]} pointerEvents="none">
      <ImageBackground
        source={{ uri: bgUrl, headers: defaultHeaders }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      {/*
        背景图完全清晰，不加模糊、不加遮罩。
        文字可读性交给项目已有的「设置 - 字体阴影」(theme.fontShadow) 机制：
        开启后所有 Text 组件会自动带文字阴影，在任意背景图上都能看清，
        用户可以在 设置 → 主题 里自行开启。
      */}
    </Animated.View>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// 判断某一行歌词是否是"标题行"（歌曲名 - 歌手名 之类），需要隐藏显示
// ─────────────────────────────────────────────────────────────────────────────
// 很多 LRC 文件会在第一行（有时也会在最后一行）附带一条形如
// "歌曲名 - 歌手名" / "歌手名 - 歌曲名" 的说明性文字，而这条信息在播放页
// 顶部已经用 歌曲名 + 歌手名 单独展示过了，滚动到这一行时会显得重复。
//
// 这里只是隐藏显示，不从数组里删除——每一行的时间信息（对应 lrc-file-parser
// 解析出的 Lines 数组）完全不变，播放进度照常滚动到这一行，只是不渲染文字，
// 这样 index === activeLine 高亮判断、FlatList 的 getItemLayout 固定行高、
// 滚动定位逻辑都不需要跟着改。
const normalizeForCompare = (text: string) => text.replace(/\s+/g, '').toLowerCase()

const isTitleInfoLine = (lineText: string, songName: string, singer: string): boolean => {
  const text = lineText?.trim()
  if (!text) return false

  // 词/曲/编曲/制作人/改编词曲 这类"标签：内容"的制作信息行，不算作
  // "歌曲名 - 歌手名"标题行，哪怕内容里包含歌手名也不要隐藏，
  // 避免把真正有用的制作信息也一起隐藏掉。
  if (/^[^\s：:]{1,6}[：:]/.test(text)) return false

  // 歌曲名、歌手名至少要有一个是有效内容，否则没法比对
  const name = songName?.trim()
  const singerName = singer?.trim()
  if (!name && !singerName) return false

  const normalizedLine = normalizeForCompare(text)
  const normalizedName = name ? normalizeForCompare(name) : ''
  const normalizedSinger = singerName ? normalizeForCompare(singerName) : ''

  // 同时包含歌曲名和歌手名，基本可以确定是"歌曲名 - 歌手名"这种说明行
  if (normalizedName && normalizedSinger) {
    if (normalizedLine.includes(normalizedName) && normalizedLine.includes(normalizedSinger)) return true
  }

  // 有些 LRC 只写"歌曲名 - 歌手名"里的一项，但这一行本身几乎就是那一项的
  // 完整内容（长度非常接近，容许中间夹一个分隔符/空格），也认为是标题行；
  // 阈值给得比较高（0.85），避免歌词里恰好提到歌名/歌手名这种正常歌词被误判。
  const isMostlyName = (target: string) =>
    !!target && normalizedLine.includes(target) && target.length >= normalizedLine.length * 0.85
  if (isMostlyName(normalizedName) || isMostlyName(normalizedSinger)) return true

  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// 歌词组件（不再接受 bottomPad，布局固定，控制栏悬浮遮挡）
// ─────────────────────────────────────────────────────────────────────────────
const LyricView = memo(({ isBackgroundLayout, songName, singer }: {
  isBackgroundLayout: boolean
  songName: string
  singer: string
}) => {
  const theme = useTheme()
  const { line: activeLine } = useLrcPlay()
  const lines = useLrcSet()
  const listRef = useRef<FlatList>(null)
  const itemHeights = useRef<number[]>([])

  useEffect(() => {
    if (!listRef.current || lines.length === 0) return
    // 隐藏的标题行不会触发 onLayout，itemHeights 里对应位置会是 undefined，
    // 用 (b || 68) 兜底成固定行高，避免 undefined 参与相加变成 NaN
    // 导致 scrollToOffset 整体失效。
    const offset = itemHeights.current
      .slice(0, Math.max(0, activeLine - 2))
      .reduce((a, b) => a + (b || 68), 0)
    listRef.current.scrollToOffset({ offset, animated: true })
  }, [activeLine, lines.length])

  // 歌手背景样式下，未播放行固定用白色系（不跟随主题色），保证在任意图片背景上都清晰可辨；
  // 当前播放行仍然使用主题色高亮，与非背景样式保持一致的"主题色高亮"效果
  const activeColor = theme['c-primary']
  const inactiveColor = isBackgroundLayout ? 'rgba(255,255,255,0.7)' : theme['c-350']
  const activeSubColor = theme['c-primary-alpha-200']
  const inactiveSubColor = isBackgroundLayout ? 'rgba(255,255,255,0.55)' : theme['c-300']

  const renderItem = useCallback(({ item, index }: { item: Line, index: number }) => {
    const active = index === activeLine
    // 标题说明行：只隐藏文字内容，行本身（含固定高度）依然保留，
    // 这样 FlatList 的 getItemLayout（固定 68px 一行）和滚动定位都不受影响。
    if (isTitleInfoLine(item.text, songName, singer)) {
      return <View style={s.lrcLine} />
    }
    return (
      <View
        style={s.lrcLine}
        onLayout={e => { itemHeights.current[index] = e.nativeEvent.layout.height }}
      >
        <Text
          size={active ? 24 : 18}
          color={active ? activeColor : inactiveColor}
          style={[s.lrcText, active && s.lrcActive]}
          numberOfLines={3}
          textBreakStrategy="simple"
        >
          {item.text}
        </Text>
        {item.extendedLyrics?.[0]?.text ? (
          <Text
            size={active ? 18 : 14}
            color={active ? activeSubColor : inactiveSubColor}
            style={s.lrcText}
            numberOfLines={2}
          >
            {item.extendedLyrics[0].text}
          </Text>
        ) : null}
      </View>
    )
  }, [activeLine, activeColor, inactiveColor, activeSubColor, inactiveSubColor, songName, singer])

  if (lines.length === 0) {
    return (
      <View style={s.lrcEmpty}>
        <Icon name="lyric-on" size={36} color={isBackgroundLayout ? 'rgba(255,255,255,0.7)' : theme['c-font-label']} />
        <Text size={14} color={isBackgroundLayout ? 'rgba(255,255,255,0.7)' : theme['c-font-label']} style={{ marginTop: 10 }}>暂无歌词</Text>
      </View>
    )
  }

  return (
    <View style={s.lrcContainer}>
      <FlatList
        ref={listRef}
        style={s.lrcList}
        data={lines}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.lrcContent}
        getItemLayout={(_, index) => ({
          length: 68,
          offset: 68 * index,
          index,
        })}
      />
    </View>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// 控制按钮
// ─────────────────────────────────────────────────────────────────────────────
const CtrlBtn = memo(forwardRef<TVButtonType, {
  icon: string; size: number; onPress: () => void; preferFocus?: boolean; onFocus?: () => void
}>(({ icon, size, onPress, preferFocus, onFocus }, ref) => {
  const theme = useTheme()
  return (
    <TVButton
      ref={ref}
      style={{ ...s.btn, width: size, height: size }}
      onPress={onPress}
      onFocus={onFocus}
      hasTVPreferredFocus={preferFocus}
    >
      <Icon name={icon} color={theme['c-button-font']} rawSize={size * 0.46} />
    </TVButton>
  )
}))

const LoveBtn = memo(({ onFocus }: { onFocus?: () => void }) => {
  const theme = useTheme()
  const playMusicInfo = usePlayMusicInfo()
  const handlePress = useCallback(() => {
    const musicInfo = playMusicInfo.musicInfo
    if (!musicInfo?.id) return
    void addListMusics(LIST_IDS.LOVE, [musicInfo as LX.Music.MusicInfo], settingState.setting['list.addMusicLocationType'])
      .then(() => toast('已添加到收藏'))
      .catch(() => toast('收藏失败，请重试'))
  }, [playMusicInfo])
  return (
    <TVButton style={{ ...s.btn, width: BTN_SM, height: BTN_SM }} onPress={handlePress} onFocus={onFocus}>
      <Icon name="add-music" color={theme['c-button-font']} rawSize={BTN_SM * 0.46} />
    </TVButton>
  )
})

type ToggleMode = LX.AppSetting['player.togglePlayMethod']
const PLAY_MODE_CYCLE: ToggleMode[] = [
  MUSIC_TOGGLE_MODE.listLoop, MUSIC_TOGGLE_MODE.random, MUSIC_TOGGLE_MODE.list, MUSIC_TOGGLE_MODE.singleLoop,
]
const PLAY_MODE_ICON: Record<string, string> = {
  listLoop: 'list-loop', random: 'list-random', list: 'list-order', singleLoop: 'single-loop', none: 'list-loop',
}
const PLAY_MODE_LABEL: Record<string, string> = {
  listLoop: '列表循环', random: '随机播放', list: '顺序播放', singleLoop: '单曲循环', none: '禁用',
}
const PlayModeBtn = memo(({ onFocus }: { onFocus?: () => void }) => {
  const theme = useTheme()
  const mode = useSettingValue('player.togglePlayMethod')
  const handlePress = useCallback(() => {
    const idx = PLAY_MODE_CYCLE.indexOf(mode as ToggleMode)
    const next = PLAY_MODE_CYCLE[(idx + 1) % PLAY_MODE_CYCLE.length]
    updateSetting({ 'player.togglePlayMethod': next })
    toast(PLAY_MODE_LABEL[next] ?? '')
  }, [mode])
  return (
    <TVButton style={{ ...s.btn, width: BTN_SM, height: BTN_SM }} onPress={handlePress} onFocus={onFocus}>
      <Icon name={PLAY_MODE_ICON[mode] ?? 'list-loop'} color={theme['c-button-font']} rawSize={BTN_SM * 0.46} />
    </TVButton>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// 进度条
// TVButton 只包裹进度轨道，时间行在 TVButton 外部独立显示
// 焦点框只框住进度条，不框住时间文字
// ─────────────────────────────────────────────────────────────────────────────
const formatTime = (sec: number) => {
  const s = Math.floor(sec)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

const SeekBar = memo(({ progress, duration, buffered, nowPlayTimeStr, maxPlayTimeStr, onFocus }: {
  progress: number; duration: number; buffered: number
  nowPlayTimeStr: string; maxPlayTimeStr: string; onFocus?: () => void
}) => {
  const theme = useTheme()
  const [editing, setEditing] = useState(false)
  const [draftProgress, setDraftProgress] = useState(0)
  const durationRef = useRef(duration)
  const draftRef = useRef(draftProgress)
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { durationRef.current = duration }, [duration])
  useEffect(() => { draftRef.current = draftProgress }, [draftProgress])

  const cancelTimer = useCallback(() => {
    if (commitTimerRef.current) { clearTimeout(commitTimerRef.current); commitTimerRef.current = null }
  }, [])
  const scheduleCommit = useCallback(() => {
    cancelTimer()
    commitTimerRef.current = setTimeout(() => {
      global.app_event.setProgress(draftRef.current * durationRef.current)
      commitTimerRef.current = null
    }, 1000)
  }, [cancelTimer])

  const handleFocus = useCallback(() => {
    setDraftProgress(progress); draftRef.current = progress; setEditing(true); onFocus?.()
  }, [progress, onFocus])
  const handleBlur = useCallback(() => { cancelTimer(); setEditing(false) }, [cancelTimer])
  const handleDirection = useCallback((direction: 'left' | 'right') => {
    setDraftProgress(p => {
      const next = direction === 'right'
        ? Math.min(1, p + SEEK_STEP / (durationRef.current || 1))
        : Math.max(0, p - SEEK_STEP / (durationRef.current || 1))
      draftRef.current = next; return next
    })
    scheduleCommit()
  }, [scheduleCommit])

  useEffect(() => () => cancelTimer(), [cancelTimer])

  const displayProgress = editing ? draftProgress : progress
  const progressStr: `${number}%` = `${displayProgress * 100}%`
  const bufferedStr: `${number}%` = `${buffered * 100}%`
  const timeStr = editing ? formatTime(draftProgress * (durationRef.current || 0)) : nowPlayTimeStr

  return (
    <View style={s.progressWrap}>
      {/* TVButton 只包含进度轨道，焦点框范围仅为进度条 */}
      <TVButton
        onFocus={handleFocus} onBlur={handleBlur}
        onDirection={handleDirection} onPress={() => {}}
        lockHorizontal={editing} style={s.seekBarHitArea}
      >
        <View style={s.progressBarTrack}>
          <View style={[s.track, { backgroundColor: theme['c-primary-light-400-alpha-900'], width: '100%' }]} />
          <View style={[s.track, { backgroundColor: theme['c-primary-alpha-600'], width: bufferedStr }]} />
          <View style={[s.track, { backgroundColor: theme['c-primary'], width: progressStr }]} />
        </View>
      </TVButton>
      {/* 时间行在 TVButton 外部，独立渲染，不被焦点框包含 */}
      <View style={s.timeRow}>
        <Text size={11} color={editing ? theme['c-primary'] : theme['c-500']}>{timeStr}</Text>
        <Text size={11} color={editing ? theme['c-primary'] : theme['c-500']}>{maxPlayTimeStr}</Text>
      </View>
    </View>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// 底部控制栏（与页面同色背景，出现时遮挡歌词底部区域）
// ─────────────────────────────────────────────────────────────────────────────
const BottomBar = memo(forwardRef<TVButtonType, {
  slideAnim: Animated.Value; isPlay: boolean; onAnyFocus: () => void
}>(({ slideAnim, isPlay, onAnyFocus }, playBtnRef) => {
  const { nowPlayTimeStr, maxPlayTimeStr, progress, maxPlayTime } = useProgress()
  const buffered = useBufferProgress()

  return (
    <Animated.View style={[s.bottomBar, { transform: [{ translateY: slideAnim }] }]}>
      <SeekBar
        progress={progress} duration={maxPlayTime} buffered={buffered}
        nowPlayTimeStr={nowPlayTimeStr} maxPlayTimeStr={maxPlayTimeStr}
        onFocus={onAnyFocus}
      />
      <View style={s.controls}>
        <View style={[s.controlsSide, { justifyContent: 'flex-end' }]}>
          <PlayModeBtn onFocus={onAnyFocus} />
          <CtrlBtn icon="prevMusic" size={BTN_SM} onPress={() => { void playPrev() }} onFocus={onAnyFocus} />
        </View>
        <CtrlBtn ref={playBtnRef} icon={isPlay ? 'pause' : 'play'} size={BTN_LG} onPress={togglePlay} onFocus={onAnyFocus} />
        <View style={[s.controlsSide, { justifyContent: 'flex-start' }]}>
          <CtrlBtn icon="nextMusic" size={BTN_SM} onPress={() => { void playNext() }} onFocus={onAnyFocus} />
          <LoveBtn onFocus={onAnyFocus} />
        </View>
      </View>
    </Animated.View>
  )
}))

// ─────────────────────────────────────────────────────────────────────────────
// 主组件
// ─────────────────────────────────────────────────────────────────────────────
export default memo(({ componentId }: { componentId: string }) => {
  const theme = useTheme()
  const isPlay = useIsPlay()
  const musicInfo = usePlayerMusicInfo()
  const statusBarHeight = useStatusbarHeight()
  const layout = useSettingValue('playDetail.style.layout')
  const isBackgroundLayout = layout == 'background'

  // 控制栏滑动（向下滑出 = 隐藏）
  const slideAnim = useRef(new Animated.Value(BOTTOM_BAR_HEIGHT)).current  // 初始隐藏
  const paddingAnim = useRef(new Animated.Value(0)).current               // 初始无 padding
  const controlsVisibleRef = useRef(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playBtnRef = useRef<TVButtonType>(null)

  const showControls = useCallback(() => {
    controlsVisibleRef.current = true
    Animated.timing(slideAnim, { toValue: 0, duration: SLIDE_DURATION, useNativeDriver: true }).start()
    Animated.timing(paddingAnim, { toValue: BOTTOM_BAR_HEIGHT, duration: SLIDE_DURATION, useNativeDriver: false }).start()
    // 控制栏原本靠播放按钮 hasTVPreferredFocus 在挂载时静默抢占焦点来"顺带"呼出，
    // 现在改为显式呼出，所以这里也要显式地把焦点推给播放按钮，方便呼出后直接用方向键操作
    playBtnRef.current?.requestFocus()
  }, [slideAnim, paddingAnim])

  const hideControls = useCallback(() => {
    controlsVisibleRef.current = false
    Animated.timing(slideAnim, { toValue: BOTTOM_BAR_HEIGHT, duration: SLIDE_DURATION, useNativeDriver: true }).start()
    Animated.timing(paddingAnim, { toValue: 0, duration: SLIDE_DURATION, useNativeDriver: false }).start()
  }, [slideAnim, paddingAnim])

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(hideControls, AUTO_HIDE_DELAY)
  }, [hideControls])

  const handleAnyFocus = useCallback(() => {
    if (!controlsVisibleRef.current) showControls()
    scheduleHide()
  }, [showControls, scheduleHide])

  useEffect(() => {
    setComponentId(COMPONENT_IDS.playDetail, componentId)
    screenkeepAwake()

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') { if (!commonState.componentIds.comment) screenkeepAwake() }
      else if (state === 'background') { screenUnkeepAwake() }
    })
    const onIdsChange = (ids: CommonState['componentIds']) => {
      if (ids.comment) screenUnkeepAwake()
      else if (AppState.currentState === 'active') screenkeepAwake()
    }
    global.state_event.on('componentIdsUpdated', onIdsChange)

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!controlsVisibleRef.current) {
        showControls(); scheduleHide(); return true
      }
      global.state_event.emit('tvPlayDetailWillPop')
      void pop(commonState.componentIds.playDetail!)
      return true
    })

    // 遥控器下键：呼出底部控制栏（原来是通过焦点移动到控制栏隐式触发，
    // 现在改为监听原生下键事件显式触发，避免和"返回键"语义混在一起）
    const dpadDownSub = DeviceEventEmitter.addListener('tvDpadDownKey', () => {
      if (!controlsVisibleRef.current) { showControls(); scheduleHide() }
    })

    return () => {
      global.state_event.off('componentIdsUpdated', onIdsChange)
      sub.remove(); screenUnkeepAwake(); backHandler.remove()
      dpadDownSub.remove()
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  return (
    <PageContent>
      <StatusBar />
      <View style={[s.root, { backgroundColor: theme['c-app-background'], paddingTop: statusBarHeight }]}>
        <SingerBackground enabled={isBackgroundLayout} />

        {/* 顶部「按上键唤起播放器样式」提示已移除 */}

        <Animated.View style={[s.mainRow, { paddingBottom: paddingAnim }]}>
          {isBackgroundLayout
            ? (
              /* ── 样式二：歌手图片背景，无封面，歌曲信息+歌词整体居中 ── */
              <View style={s.centerColumn}>
                <View style={s.songInfoWrapCenter}>
                  <Text size={26} color="#ffffff" numberOfLines={2} style={s.songName}>{musicInfo.name || '暂无播放'}</Text>
                  <Text size={16} color="rgba(255,255,255,0.75)" numberOfLines={1} style={s.singerName}>
                    {musicInfo.singer}
                  </Text>
                </View>
                <LyricView isBackgroundLayout songName={musicInfo.name} singer={musicInfo.singer} />
              </View>
              )
            : (
              <>
                {/* ── 样式一：左侧封面图 ── */}
                <View style={s.half}>
                  <View style={s.picWrap}>
                    <Image
                      url={musicInfo.pic}
                      nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic}
                      style={s.pic}
                    />
                  </View>
                </View>

                {/* ── 样式一：右侧歌曲名 + 歌手名 + 歌词 ── */}
                <View style={s.half}>
                  <View style={s.songInfoWrap}>
                    <Text size={22} numberOfLines={2} style={s.songName}>{musicInfo.name || '暂无播放'}</Text>
                    <Text size={14} color={theme['c-font-label']} numberOfLines={1} style={s.singerName}>
                      {musicInfo.singer}
                    </Text>
                  </View>
                  <LyricView isBackgroundLayout={false} songName={musicInfo.name} singer={musicInfo.singer} />
                </View>
              </>
              )}
        </Animated.View>
      </View>

      {/* 底部控制栏：position:absolute 悬浮，不占布局空间，出现时遮挡歌词底部 */}
      <BottomBar ref={playBtnRef} slideAnim={slideAnim} isPlay={isPlay} onAnyFocus={handleAnyFocus} />
    </PageContent>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// 样式
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },

  // 主体行：左右各 50%，paddingBottom 由动画驱动
  // justifyContent: 'center' 是给"样式二"（单栏居中布局）用的：
  // mainRow 是 flexDirection:'row'，主轴是水平方向，而 centerColumn 上的
  // alignSelf:'center' 只能控制交叉轴（垂直方向），控制不了水平居中。
  // centerColumn 又是 mainRow 里唯一的 flex:1 子元素，即使叠加了 maxWidth:900，
  // 默认的 justifyContent:'flex-start' 也只会让它贴着左边、右侧留白，
  // 导致歌名/歌词整体偏左。"样式一"（左右两栏封面布局）用不到这个属性，
  // 因为两个 s.half 各占一半、加起来正好铺满整行，不受影响。
  mainRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  half: {
    flex: 1,
    overflow: 'hidden',
  },

  // ── 样式二：单栏居中布局（歌手背景样式，无封面） ──
  centerColumn: {
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 900,
    overflow: 'hidden',
    maxWidth: 900,
    width: '100%',
  },
  songInfoWrapCenter: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },

  // ── 左侧封面 ──
  // paddingTop 计算：右侧 songInfoWrap paddingTop(20) + 歌曲名约2行高度(~44) + singerName marginTop(4) ≈ 68
  // 使封面顶部边缘与歌手名文字视觉上平行
  picWrap: {
    paddingTop: 68,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  pic: {
    width: '80%',
    aspectRatio: 1,
    borderRadius: 12,
  },

  // ── 右侧歌曲信息 ──
  songInfoWrap: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  songName: { fontWeight: '600', textAlign: 'center' },
  singerName: { marginTop: 4, textAlign: 'center' },

  // 歌词容器（固定占满剩余空间，控制栏 absolute 覆盖底部，布局不变）
  lrcContainer: { flex: 1, overflow: 'hidden' },
  lrcList: { flex: 1 },
  lrcContent: { paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center' },
  lrcLine: { paddingVertical: 12, alignItems: 'center', width: '100%' },
  lrcText: { textAlign: 'center' },
  lrcActive: { fontWeight: '700' },
  lrcEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── 底部控制栏（position:absolute，无背景色，悬浮透明叠加） ──
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 120,
    paddingBottom: 12,
    paddingTop: 8,
  },

  // 进度条：外层容器
  progressWrap: { width: '100%', marginBottom: 4 },
  // TVButton 仅包裹轨道，焦点框只覆盖进度条本身
  seekBarHitArea: { width: '100%', paddingVertical: 6, paddingHorizontal: 2 },
  progressBarTrack: { height: 4, borderRadius: 2, overflow: 'hidden', position: 'relative' },
  track: { position: 'absolute', height: '100%', top: 0, left: 0, borderRadius: 2 },
  // 时间行独立于 TVButton 之外，焦点框不会包含时间文字
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },

  // 控制按钮
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 4,
  },
  controlsSide: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  btn: { borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
})
