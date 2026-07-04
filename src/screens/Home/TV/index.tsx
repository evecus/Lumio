/**
 * TV 主页 — 单行顶部栏版
 * 顶部栏：[搜索]  [中间标题]  [播放封面] [设置]
 * 首页中间标题为空；各子面板显示对应名称；搜索页全屏不显示顶部栏
 */
import { useEffect, useState, memo, useCallback, useRef, forwardRef, useImperativeHandle, type LayoutChangeEvent } from 'react'
import { View, StyleSheet, ScrollView, DeviceEventEmitter } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { useStatusbarHeight } from '@/store/common/hook'
import { useIsPlay, usePlayerMusicInfo } from '@/store/player/hook'
import { Icon } from '@/components/common/Icon'
import Image from '@/components/common/Image'
import TVButton, { type TVButtonType } from '@/components/common/TVButton'
import TVExitDialog, { type TVExitDialogType } from '@/components/common/TVExitDialog'
import TVConfirmDialog, { type TVConfirmDialogType } from '@/components/common/TVConfirmDialog'
import { exitApp, setNavActiveId } from '@/core/common'
import { toast } from '@/utils/tools'
import { useBackHandler } from '@/utils/hooks/useBackHandler'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'
import type { InitState } from '@/store/common/state'
import Text from '@/components/common/Text'
import songlistState, { type Source } from '@/store/songlist/state'
import boardState from '@/store/leaderboard/state'
import { useSourceLabel } from '@/utils/hooks/useSourceLabel'
import { useSettingValue } from '@/store/setting/hook'
import { useI18n } from '@/lang'

import TVSearchPanel, { type TVSearchPanelType } from './panels/TVSearchPanel'
import TVSongListPanel, { type TVSongListPanelType } from './panels/TVSongListPanel'
import TVLeaderboardGridPanel, { type TVLeaderboardGridPanelType } from './panels/TVLeaderboardGridPanel'
import TVMyListGridPanel, { type TVMyListGridPanelType } from './panels/TVMyListGridPanel'
import TVSettingPanel, { type TVSettingPanelType } from './panels/TVSettingPanel'

type NavId = InitState['navActiveId']

type FocusZone = 'topbar' | 'content'
let gFocusZone: FocusZone = 'topbar'
export const setFocusZone = (zone: FocusZone) => { gFocusZone = zone }

// ─── 单行顶部栏 ───────────────────────────────────────────────────────────────
// 此组件也被 TVMusicDetail 通过全局事件总线驱动，
// 但在 Home 内部直接作为子组件使用。
interface TopBarProps {
  title?: string
  onSearchPress: () => void
  onPlayPress: () => void
  onSettingPress: () => void
  onFilterPress?: () => void
  onOpenListPress?: () => void
}

export interface TopBarType {
  focusSearchBtn: () => void
}

