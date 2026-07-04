/**
 * TV 我的列表面板（Grid 方块版）
 * 顶部：固定"我的列表"标题
 * 内容：列表方块 Grid（一行5个）
 */
import { memo, useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import { View, StyleSheet, FlatList, Modal, DeviceEventEmitter } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { useMyList } from '@/store/list/hook'
import TVButton, { type TVButtonType } from '@/components/common/TVButton'
import Text from '@/components/common/Text'
import { LIST_IDS } from '@/config/constant'
import musicSdk from '@/utils/musicSdk'
import listState from '@/store/list/state'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'
import { handleSync } from '@/screens/Home/Views/Mylist/MyList/listAction'
import { removeUserList } from '@/core/list'
import TVExitDialog, { type TVExitDialogType } from '@/components/common/TVExitDialog'
import ListNameEdit, { type ListNameEditType } from '@/screens/Home/Views/Mylist/MyList/ListNameEdit'
import ListMusicSort, { type ListMusicSortType } from '@/screens/Home/Views/Mylist/MyList/ListMusicSort'
import DuplicateMusic, { type DuplicateMusicType } from '@/screens/Home/Views/Mylist/MyList/DuplicateMusic'
import ListImportExport, { type ListImportExportType } from '@/screens/Home/Views/Mylist/MyList/ListImportExport'
import { useI18n } from '@/lang'
import { setFocusZone } from '../index'

const NUM_COLUMNS = 5
const CARD_PADDING = 4  // 卡片与焦点框的间距，让焦点框完整显示

// ─── 操作弹窗 ────────────────────────────────────────────────────────────────
interface MenuItemDef {
  action: string
  label: string
  disabled?: boolean
  danger?: boolean
}

const ActionDialog = memo(({
  visible,
  menus,
  onAction,
  onClose,
}: {
  visible: boolean
  menus: MenuItemDef[]
  onAction: (action: string) => void
  onClose: () => void
}) => {
  const theme = useTheme()
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={d.overlay}>
        <View style={[d.card, { backgroundColor: theme['c-content-background'] }]}>
          <FlatList
            data={menus}
            keyExtractor={item => item.action}
            style={d.list}
            contentContainerStyle={d.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <View style={d.itemWrap}>
                <TVButton
                  hasTVPreferredFocus={index === 0}
                  borderRadius={6}
                  disabled={item.disabled}
                  style={[d.actionBtn, { backgroundColor: theme['c-button-background'] }]}
                  onPress={() => onAction(item.action)}
                >
                  <Text size={15}
                    color={item.disabled ? theme['c-font-label'] : item.danger ? theme['c-primary'] : theme['c-button-font']}>
                    {item.label}
                  </Text>
                </TVButton>
              </View>
            )}
          />
          <View style={[d.divider, { backgroundColor: theme['c-border-background'] }]} />
          <View style={d.cancelRow}>
            <TVButton borderRadius={6}
              style={[d.cancelBtn, { backgroundColor: theme['c-button-background'] }]}
              onPress={onClose}>
              <Text size={14} color={theme['c-primary']}>取消</Text>
            </TVButton>
          </View>
        </View>
      </View>
    </Modal>
  )
})

const d = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  card: { width: 260, maxHeight: 520, borderRadius: 12, overflow: 'hidden', elevation: 10 },
  list: { flexGrow: 0 },
  listContent: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 6 },
  itemWrap: { marginBottom: 6 },
  actionBtn: { height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 6 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14, marginTop: 2 },
  cancelRow: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14, alignItems: 'flex-end' },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 10, minWidth: 80, alignItems: 'center', borderRadius: 6 },
})

// ─── 对外接口 ────────────────────────────────────────────────────────────────
export interface TVMyListGridPanelType {
  /** 菜单键：焦点在卡片上则弹操作菜单返回 true，否则返回 false */
  tryOpenMenuForFocusedCard: () => boolean
  focusTopBar: () => void
  isDialogVisible: () => boolean
  closeDialog: () => void
  restoreFocus: () => void
}

