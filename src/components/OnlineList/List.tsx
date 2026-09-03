import { useMemo, useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { FlatList, type FlatListProps, RefreshControl, View } from 'react-native'
import { windowSizeTools } from '@/utils/windowSizeTools'

// import { useMusicList } from '@/store/list/hook'
import ListItem, { ITEM_HEIGHT, type ListItemType } from './ListItem'
import { createStyle, getRowInfo, type RowInfoType } from '@/utils/tools'
import type { Position } from './ListMenu'
import type { SelectMode } from './MultipleModeBar'
import { useTheme } from '@/store/theme/hook'
import settingState from '@/store/setting/state'
import { MULTI_SELECT_BAR_HEIGHT } from './MultipleModeBar'
import { useI18n } from '@/lang'
import Text from '@/components/common/Text'
import { handlePlay } from './listAction'
import { useSettingValue } from '@/store/setting/hook'

type FlatListType = FlatListProps<LX.Music.MusicInfoOnline>

export type {
  RowInfoType,
}

export interface ListProps {
  onShowMenu: (musicInfo: LX.Music.MusicInfoOnline, index: number, position: Position) => void
  onMuiltSelectMode: () => void
  onSelectAll: (isAll: boolean) => void
  onRefresh: () => void
  onLoadMore: () => void
  onPlayList?: (index: number) => void
  progressViewOffset?: number
  ListHeaderComponent?: FlatListType['ListEmptyComponent']
  checkHomePagerIdle: boolean
  rowType?: RowInfoType
  hideMoreButton?: boolean
  /** 见 OnlineListProps.allowOverflow 的说明 */
  allowOverflow?: boolean
}
export interface ListType {
  setList: (list: LX.Music.MusicInfoOnline[], isAppend: boolean, showSource: boolean) => void
  setIsMultiSelectMode: (isMultiSelectMode: boolean) => void
  setSelectMode: (mode: SelectMode) => void
  selectAll: (isAll: boolean) => void
  getSelectedList: () => LX.Music.MusicInfoOnline[]
  getList: () => LX.Music.MusicInfoOnline[]
  setStatus: (val: Status) => void
  /** 焦点移动到列表第一项（若列表为空则忽略） */
  focusFirstItem: () => void
  /** 菜单键：若当前有行聚焦，弹出该行菜单，返回 true；否则返回 false */
  tryOpenMenuForFocused: () => boolean
}
export type Status = 'loading' | 'refreshing' | 'end' | 'error' | 'idle'


const List = forwardRef<ListType, ListProps>(({
  onShowMenu,
  onMuiltSelectMode,
  onSelectAll,
  onRefresh,
  onLoadMore,
  onPlayList,
  progressViewOffset,
  ListHeaderComponent,
  checkHomePagerIdle,
  rowType,
  hideMoreButton,
  allowOverflow,
}, ref) => {
  // const t = useI18n()
  const theme = useTheme()
  const flatListRef = useRef<FlatList>(null)
  const firstItemRef = useRef<ListItemType>(null)
  // 当前已挂载渲染的行 ref，用于菜单键查找当前聚焦的行（FlatList 虚拟滚动下
  // 只有可视区域内的行会被挂载，未挂载的行不可能拥有焦点，无需关心）
  const itemRefsMap = useRef<Map<number, ListItemType>>(new Map())
  const [currentList, setList] = useState<LX.Music.MusicInfoOnline[]>([])
  const [showSource, setShowSource] = useState(false)
  const isMultiSelectModeRef = useRef(false)
  const selectModeRef = useRef<SelectMode>('single')
  const prevSelectIndexRef = useRef(-1)
  const [selectedList, setSelectedList] = useState<LX.Music.MusicInfoOnline[]>([])
  const selectedListRef = useRef<LX.Music.MusicInfoOnline[]>([])
  const [visibleMultiSelect, setVisibleMultiSelect] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [rowInfoState, setRowInfoState] = useState(() => getRowInfo(rowType))

  useEffect(() => {
    // mount 后立即同步一次，防止 windowSizeTools.init() 在 mount 前已完成
    // 但 useState 懒初始化时 size 还是 {0,0}，导致 rowInfoState 停留在错误初始值
    setRowInfoState(getRowInfo(rowType))

    const remove = windowSizeTools.onSizeChanged(() => {
      setRowInfoState(getRowInfo(rowType))
    })
    return remove
  }, [rowType])
  const isShowAlbumName = useSettingValue('list.isShowAlbumName')
  const isShowInterval = useSettingValue('list.isShowInterval')
  // const currentListIdRef = useRef('')
  // console.log('render music list')

  useImperativeHandle(ref, () => ({
    setList(list, isAppend, showSource) {
      setList(list)
      setShowSource(showSource)
      if (!isAppend && selectedListRef.current.length) setSelectedList(selectedListRef.current = [])
    },
    setIsMultiSelectMode(isMultiSelectMode) {
      isMultiSelectModeRef.current = isMultiSelectMode
      if (!isMultiSelectMode) {
        prevSelectIndexRef.current = -1
        handleUpdateSelectedList([])
      }
      setVisibleMultiSelect(isMultiSelectMode)
    },
    setSelectMode(mode) {
      selectModeRef.current = mode
    },
    selectAll(isAll) {
      let list: LX.Music.MusicInfoOnline[]
      if (isAll) {
        list = [...currentList]
      } else {
        list = []
      }
      selectedListRef.current = list
      setSelectedList(list)
    },
    getSelectedList() {
      return selectedListRef.current
    },
    getList() {
      return currentList
    },
    setStatus(val) {
      setStatus(val)
    },
    focusFirstItem() {
      // 用 requestAnimationFrame 确保 setList 触发的 FlatList 重渲染已完成，
      // 此时第一行才真正挂载/更新完毕，ref 才是最新的
      requestAnimationFrame(() => { firstItemRef.current?.focusMain() })
    },
    tryOpenMenuForFocused() {
      for (const itemRef of itemRefsMap.current.values()) {
        if (itemRef.tryOpenMenuForFocused()) return true
      }
      return false
    },
  }))


  const handleUpdateSelectedList = (newList: LX.Music.MusicInfoOnline[]) => {
    if (selectedListRef.current.length && newList.length == currentList.length) onSelectAll(true)
    else if (selectedListRef.current.length == currentList.length) onSelectAll(false)
    selectedListRef.current = newList
    setSelectedList(newList)
  }
  const handleSelect = (item: LX.Music.MusicInfoOnline, pressIndex: number) => {
    let newList: LX.Music.MusicInfoOnline[]
    if (selectModeRef.current == 'single') {
      prevSelectIndexRef.current = pressIndex
      const index = selectedListRef.current.indexOf(item)
      if (index < 0) {
        newList = [...selectedListRef.current, item]
      } else {
        newList = [...selectedListRef.current]
        newList.splice(index, 1)
      }
    } else {
      if (selectedListRef.current.length) {
        const prevIndex = prevSelectIndexRef.current
        const currentIndex = pressIndex
        if (prevIndex == currentIndex) {
          newList = []
        } else if (currentIndex > prevIndex) {
          newList = currentList.slice(prevIndex, currentIndex + 1)
        } else {
          newList = currentList.slice(currentIndex, prevIndex + 1)
          newList.reverse()
        }
      } else {
        newList = [item]
        prevSelectIndexRef.current = pressIndex
      }
    }

    handleUpdateSelectedList(newList)
  }

  const handlePress = (item: LX.Music.MusicInfoOnline, index: number) => {
    requestAnimationFrame(() => {
      if (checkHomePagerIdle && !global.lx.homePagerIdle) return
      if (isMultiSelectModeRef.current) {
        handleSelect(item, index)
      } else {
        if (settingState.setting['list.isClickPlayList'] && onPlayList != null) {
          onPlayList(index)
        } else {
          // console.log(currentList[index])
          handlePlay(currentList[index])
        }
      }
    })
  }

  const handleLongPress = (item: LX.Music.MusicInfoOnline, index: number) => {
    if (isMultiSelectModeRef.current) return
    prevSelectIndexRef.current = index
    handleUpdateSelectedList([item])
    onMuiltSelectMode()
  }

  const handleLoadMore = () => {
    if (status != 'idle') return
    onLoadMore()
  }


  const renderItem: FlatListType['renderItem'] = ({ item, index }) => (
    <ListItem
      ref={el => {
        if (index === 0) firstItemRef.current = el
        if (el) itemRefsMap.current.set(index, el)
        else itemRefsMap.current.delete(index)
      }}
      item={item}
      index={index}
      showSource={showSource}
      onPress={handlePress}
      onLongPress={handleLongPress}
      onShowMenu={onShowMenu}
      selectedList={selectedList}
      rowInfo={rowInfoState}
      isShowAlbumName={isShowAlbumName}
      isShowInterval={isShowInterval}
      hideMoreButton={hideMoreButton}
    />
  )
  const getkey: FlatListType['keyExtractor'] = item => item.id
  const getItemLayout: FlatListType['getItemLayout'] = (data, index) => {
    // 多列（numColumns > 1）时，FlatList 会把线性 index 按列数分组成行，
    // 同一行内所有项的 offset 必须相同，否则虚拟滚动的位置计算会错位
    // （原实现假设了单列，offset = ITEM_HEIGHT * index，两列下第 0/1 项
    // 会被错误地算出两个不同的 offset，而它们其实同属第一行）。
    const cols = rowInfoState.rowNum ?? 1
    const row = Math.floor(index / cols)
    return { length: ITEM_HEIGHT, offset: ITEM_HEIGHT * row, index }
  }
  const refreshControl = useMemo(() => (
    <RefreshControl
      colors={[theme['c-primary']]}
      // progressBackgroundColor={theme.primary}
      refreshing={status == 'refreshing'}
      onRefresh={onRefresh} />
  ), [status, onRefresh, theme])
  const footerComponent = useMemo(() => {
    let label: FooterLabel
    switch (status) {
      case 'refreshing': return null
      case 'loading':
        label = 'list_loading'
        break
      case 'end':
        label = 'list_end'
        break
      case 'error':
        label = 'list_error'
        break
      case 'idle':
        label = null
        break
    }
    return (
      <View style={{ width: '100%', paddingBottom: visibleMultiSelect ? MULTI_SELECT_BAR_HEIGHT : 0 }} >
        <Footer label={label} onLoadMore={onLoadMore} />
      </View>
    )
  }, [onLoadMore, status, visibleMultiSelect])

  return (
    <FlatList
      ref={flatListRef}
      style={[styles.list, allowOverflow && styles.listOverflowVisible]}
      data={currentList}
      key={String(rowInfoState.rowNum)}
      numColumns={rowInfoState.rowNum}
      horizontal={false}
      maxToRenderPerBatch={4}
      // updateCellsBatchingPeriod={80}
      windowSize={8}
      removeClippedSubviews={false}
      initialNumToRender={12}
      renderItem={renderItem}
      keyExtractor={getkey}
      getItemLayout={getItemLayout}
      // onRefresh={onRefresh}
      // refreshing={refreshing}
      onEndReachedThreshold={0.5}
      onEndReached={handleLoadMore}
      progressViewOffset={progressViewOffset}
      ListHeaderComponent={ListHeaderComponent}
      refreshControl={refreshControl}
      ListFooterComponent={footerComponent}
    />
  )
})

type FooterLabel = 'list_loading' | 'list_end' | 'list_error' | null
const Footer = ({ label, onLoadMore }: {
  label: FooterLabel
  onLoadMore: () => void
}) => {
  const theme = useTheme()
  const t = useI18n()
  const handlePress = () => {
    if (label != 'list_error') return
    onLoadMore()
  }
  return (
    label
      ? (
          <View>
            <Text onPress={handlePress} style={styles.footer} color={theme['c-font-label']}>{t(label)}</Text>
          </View>
        )
      : null
  )
}

const styles = createStyle({
  container: {
    flex: 1,
  },
  list: {
    flexGrow: 1,
    flexShrink: 1,
  },
  listOverflowVisible: {
    overflow: 'visible',
  },
  footer: {
    textAlign: 'center',
    padding: 10,
  },
})

export default List