export const TopBar = memo(forwardRef<TopBarType, TopBarProps>(({ title, onSearchPress, onPlayPress, onSettingPress, onFilterPress, onOpenListPress }, ref) => {
  const theme = useTheme()
  const statusBarHeight = useStatusbarHeight()
  const isPlay = useIsPlay()
  const musicInfo = usePlayerMusicInfo()
  const searchBtnRef = useRef<TVButtonType>(null)

  useImperativeHandle(ref, () => ({
    focusSearchBtn() {
      searchBtnRef.current?.requestFocus()
    },
  }))

  return (
    <View style={[
      tb.root,
      {
        paddingTop: statusBarHeight + 6,
        backgroundColor: theme['c-content-background'],
        borderBottomColor: theme['c-border-background'],
      },
    ]}>
      {/* 左：搜索 */}
      <TVButton ref={searchBtnRef} style={tb.iconBtn} onPress={onSearchPress} borderRadius={8} onFocus={() => setFocusZone('topbar')}>
        <Icon name="search-2" size={22} color={theme['c-font']} />
      </TVButton>

      {/* 中：标题 + 可选筛选按钮 */}
      <View style={tb.titleWrap}>
        {title ? (
          <Text size={20} color={theme['c-font']} style={tb.title} numberOfLines={1}>{title}</Text>
        ) : null}
        {onFilterPress ? (
          <TVButton style={tb.filterBtn} onPress={onFilterPress} borderRadius={6} onFocus={() => setFocusZone('topbar')}>
            <Text size={15} color={theme['c-font']}>筛选</Text>
          </TVButton>
        ) : null}
        {onOpenListPress ? (
          <TVButton style={tb.filterBtn} onPress={onOpenListPress} borderRadius={6} onFocus={() => setFocusZone('topbar')}>
            <Text size={15} color={theme['c-font']}>打开</Text>
          </TVButton>
        ) : null}
      </View>

      {/* 右：播放入口 + 设置 */}
      <View style={tb.right}>
        <TVButton style={tb.playBtn} onPress={onPlayPress} borderRadius={22} onFocus={() => setFocusZone('topbar')}>
          <View style={[tb.playPic, { backgroundColor: theme['c-border-background'] }]}>
            {musicInfo.pic
              ? <Image url={musicInfo.pic} style={tb.playPicImg} />
              : <Icon name={isPlay ? 'pause' : 'play'} size={20} color={theme['c-primary']} />
            }
          </View>
        </TVButton>
        <TVButton style={tb.iconBtn} onPress={onSettingPress} borderRadius={8} onFocus={() => setFocusZone('topbar')}>
          <Icon name="setting" size={22} color={theme['c-font']} />
        </TVButton>
      </View>
    </View>
  )
}))

const tb = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, gap: 10 },
  title: { fontWeight: '600' },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { padding: 8, borderRadius: 8 },
  playBtn: { padding: 4, borderRadius: 22 },
  playPic: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  playPicImg: { width: 40, height: 40, borderRadius: 20 },
})

// ─── 首页列表布局 ─────────────────────────────────────────────────────────────

// 焦点框与卡片内容的间距（与歌单页保持一致）
const FOCUS_PADDING = 4

// 小卡片通用组件
const SmallCard = memo(({ label, color, cardStyle, onPress }: {
  label: string
  color: string
  cardStyle?: { width: number; height: number }
  onPress: () => void
}) => (
  <TVButton
    style={[{ borderRadius: 10, padding: FOCUS_PADDING }, cardStyle]}
    borderRadius={10}
    onPress={onPress}
    onFocus={() => setFocusZone('content')}
  >
    <View style={{ flex: 1, width: '100%', borderRadius: 8, backgroundColor: color, justifyContent: 'center', alignItems: 'center', elevation: 2 }}>
      <Text size={15} color="#fff" style={hc.cardLabel} numberOfLines={2}>{label}</Text>
    </View>
  </TVButton>
))