// ─── 主面板 ──────────────────────────────────────────────────────────────────
export default memo(forwardRef<TVMyListGridPanelType>((_, ref) => {
  const theme = useTheme()
  const t = useI18n()
  const allList = useMyList()

  const [actionVisible, setActionVisible] = useState(false)
  const actionVisibleRef = useRef(false)
  const [actionMenus, setActionMenus] = useState<MenuItemDef[]>([])
  const selectedRef = useRef<{ listInfo: LX.List.MyListInfo; index: number } | null>(null)
  const lastFocusedCardRef = useRef<TVButtonType | null>(null)
  // 当前聚焦的卡片信息，用于菜单键触发弹窗
  const focusedCardInfoRef = useRef<{ listInfo: LX.List.MyListInfo; index: number; btn: TVButtonType } | null>(null)
  const buildMenusRef = useRef<(listInfo: LX.List.MyListInfo) => MenuItemDef[]>(() => [])
  // 顶部标题区域的 ref（用于 back 时还焦点）
  const titleAreaRef = useRef<TVButtonType>(null)

  const removeListDialogRef = useRef<TVExitDialogType>(null)

  const listNameEditRef = useRef<ListNameEditType>(null)
  const listMusicSortRef = useRef<ListMusicSortType>(null)
  const duplicateMusicRef = useRef<DuplicateMusicType>(null)
  const listImportExportRef = useRef<ListImportExportType>(null)

  useImperativeHandle(ref, () => ({
    focusTopBar() {
      // 顶部栏已删除，焦点留在内容区
    },
    isDialogVisible() {
      return actionVisibleRef.current
    },
    closeDialog() {
      setActionVisible(false)
      actionVisibleRef.current = false
      // 关闭弹窗后焦点还给原来聚焦的卡片
      requestAnimationFrame(() => { focusedCardInfoRef.current?.btn.requestFocus() })
    },
    restoreFocus() {
      if (lastFocusedCardRef.current) {
        lastFocusedCardRef.current.requestFocus()
      } else {
        titleAreaRef.current?.requestFocus()
      }
    },
    tryOpenMenuForFocusedCard() {
      const focused = focusedCardInfoRef.current
      if (!focused || actionVisibleRef.current) return false
      selectedRef.current = { listInfo: focused.listInfo, index: focused.index }
      const menus = buildMenusRef.current(focused.listInfo)
      setActionMenus(menus)
      setActionVisible(true)
      actionVisibleRef.current = true
      return true
    },
  }))

  const buildMenus = useCallback((listInfo: LX.List.MyListInfo): MenuItemDef[] => {
    let rename = false
    let remove = false
    let sync = false
    const localFile = !listState.fetchingListStatus[listInfo.id]
    switch (listInfo.id) {
      case LIST_IDS.DEFAULT:
      case LIST_IDS.LOVE:
        break
      default: {
        const userList = listInfo as LX.List.UserListInfo
        rename = true
        remove = true
        sync = !!(userList.source && musicSdk[userList.source as keyof typeof musicSdk]?.songList)
        break
      }
    }
    return [
      { action: 'new',            label: t('list_create') },
      { action: 'rename',         label: t('list_rename'),            disabled: !rename },
      { action: 'sort',           label: t('list_sort') },
      { action: 'duplicateMusic', label: t('lists__duplicate') },
      { action: 'local_file',     label: t('list_select_local_file'), disabled: !localFile },
      { action: 'sync',           label: t('list_sync'),              disabled: !sync || !localFile },
      { action: 'import',         label: t('list_import') },
      { action: 'export',         label: t('list_export') },
      { action: 'remove',         label: t('list_remove'),            disabled: !remove, danger: true },
    ]
  }, [t])
  // 同步 buildMenus 到 ref，供 useImperativeHandle 使用
  buildMenusRef.current = buildMenus

  // 记录当前聚焦的卡片信息（不打开弹窗）
  const handleCardFocused = useCallback((
    listInfo: LX.List.MyListInfo | null,
    index: number,
    btn: TVButtonType | null,
  ) => {
    if (listInfo === null) {
      focusedCardInfoRef.current = null
    } else {
      focusedCardInfoRef.current = { listInfo, index, btn: btn! }
    }
  }, [])


  const closeAction = useCallback(() => {
    setActionVisible(false)
    actionVisibleRef.current = false
    requestAnimationFrame(() => { focusedCardInfoRef.current?.btn.requestFocus() })
  }, [])

  const handleAction = useCallback((action: string) => {
    setActionVisible(false)
    actionVisibleRef.current = false
    const sel = selectedRef.current
    if (!sel) return
    const { listInfo, index } = sel
    switch (action) {
      case 'new': listNameEditRef.current?.showCreate(Math.max(index - 1, 0)); break
      case 'rename': listNameEditRef.current?.show(listInfo as LX.List.UserListInfo); break
      case 'sort': listMusicSortRef.current?.show(listInfo); break
      case 'duplicateMusic': duplicateMusicRef.current?.show(listInfo); break
      case 'import': listImportExportRef.current?.import(listInfo, index); break
      case 'export': listImportExportRef.current?.export(listInfo, index); break
      case 'local_file': listImportExportRef.current?.selectFile(listInfo, index); break
      case 'sync': handleSync(listInfo as LX.List.UserListInfo); break
      case 'remove':
        removeListDialogRef.current?.show(
          () => { void removeUserList([(listInfo as LX.List.UserListInfo).id]) },
          global.i18n.t('list_remove_tip', { name: listInfo.name }),
        )
        break
    }
  }, [])

  const handleOpenList = useCallback((listInfo: LX.List.MyListInfo, btnRef: TVButtonType) => {
    if (!commonState.componentIds.home) return
    lastFocusedCardRef.current = btnRef
    navigations.pushTVMusicDetailScreen(commonState.componentIds.home, {
      type: 'mylist',
      id: listInfo.id,
      name: listInfo.name,
    })
  }, [])

  const paddedList: Array<LX.List.MyListInfo | null> = [...allList]
  const remainder = paddedList.length % NUM_COLUMNS
  if (remainder > 0) {
    for (let i = 0; i < NUM_COLUMNS - remainder; i++) paddedList.push(null)
  }

  return (
    <View style={s.root}>
      {/* 方块 Grid */}
      <FlatList
        key={NUM_COLUMNS}
        data={paddedList}
        numColumns={NUM_COLUMNS}
        keyExtractor={(item, index) => item?.id ?? `pad_${index}`}
        contentContainerStyle={s.gridContent}
        renderItem={({ item, index }) => {
          if (!item) return <View style={s.cardWrap} />
          return (
            <CardItem
              listInfo={item}
              index={index}
              theme={theme}
              onOpen={handleOpenList}
              onFocused={handleCardFocused}
            />
          )
        }}
      />

      <ActionDialog
        visible={actionVisible}
        menus={actionMenus}
        onAction={handleAction}
        onClose={closeAction}
      />

      <ListNameEdit ref={listNameEditRef} />
      <ListMusicSort ref={listMusicSortRef} />
      <DuplicateMusic ref={duplicateMusicRef} />
      <ListImportExport ref={listImportExportRef} />
      <TVExitDialog ref={removeListDialogRef} />
    </View>
  )
}))

