/**
 * TV 分页两列歌曲列表
 *
 * 布局：左列 1-5，右列 6-10，共 10 首/页（每列 5 行）
 *
 * 行内左右键逻辑：
 *   主按钮 → 右键 → 同行 ···
 *   ···   → 左键 → 同行主按钮
 *   左列主按钮 → 左键 → 上一页右列同行···
 *   右列··· → 右键 → 下一页左列同行主按钮
 */
import { forwardRef, useImperativeHandle, useRef, useState, useCallback } from 'react'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import TVPagination from './TVPagination'
import TVListItem, { MyListItem, ITEM_HEIGHT, type TVListItemHandle } from './TVListItem'
import { useI18n } from '@/lang'

const PAGE_SIZE = 10  // 每页10首，左右各5行
const COL_SIZE  = PAGE_SIZE / 2  // 每列5行

// ─── ref 存储结构 ─────────────────────────────────────────────────────────────
interface RowRefs {
  leftItem?:  TVListItemHandle
  rightItem?: TVListItemHandle
}

// ─── 在线列表（排行榜 / 歌单）────────────────────────────────────────────────
export interface OnlineMusicListType {
  setList: (list: LX.Music.MusicInfoOnline[]) => void
  appendList: (list: LX.Music.MusicInfoOnline[]) => void
  setStatus: (s: ListStatus) => void
}
export type ListStatus = 'idle' | 'loading' | 'error' | 'end'

export interface OnlineMusicListProps {
  onPress: (item: LX.Music.MusicInfoOnline, index: number) => void
  onShowMenu: (item: LX.Music.MusicInfoOnline, index: number, position: { x: number; y: number; w: number; h: number }) => void
  onLoadMore: () => void
}