const HomeContent = memo(({ onSelect, onSelectSonglistSource, onSelectLeaderboardSource }: {
  onSelect: (id: NavId) => void
  onSelectSonglistSource: (src: Source) => void
  onSelectLeaderboardSource: (src: LX.OnlineSource) => void
}) => {
  const theme = useTheme()
  const t = useI18n()
  const getLabel = useSourceLabel()
  const sourceNameType = useSettingValue('common.sourceNameType')
  const songlistSources = songlistState.sources
  const leaderboardSources = boardState.sources

  const subColor = theme['c-font-label'] ?? '#888'

  // 动态计算卡片尺寸：
  // 布局：3行（歌单/排行各5列，我的列表1列，补充4个空位保持对齐）
  // 整体区域 flex:1，使用 onLayout 获取容器宽高后计算卡片大小
  const [layout, setLayout] = useState({ width: 0, height: 0 })
  const onLayout = useCallback((e: any) => {
    const { width, height } = e.nativeEvent.layout
    setLayout({ width, height })
  }, [])

  // 卡片宽高比固定为 5:3（与图中保持一致）
  const CARD_RATIO = 5 / 3
  const PAD_H = 24        // 左右 padding
  const PAD_V = 16        // 上下 padding
  const GAP_H = 14        // 列间距
  const GAP_V = 10        // 行间距
  const SECTION_TITLE_H = 24  // section title 高度（含 margin）
  const NUM_COLS = 5
  const NUM_ROWS = 3      // 歌单、排行榜、我的列表

  // 计算卡片宽度：(totalWidth - 2*padH - (cols-1)*gapH) / cols
  const cardW = layout.width > 0
    ? (layout.width - 2 * PAD_H - (NUM_COLS - 1) * GAP_H) / NUM_COLS
    : 150
  const cardH = cardW / CARD_RATIO

  // 验证高度是否能放下，如果放不下则从高度反推
  const totalNeededH = PAD_V * 2 + NUM_ROWS * (SECTION_TITLE_H + cardH) + (NUM_ROWS - 1) * GAP_V
  const cardWFinal = layout.height > 0 && totalNeededH > layout.height
    ? (() => {
        // 从高度反推 cardH，再求 cardW
        const availH = layout.height - PAD_V * 2 - NUM_ROWS * SECTION_TITLE_H - (NUM_ROWS - 1) * GAP_V
        const ch = availH / NUM_ROWS
        return ch * CARD_RATIO
      })()
    : cardW
  const cardHFinal = cardWFinal / CARD_RATIO

  const cardStyle = { width: cardWFinal, height: cardHFinal }

  return (
    <View style={hc.container} onLayout={onLayout}>
      {layout.width > 0 && (
        <View style={[hc.inner, { paddingHorizontal: PAD_H, paddingVertical: PAD_V }]}>
          {/* 歌单 */}
          <Text size={13} color={subColor} style={hc.sectionTitle}>歌单</Text>
          <View style={[hc.row, { gap: GAP_H, marginBottom: GAP_V }]}>
            {songlistSources.map(src => (
              <SmallCard
                key={src}
                label={getLabel(src)}
                color="#00bfa5"
                cardStyle={cardStyle}
                onPress={() => { onSelectSonglistSource(src); onSelect('nav_songlist') }}
              />
            ))}
          </View>

          {/* 排行榜 */}
          <Text size={13} color={subColor} style={hc.sectionTitle}>排行榜</Text>
          <View style={[hc.row, { gap: GAP_H, marginBottom: GAP_V }]}>
            {leaderboardSources.map(src => (
              <SmallCard
                key={src}
                label={t(`source_${sourceNameType}_${src}`)}
                color="#43a047"
                cardStyle={cardStyle}
                onPress={() => { onSelectLeaderboardSource(src); onSelect('nav_top') }}
              />
            ))}
          </View>

          {/* 我的列表 */}
          <Text size={13} color={subColor} style={hc.sectionTitle}>我的列表</Text>
          <View style={[hc.row, { gap: GAP_H }]}>
            <SmallCard label="我的列表" color="#1e88e5" cardStyle={cardStyle} onPress={() => onSelect('nav_love')} />
          </View>
        </View>
      )}
    </View>
  )
})

const hc = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1 },
  sectionTitle: { marginBottom: 8, fontWeight: '600', letterSpacing: 0.5, height: 20, lineHeight: 20 },
  row: { flexDirection: 'row', flexWrap: 'nowrap' },
  cardLabel: { fontWeight: '600', textAlign: 'center', paddingHorizontal: 8 },
})

// ─── 内容面板容器 ─────────────────────────────────────────────────────────────
const ContentArea = memo(({
  activeId, searchRef, songlistRef, leaderboardRef, mylistRef, settingRef,
  initialSonglistSource, initialLeaderboardSource,
}: {
  activeId: NavId | null
  searchRef: React.RefObject<TVSearchPanelType>
  songlistRef: React.RefObject<TVSongListPanelType>
  leaderboardRef: React.RefObject<TVLeaderboardGridPanelType>
  mylistRef: React.RefObject<TVMyListGridPanelType>
  settingRef: React.RefObject<TVSettingPanelType>
  initialSonglistSource?: Source
  initialLeaderboardSource?: LX.OnlineSource
}) => (
  <View style={ca.root}>
    <View style={[ca.panel, activeId !== 'nav_search'   && ca.hidden]}><TVSearchPanel ref={searchRef} /></View>
    <View style={[ca.panel, activeId !== 'nav_songlist' && ca.hidden]}><TVSongListPanel ref={songlistRef} initialSource={initialSonglistSource} /></View>
    <View style={[ca.panel, activeId !== 'nav_top'      && ca.hidden]}><TVLeaderboardGridPanel ref={leaderboardRef} initialSource={initialLeaderboardSource} /></View>
    <View style={[ca.panel, activeId !== 'nav_love'     && ca.hidden]}><TVMyListGridPanel ref={mylistRef} /></View>
    <View style={[ca.panel, activeId !== 'nav_setting'  && ca.hidden]}><TVSettingPanel ref={settingRef} /></View>
  </View>
))

