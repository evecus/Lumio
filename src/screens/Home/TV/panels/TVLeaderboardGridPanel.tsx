/**
 * TV 排行榜面板（Grid 方块版）
 * 顶部：平台 Tab（一行）
 * 内容：榜单方块 Grid（一行5个）
 */
import { memo, useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { View, StyleSheet, FlatList } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import TVButton, { type TVButtonType } from '@/components/common/TVButton'
import Text from '@/components/common/Text'
import { getBoardsList } from '@/core/leaderboard'
import boardState, { type BoardItem } from '@/store/leaderboard/state'
import { useSettingValue } from '@/store/setting/hook'
import { useI18n } from '@/lang'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'
import { getLeaderboardSetting, saveLeaderboardSetting } from '@/utils/data'
import { setFocusZone } from '../index'

const NUM_COLUMNS = 5

export interface TVLeaderboardGridPanelType {
  focusTopBar: () => void
  restoreFocus: () => void
  setSource: (src: LX.OnlineSource) => void
}

export default memo(forwardRef<TVLeaderboardGridPanelType, { initialSource?: LX.OnlineSource }>((props, ref) => {
  const { initialSource } = props
  const theme = useTheme()
  const t = useI18n()
  const sourceNameType = useSettingValue('common.sourceNameType')

  const [sources] = useState(() => boardState.sources)
  const [activeSource, setActiveSource] = useState<LX.OnlineSource>(initialSource ?? sources[0] ?? 'kw')
  const [boardList, setBoardList] = useState<BoardItem[]>([])
  const firstTabRef = useRef<TVButtonType>(null)
  const lastFocusedCardRef = useRef<TVButtonType | null>(null)

  useImperativeHandle(ref, () => ({
    focusTopBar() {
      firstTabRef.current?.requestFocus()
    },
    restoreFocus() {
      if (lastFocusedCardRef.current) {
        lastFocusedCardRef.current.requestFocus()
      } else {
        firstTabRef.current?.requestFocus()
      }
    },
    setSource(src: LX.OnlineSource) {
      handleSelectSource(src)
    },
  }))

  const loadBoards = useCallback((source: LX.OnlineSource) => {
    void getBoardsList(source).then(list => { setBoardList(list) })
  }, [])

  useEffect(() => {
    if (initialSource) {
      setActiveSource(initialSource)
      loadBoards(initialSource)
    } else {
      void getLeaderboardSetting().then(({ source }) => {
        const src = sources.includes(source) ? source : (sources[0] ?? 'kw')
        setActiveSource(src)
        loadBoards(src)
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSource])

  const handleSelectSource = (source: LX.OnlineSource) => {
    setActiveSource(source)
    void saveLeaderboardSetting({ source, boardId: '' })
    loadBoards(source)
  }

  const handleOpenBoard = (board: BoardItem, btnRef: TVButtonType) => {
    if (!commonState.componentIds.home) return
    lastFocusedCardRef.current = btnRef
    navigations.pushTVMusicDetailScreen(commonState.componentIds.home, {
      type: 'leaderboard',
      id: board.id,
      name: board.name,
      source: activeSource,
    })
  }

  const paddedList = [...boardList]
  const remainder = paddedList.length % NUM_COLUMNS
  if (remainder > 0) {
    for (let i = 0; i < NUM_COLUMNS - remainder; i++) {
      paddedList.push({ id: `__pad_${i}`, name: '', bangid: '' })
    }
  }

  return (
    <View style={s.root}>
      {/* 方块 Grid */}
      <FlatList
        key={NUM_COLUMNS}
        data={paddedList}
        numColumns={NUM_COLUMNS}
        keyExtractor={item => item.id}
        contentContainerStyle={s.gridContent}
        renderItem={({ item }) => {
          if (!item.name) return <View style={s.cardWrap} />
          return <BoardCard item={item} theme={theme} onOpen={handleOpenBoard} />
        }}
      />
    </View>
  )
}))

const CARD_PADDING = 4  // 卡片与焦点框的间距，让焦点框完整显示

const BoardCard = memo(({ item, theme, onOpen }: {
  item: BoardItem
  theme: any
  onOpen: (board: BoardItem, btn: TVButtonType) => void
}) => {
  const btnRef = useRef<TVButtonType>(null)
  return (
    <View style={s.cardWrap}>
      {/* TVButton 自身透明，padding 留出焦点框空间，内部 card 视图承载背景色 */}
      <TVButton
        ref={btnRef}
        style={[s.cardOuter, { padding: CARD_PADDING }]}
        borderRadius={10}
        onPress={() => { if (btnRef.current) onOpen(item, btnRef.current) }}
        onFocus={() => setFocusZone('content')}
      >
        <View style={[s.card, { backgroundColor: '#f5f3ff' }]}>
          <Text style={[s.boardLabel, { color: theme['c-primary'] }]} numberOfLines={2}>{item.name}</Text>
        </View>
      </TVButton>
    </View>
  )
})

const s = StyleSheet.create({
  root: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  gridContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  cardWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 8, paddingBottom: 20 },
  cardOuter: { width: '100%', alignItems: 'center' },
  card: { width: '100%', aspectRatio: 1.2, borderRadius: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', paddingHorizontal: 8 },
  boardLabel: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
})