export const OnlineMusicList = forwardRef<OnlineMusicListType, OnlineMusicListProps>((
  { onPress, onShowMenu, onLoadMore }, ref,
) => {
  const theme = useTheme()
  const t = useI18n()
  const [allList, setAllList] = useState<LX.Music.MusicInfoOnline[]>([])
  const [status, setStatus] = useState<ListStatus>('idle')
  const [page, setPage] = useState(1)
  const itemRefs = useRef<Record<number, RowRefs>>({})
  const allListRef = useRef<LX.Music.MusicInfoOnline[]>([])
  const pageRef = useRef(1)
  const maxPageRef = useRef(1)

  useImperativeHandle(ref, () => ({
    setList(list) { allListRef.current = list; setAllList(list); setPage(1); pageRef.current = 1 },
    appendList(list) { const next = [...allListRef.current, ...list]; allListRef.current = next; setAllList(next) },
    setStatus(s) { setStatus(s) },
  }))

  const maxPage = Math.max(1, Math.ceil(allList.length / PAGE_SIZE))
  maxPageRef.current = maxPage

  const goPage = useCallback((nextPage: number) => {
    if (nextPage >= maxPageRef.current && status === 'idle') onLoadMore()
    pageRef.current = nextPage
    setPage(nextPage)
  }, [status, onLoadMore])

  const handlePrev = useCallback(() => { if (pageRef.current > 1) goPage(pageRef.current - 1) }, [goPage])
  const handleNext = useCallback(() => { if (pageRef.current < maxPageRef.current) goPage(pageRef.current + 1) }, [goPage])

  // 左列主按钮按左键 → 上一页，焦点落右列同行···
  const onLeftMainLeft = useCallback((rowIndex: number) => {
    if (pageRef.current <= 1) return
    goPage(pageRef.current - 1)
    requestAnimationFrame(() => { itemRefs.current[rowIndex]?.rightItem?.focusMore() })
  }, [goPage])

  // 右列···按右键 → 下一页，焦点落左列同行主按钮
  const onRightMoreRight = useCallback((rowIndex: number) => {
    if (pageRef.current >= maxPageRef.current) return
    goPage(pageRef.current + 1)
    requestAnimationFrame(() => { itemRefs.current[rowIndex]?.leftItem?.focusMain() })
  }, [goPage])

  // 右列主按钮按左键 → 焦点落左列同行···
  const onRightMainLeft = useCallback((rowIndex: number) => {
    itemRefs.current[rowIndex]?.leftItem?.focusMore()
  }, [])

  // 左列···按右键 → 焦点落右列同行主按钮
  const onLeftMoreRight = useCallback((rowIndex: number) => {
    itemRefs.current[rowIndex]?.rightItem?.focusMain()
  }, [])

  const pageStart = (page - 1) * PAGE_SIZE
  const pageSlice = allList.slice(pageStart, pageStart + PAGE_SIZE)
  const leftCol  = pageSlice.slice(0, COL_SIZE)
  const rightCol = pageSlice.slice(COL_SIZE, PAGE_SIZE)

  if (status === 'loading' && allList.length === 0) {
    return <View style={styles.center}><ActivityIndicator size="large" color={theme['c-primary']} /></View>
  }
  if (status === 'error' && allList.length === 0) {
    return <View style={styles.center}><Text color={theme['c-font-label']}>{t('list_error')}</Text></View>
  }

  return (
    <View style={styles.root}>
      <View style={styles.grid}>
        {/* 左列 */}
        <View style={styles.col}>
          {Array.from({ length: COL_SIZE }).map((_, rowIndex) => {
            const item = leftCol[rowIndex]
            const globalIndex = pageStart + rowIndex
            if (!item) return <View key={rowIndex} style={{ height: ITEM_HEIGHT }} />
            return (
              <TVListItem
                key={item.id}
                ref={el => {
                  if (!itemRefs.current[rowIndex]) itemRefs.current[rowIndex] = {}
                  itemRefs.current[rowIndex].leftItem = el ?? undefined
                }}
                item={item}
                index={globalIndex}
                onPress={onPress}
                onShowMenu={onShowMenu}
                callbacks={{
                  onMainLeft:  () => onLeftMainLeft(rowIndex),
                  onMoreRight: () => onLeftMoreRight(rowIndex),
                }}
              />
            )
          })}
        </View>

        <View style={[styles.divider, { backgroundColor: theme['c-border-background'] }]} />

        {/* 右列 */}
        <View style={styles.col}>
          {Array.from({ length: COL_SIZE }).map((_, rowIndex) => {
            const item = rightCol[rowIndex]
            const globalIndex = pageStart + COL_SIZE + rowIndex
            if (!item) return <View key={rowIndex} style={{ height: ITEM_HEIGHT }} />
            return (
              <TVListItem
                key={item.id}
                ref={el => {
                  if (!itemRefs.current[rowIndex]) itemRefs.current[rowIndex] = {}
                  itemRefs.current[rowIndex].rightItem = el ?? undefined
                }}
                item={item}
                index={globalIndex}
                onPress={onPress}
                onShowMenu={onShowMenu}
                callbacks={{
                  onMainLeft:  () => onRightMainLeft(rowIndex),
                  onMoreRight: () => onRightMoreRight(rowIndex),
                }}
              />
            )
          })}
        </View>
      </View>

      {status === 'loading' && allList.length > 0
        ? <Text style={styles.footer} size={12} color={theme['c-font-label']}>{t('list_loading')}</Text>
        : null
      }

      <TVPagination page={page} maxPage={maxPage} onPrev={handlePrev} onNext={handleNext} />
    </View>
  )
})

// ─── 本地列表（我的列表）────────────────────────────────────────────────────
export interface MyMusicListType {
  setList: (list: LX.Music.MusicInfo[], activeIndex: number) => void
  setStatus: (s: ListStatus) => void
}
export interface MyMusicListProps {
  onPress: (item: LX.Music.MusicInfo, index: number) => void
  onShowMenu: (item: LX.Music.MusicInfo, index: number, position: { x: number; y: number; w: number; h: number }) => void
}

