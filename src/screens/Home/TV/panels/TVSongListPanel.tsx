/**
 * TV 歌单广场面板
 * 顶部：平台 Tab + 筛选按钮
 * 筛选弹窗：居中 Modal，tag 布局与原侧边栏完全一致
 */
import { useEffect, useRef, useState, useCallback, memo, forwardRef, useImperativeHandle } from 'react'
import { View, StyleSheet, Modal, ScrollView } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import TVButton, { type TVButtonType } from '@/components/common/TVButton'
import Text from '@/components/common/Text'
import List, { type ListType } from '@/screens/Home/Views/SongList/List'
import TagGroup, { type TagGroupProps } from '@/screens/Home/Views/SongList/TagList/TagGroup'
import songlistState, { type Source, type TagInfo } from '@/store/songlist/state'
import { getSongListSetting, saveSongListSetting } from '@/utils/data'
import OpenList, { type OpenListType } from '@/screens/Home/Views/SongList/HeaderBar/OpenList'
import { getTags } from '@/core/songlist'
import { useI18n } from '@/lang'
import { useSourceLabel } from '@/utils/hooks/useSourceLabel'
import { setFocusZone } from '../index'

// ─── 筛选弹窗 ────────────────────────────────────────────────────────────────
interface FilterModalProps {
  visible: boolean
  onClose: () => void
  onTagChange: (name: string, id: string) => void
}

const FilterModal = memo(({ visible, onClose, onTagChange }: FilterModalProps) => {
  const theme = useTheme()
  const t = useI18n()
  const [tagList, setTagList] = useState<TagInfo['tags']>([])
  const [activeId, setActiveId] = useState('')
  const prevSource = useRef('')
  const isUnmountedRef = useRef(false)

  useEffect(() => {
    isUnmountedRef.current = false
    return () => { isUnmountedRef.current = true }
  }, [])

  useEffect(() => {
    const handleShow = (source: Source, id: string) => {
      setActiveId(id)
      if (source === prevSource.current) return
      setTagList([{
        name: '',
        list: [{ name: t('songlist_tag_default'), id: '', parent_id: '', parent_name: '', source }],
      }])
      void getTags(source).then(tagInfo => {
        if (isUnmountedRef.current) return
        prevSource.current = source
        setTagList([
          { name: '', list: [{ name: t('songlist_tag_default'), id: '', parent_id: '', parent_name: '', source }] },
          { name: t('songlist_tag_hot'), list: [...tagInfo.hotTag] },
          ...tagInfo.tags,
        ].filter(g => g.list.length))
      })
    }
    global.app_event.on('showSonglistTagList', handleShow)
    return () => { global.app_event.off('showSonglistTagList', handleShow) }
  }, [t])

  const handleTagChange: TagGroupProps['onTagChange'] = (name, id) => {
    setActiveId(id)
    onTagChange(name, id)
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={[m.card, { backgroundColor: theme['c-content-background'] }]}>
          <ScrollView style={m.scroll} contentContainerStyle={m.scrollContent}
            showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">
            {tagList.map((group, index) => (
              <TagGroup key={index} name={group.name} list={group.list}
                activeId={activeId} onTagChange={handleTagChange} isFirstGroup={index === 0} />
            ))}
            {tagList.length === 1 && (
              <View style={m.loading}><Text>{t('list_loading')}</Text></View>
            )}
          </ScrollView>
          <View style={[m.divider, { backgroundColor: theme['c-border-background'] }]} />
          <View style={m.cancelRow}>
            <TVButton borderRadius={6}
              style={[m.cancelBtn, { backgroundColor: theme['c-button-background'] }]}
              onPress={onClose}>
              <Text size={14} color={theme['c-primary']}>{t('dialog_cancel')}</Text>
            </TVButton>
          </View>
        </View>
      </View>
    </Modal>
  )
})

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  card: { width: '75%', maxHeight: '82%', borderRadius: 14, overflow: 'hidden', elevation: 10 },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  loading: { paddingVertical: 30, alignItems: 'center' },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 20, marginTop: 4 },
  cancelRow: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, alignItems: 'flex-end' },
  cancelBtn: { paddingHorizontal: 28, paddingVertical: 12, minWidth: 100, alignItems: 'center', borderRadius: 6 },
})

// ─── 主面板 ──────────────────────────────────────────────────────────────────
export interface TVSongListPanelType {
  focusTopBar: () => void
  isFilterVisible: () => boolean
  closeFilter: () => void
  restoreFocus: () => void
  /** 切换音乐源 */
  setSource: (src: Source) => void
  /** 打开筛选弹窗（供顶部栏筛选按钮调用） */
  openFilter: () => void
  /** 打开歌单弹窗（供顶部栏打开按钮调用） */
  openList: () => void
}