const ca = StyleSheet.create({
  root:   { flex: 1, position: 'relative' },
  panel:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  hidden: { display: 'none' },
})

// 各面板对应的标题
const PANEL_TITLES: Partial<Record<NavId, string>> = {
  nav_songlist: '歌单',
  nav_top:      '排行榜',
  nav_love:     '我的列表',
  nav_setting:  '设置',
  // nav_search 不显示顶部栏，无需标题
}

// ─── 主布局 ───────────────────────────────────────────────────────────────────
export default memo(() => {
  const theme = useTheme()
  const exitDialogRef    = useRef<TVExitDialogType>(null)
  const confirmDialogRef = useRef<TVConfirmDialogType>(null)
  const lastBackPressRef = useRef<number>(0)
  const [activeView, setActiveView] = useState<NavId | 'home'>('home')

  useEffect(() => {
    global.lx.showConfirmDialog = (options) => { confirmDialogRef.current?.show(options) }
    return () => { global.lx.showConfirmDialog = undefined }
  }, [])

  const searchRef      = useRef<TVSearchPanelType>(null)
  const songlistRef    = useRef<TVSongListPanelType>(null)
  const leaderboardRef = useRef<TVLeaderboardGridPanelType>(null)
  const mylistRef      = useRef<TVMyListGridPanelType>(null)
  const settingRef     = useRef<TVSettingPanelType>(null)
  const topBarRef      = useRef<TopBarType>(null)

  const [selectedSonglistSource, setSelectedSonglistSource] = useState<Source | undefined>(undefined)
  const [selectedLeaderboardSource, setSelectedLeaderboardSource] = useState<LX.OnlineSource | undefined>(undefined)

  const goHome = useCallback(() => { setActiveView('home'); setFocusZone('content') }, [])

  const goPanel = useCallback((id: NavId) => {
    setNavActiveId(id)
    setActiveView(id)
    setFocusZone('topbar')
  }, [])

  const goSearch  = useCallback(() => goPanel('nav_search'),  [goPanel])
  const goSetting = useCallback(() => goPanel('nav_setting'), [goPanel])
  const goPlay    = useCallback(() => {
    if (commonState.componentIds.home) navigations.pushPlayDetailScreen(commonState.componentIds.home)
  }, [])

  const handleSelectSonglistSource = useCallback((src: Source) => {
    setSelectedSonglistSource(src)
  }, [])

  const handleSelectLeaderboardSource = useCallback((src: LX.OnlineSource) => {
    setSelectedLeaderboardSource(src)
  }, [])

  const handleOpenFilter = useCallback(() => {
    songlistRef.current?.openFilter()
  }, [])

  const handleOpenList = useCallback(() => {
    songlistRef.current?.openList()
  }, [])

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('tvMenuKey', () => {
      if (activeView === 'nav_love') {
        mylistRef.current?.tryOpenMenuForFocusedCard()
      }
    })
    return () => { sub.remove() }
  }, [activeView])

  useEffect(() => {
    const handler = () => { setFocusZone('content') }
    global.state_event.on('tvPlayDetailWillPop', handler)
    return () => { global.state_event.off('tvPlayDetailWillPop', handler) }
  }, [])

  useEffect(() => {
    const handler = () => {
      const panel = (() => {
        switch (activeView) {
          case 'nav_songlist': return songlistRef.current
          case 'nav_top':     return leaderboardRef.current
          case 'nav_love':    return mylistRef.current
          default: return null
        }
      })()
      if (panel && 'restoreFocus' in panel) {
        setFocusZone('content');
        (panel as any).restoreFocus()
      }
    }
    global.state_event.on('tvMusicDetailWillPop', handler)
    return () => { global.state_event.off('tvMusicDetailWillPop', handler) }
  }, [activeView])

  // 从 TVMusicDetail 顶部栏跳搜索/设置
  useEffect(() => {
    const onSearch  = () => goPanel('nav_search')
    const onSetting = () => goPanel('nav_setting')
    global.app_event.on('tvDetailGotoSearch',  onSearch)
    global.app_event.on('tvDetailGotoSetting', onSetting)
    return () => {
      global.app_event.off('tvDetailGotoSearch',  onSearch)
      global.app_event.off('tvDetailGotoSetting', onSetting)
    }
  }, [goPanel])

  const handleBack = useCallback(() => {
    // 各面板弹窗优先关闭
    if (activeView === 'nav_love') {
      const panel = mylistRef.current
      if (panel?.isDialogVisible()) { panel.closeDialog(); return true }
    }
    if (activeView === 'nav_songlist') {
      const panel = songlistRef.current
      if (panel?.isFilterVisible()) { panel.closeFilter(); return true }
    }
    // 搜索直接回首页
    if (activeView === 'nav_search') { goHome(); return true }

    // 子面板：内容区焦点 → 顶部栏搜索按钮（一次返回键直达）
    if (activeView !== 'home' && gFocusZone === 'content') {
      topBarRef.current?.focusSearchBtn()
      setFocusZone('topbar')
      return true
    }
    // 子面板：顶部栏焦点 → 回首页
    if (activeView !== 'home' && gFocusZone === 'topbar') { goHome(); return true }

    // 首页双击退出
    const now = Date.now()
    if (now - lastBackPressRef.current < 2000) {
      exitApp('Back Btn Double Press')
    } else {
      lastBackPressRef.current = now
      toast(global.i18n.t('press_back_again_to_exit'))
    }
    return true
  }, [activeView, goHome])

  const getLabel = useSourceLabel()

  useBackHandler(handleBack)

  const isHome   = activeView === 'home'
  const isSearch = activeView === 'nav_search'
  const showTopBar = !isSearch

  const panelTitle = (() => {
    if (isHome) return undefined
    const base = PANEL_TITLES[activeView as NavId]
    if (!base) return undefined
    if (activeView === 'nav_songlist' && selectedSonglistSource) {
      return `${getLabel(selectedSonglistSource)}·${base}`
    }
    if (activeView === 'nav_top' && selectedLeaderboardSource) {
      return `${getLabel(selectedLeaderboardSource)}·${base}`
    }
    return base
  })()

  return (
    <View style={[s.root, { backgroundColor: theme['c-app-background'] }]}>
      {showTopBar && (
        <TopBar
          ref={topBarRef}
          title={panelTitle}
          onSearchPress={goSearch}
          onPlayPress={goPlay}
          onSettingPress={goSetting}
          onFilterPress={activeView === 'nav_songlist' ? handleOpenFilter : undefined}
          onOpenListPress={activeView === 'nav_songlist' ? handleOpenList : undefined}
        />
      )}
      {isHome
        ? <HomeContent
            onSelect={goPanel}
            onSelectSonglistSource={handleSelectSonglistSource}
            onSelectLeaderboardSource={handleSelectLeaderboardSource}
          />
        : <ContentArea
            activeId={activeView as NavId}
            initialSonglistSource={selectedSonglistSource}
            initialLeaderboardSource={selectedLeaderboardSource}
            searchRef={searchRef}
            songlistRef={songlistRef}
            leaderboardRef={leaderboardRef}
            mylistRef={mylistRef}
            settingRef={settingRef}
          />
      }
      <TVExitDialog ref={exitDialogRef} />
      <TVConfirmDialog ref={confirmDialogRef} />
    </View>
  )
})

const s = StyleSheet.create({ root: { flex: 1, flexDirection: 'column' } })