export const MyMusicList = forwardRef<MyMusicListType, MyMusicListProps>((
  { onPress, onShowMenu }, ref,
) => {
  const theme = useTheme()
  const t = useI18n()
  const [allList, setAllList] = useState<LX.Music.MusicInfo[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [status, setStatus] = useState<ListStatus>('idle')
  const [page, setPage] = useState(1)
  const itemRefs = useRef<Record<number, RowRefs>>({})
  const pageRef = useRef(1)
  const maxPageRef = useRef(1)

  useImperativeHandle(ref, () => ({
    setList(list, active) {
      setAllList(list)
      setActiveIndex(active)
      const p = active >= 0 ? Math.ceil((active + 1) / PAGE_SIZE) : 1
      pageRef.current = p
      setPage(p)
    },
    setStatus(s) { setStatus(s) },
  }))

  const maxPage = Math.max(1, Math.ceil(allList.length / PAGE_SIZE))
  maxPageRef.current = maxPage

  const goPage = useCallback((p: number) => { pageRef.current = p; setPage(p) }, [])
  const handlePrev = useCallback(() => { if (pageRef.current > 1) goPage(pageRef.current - 1) }, [goPage])
  const handleNext = useCallback(() => { if (pageRef.current < maxPageRef.current) goPage(pageRef.current + 1) }, [goPage])

  const onLeftMainLeft = useCallback((rowIndex: number) => {
    if (pageRef.current <= 1) return
    goPage(pageRef.current - 1)
    requestAnimationFrame(() => { itemRefs.current[rowIndex]?.rightItem?.focusMore() })
  }, [goPage])

  const onRightMoreRight = useCallback((rowIndex: number) => {
    if (pageRef.current >= maxPageRef.current) return
    goPage(pageRef.current + 1)
    requestAnimationFrame(() => { itemRefs.current[rowIndex]?.leftItem?.focusMain() })
  }, [goPage])

  const onRightMainLeft = useCallback((rowIndex: number) => {
    itemRefs.current[rowIndex]?.leftItem?.focusMore()
  }, [])

  const onLeftMoreRight = useCallback((rowIndex: number) => {
    itemRefs.current[rowIndex]?.rightItem?.focusMain()
  }, [])

  const pageStart = (page - 1) * PAGE_SIZE
  const pageSlice = allList.slice(pageStart, pageStart + PAGE_SIZE)
  const leftCol  = pageSlice.slice(0, COL_SIZE)
  const rightCol = pageSlice.slice(COL_SIZE, PAGE_SIZE)

  if (status === 'loading' && allList.length === 0) {
    return <View style={styles.center}><ActivityIndicator size="large" color={theme['c-primary']} /></View>
  }
  if (status === 'error' && allList.length === 0) {
    return <View style={styles.center}><Text color={theme['c-font-label']}>{t('list_error')}</Text></View>
  }

  return (
    <View style={styles.root}>
      <View style={styles.grid}>
        <View style={styles.col}>
          {Array.from({ length: COL_SIZE }).map((_, rowIndex) => {
            const item = leftCol[rowIndex]
            const globalIndex = pageStart + rowIndex
            if (!item) return <View key={rowIndex} style={{ height: ITEM_HEIGHT }} />
            return (
              <MyListItem
                key={item.id}
                ref={el => {
                  if (!itemRefs.current[rowIndex]) itemRefs.current[rowIndex] = {}
                  itemRefs.current[rowIndex].leftItem = el ?? undefined
                }}
                item={item}
                index={globalIndex}
                isActive={globalIndex === activeIndex}
                onPress={onPress}
                onShowMenu={onShowMenu}
                callbacks={{
                  onMainLeft:  () => onLeftMainLeft(rowIndex),
                  onMoreRight: () => onLeftMoreRight(rowIndex),
                }}
              />
            )
          })}
        </View>

        <View style={[styles.divider, { backgroundColor: theme['c-border-background'] }]} />

        <View style={styles.col}>
          {Array.from({ length: COL_SIZE }).map((_, rowIndex) => {
            const item = rightCol[rowIndex]
            const globalIndex = pageStart + COL_SIZE + rowIndex
            if (!item) return <View key={rowIndex} style={{ height: ITEM_HEIGHT }} />
            return (
              <MyListItem
                key={item.id}
                ref={el => {
                  if (!itemRefs.current[rowIndex]) itemRefs.current[rowIndex] = {}
                  itemRefs.current[rowIndex].rightItem = el ?? undefined
                }}
                item={item}
                index={globalIndex}
                isActive={globalIndex === activeIndex}
                onPress={onPress}
                onShowMenu={onShowMenu}
                callbacks={{
                  onMainLeft:  () => onRightMainLeft(rowIndex),
                  onMoreRight: () => onRightMoreRight(rowIndex),
                }}
              />
            )
          })}
        </View>
      </View>

      <TVPagination page={page} maxPage={maxPage} onPrev={handlePrev} onNext={handleNext} />
    </View>
  )
})

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'column' },
  grid: { flex: 1, flexDirection: 'row' },
  col:  { flex: 1, flexDirection: 'column' },
  divider: { width: 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  footer: { textAlign: 'center', paddingVertical: 6 },
})