export default memo(forwardRef<TVSongListPanelType, { initialSource?: Source }>((props, ref) => {
  const { initialSource } = props
  const theme = useTheme()
  const t = useI18n()
  const getLabel = useSourceLabel()
  const listRef = useRef<ListType>(null)
  const openListRef = useRef<OpenListType>(null)
  const sources = songlistState.sources
  const [activeSource, setActiveSource] = useState<Source>(initialSource ?? sources[0] ?? 'kw')
  const [filterVisible, setFilterVisible] = useState(false)
  const filterVisibleRef = useRef(false)
  const songlistInfo = useRef<{ source: Source; sortId: string; tagId: string }>({
    source: initialSource ?? sources[0] ?? 'kw',
    sortId: '',
    tagId: '',
  })
  // 顶部第一个 Tab 的 ref，用于 back 时还焦点
  const firstTabRef = useRef<TVButtonType>(null)

  useImperativeHandle(ref, () => ({
    focusTopBar() {
      firstTabRef.current?.requestFocus()
    },
    isFilterVisible() {
      return filterVisibleRef.current
    },
    closeFilter() {
      setFilterVisible(false)
      filterVisibleRef.current = false
    },
    restoreFocus() {
      listRef.current?.restoreFocus()
    },
    setSource(src: Source) {
      handleSelectSource(src)
    },
    openFilter() {
      handleOpenFilter()
    },
    openList() {
      openListRef.current?.show(songlistInfo.current.source)
    },
  }))

  useEffect(() => {
    if (initialSource) {
      // 由主页指定了来源，直接用它初始化
      const sortId = songlistState.sortList[initialSource]?.[0]?.id ?? ''
      songlistInfo.current = { source: initialSource, sortId, tagId: '' }
      setActiveSource(initialSource)
      listRef.current?.loadList(initialSource, sortId, '')
      openListRef.current?.setInfo(initialSource)
    } else {
      void getSongListSetting().then(info => {
        const src = info.source as Source
        const sortId = info.sortId
        const tagId = info.tagId
        songlistInfo.current = { source: src, sortId, tagId }
        setActiveSource(src)
        listRef.current?.loadList(src, sortId, tagId)
        openListRef.current?.setInfo(src)
      })
    }
  }, [initialSource])

  useEffect(() => {
    const handleShow = () => { setFilterVisible(true); filterVisibleRef.current = true }
    const handleHide = () => { setFilterVisible(false); filterVisibleRef.current = false }
    global.app_event.on('showSonglistTagList', handleShow)
    global.app_event.on('hideSonglistTagList', handleHide)
    return () => {
      global.app_event.off('showSonglistTagList', handleShow)
      global.app_event.off('hideSonglistTagList', handleHide)
    }
  }, [])

  useEffect(() => {
    const handleTagChange = (name: string, id: string) => {
      songlistInfo.current.tagId = id
      void saveSongListSetting({ tagName: name, tagId: id })
      listRef.current?.loadList(songlistInfo.current.source, songlistInfo.current.sortId, id)
    }
    global.app_event.on('songlistTagInfoChange', handleTagChange)
    return () => { global.app_event.off('songlistTagInfoChange', handleTagChange) }
  }, [])

  const handleSelectSource = useCallback((src: Source) => {
    const sortId = songlistState.sortList[src]![0].id
    songlistInfo.current = { source: src, sortId, tagId: '' }
    setActiveSource(src)
    void saveSongListSetting({ source: src, sortId, tagId: '', tagName: '' })
    listRef.current?.loadList(src, sortId, '')
    openListRef.current?.setInfo(src)
  }, [])

  const handleOpenFilter = () => {
    setFilterVisible(true)
    filterVisibleRef.current = true
    global.app_event.emit('showSonglistTagList', songlistInfo.current.source, songlistInfo.current.tagId)
  }

  const handleCloseFilter = () => {
    setFilterVisible(false)
    filterVisibleRef.current = false
    // 弹窗关闭后焦点回顶部栏
    requestAnimationFrame(() => { firstTabRef.current?.requestFocus() })
  }

  const handleTagChange = (name: string, id: string) => {
    handleCloseFilter()
    requestAnimationFrame(() => { global.app_event.songlistTagInfoChange(name, id) })
  }

  const primary = theme['c-primary'] ?? '#1aad19'
  const border  = theme['c-border-background']

  return (
    <View style={s.root}>
      <List ref={listRef} />
      <FilterModal visible={filterVisible} onClose={handleCloseFilter} onTagChange={handleTagChange} />
      <OpenList ref={openListRef} />
    </View>
  )
}))

const s = StyleSheet.create({
  root: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  sourceTab: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  spacer: { flex: 1 },
  filterBtn: { padding: 10, borderRadius: 8 },
})