// ─── 单个方块卡片 ─────────────────────────────────────────────────────────────
const CardItem = memo(({
  listInfo,
  index,
  theme,
  onOpen,
  onFocused,
}: {
  listInfo: LX.List.MyListInfo
  index: number
  theme: any
  onOpen: (listInfo: LX.List.MyListInfo, btn: TVButtonType) => void
  onFocused: (listInfo: LX.List.MyListInfo | null, index: number, btn: TVButtonType | null) => void
}) => {
  const cardBtnRef = useRef<TVButtonType>(null)
  return (
    <View style={s.cardWrap}>
      {/* TVButton 自身透明，padding 留出焦点框空间，内部 card 视图承载背景色 */}
      <TVButton
        ref={cardBtnRef}
        style={[s.cardOuter, { padding: CARD_PADDING }]}
        borderRadius={10}
        onPress={() => { if (cardBtnRef.current) onOpen(listInfo, cardBtnRef.current) }}
        onFocus={() => {
          setFocusZone('content')
          if (cardBtnRef.current) onFocused(listInfo, index, cardBtnRef.current)
        }}
        onBlur={() => onFocused(null, -1, null)}
      >
        <View style={[s.card, { backgroundColor: '#f5f5f7' }]}>
          <Text style={[s.listLabel, { color: theme['c-primary'] }]} numberOfLines={2}>{listInfo.name}</Text>
        </View>
      </TVButton>
    </View>
  )
})

const s = StyleSheet.create({
  root: { flex: 1 },
  topBar: { paddingHorizontal: 16, paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, flexShrink: 0 },
  titleBtn: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 8, borderRadius: 6 },
  topTitle: { fontWeight: '600' },
  gridContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  cardWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 8, paddingBottom: 20 },
  cardOuter: { width: '100%', alignItems: 'center' },
  card: { width: '100%', aspectRatio: 1.2, borderRadius: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', paddingHorizontal: 8 },
  listLabel: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
})
