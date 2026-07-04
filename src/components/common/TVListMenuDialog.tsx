/**
 * TV 歌曲操作弹窗 — 通用版
 *
 * 支持传入任意 menus 数组，每项 { action, label }。
 * 所有按钮可被遥控器绿色焦点框选中并点击。
 * 按遥控器返回键或点击"取消"弹窗消失。
 * 配色完全跟随主题。
 */
import { useRef, useImperativeHandle, forwardRef } from 'react'
import { View, FlatList, StyleSheet } from 'react-native'
import Modal, { type ModalType } from './Modal'
import TVButton from './TVButton'
import Text from './Text'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'

export interface MenuItemDef<A extends string = string> {
  action: A
  label: string
  danger?: boolean   // 危险操作（如移除）显示为主题色警示
}

export interface TVListMenuDialogType<T = unknown> {
  show: (selectInfo: T) => void
}

export interface TVListMenuDialogProps<T = unknown, A extends string = string> {
  menus: ReadonlyArray<MenuItemDef<A>>
  onAction: (action: A, selectInfo: T) => void
}

function TVListMenuDialogInner<T, A extends string = string>(
  props: TVListMenuDialogProps<T, A>,
  ref: React.Ref<TVListMenuDialogType<T>>,
) {
  const theme = useTheme()
  const t = useI18n()
  const modalRef = useRef<ModalType>(null)
  const selectInfoRef = useRef<T | null>(null)

  useImperativeHandle(ref, () => ({
    show(selectInfo: T) {
      selectInfoRef.current = selectInfo
      modalRef.current?.setVisible(true)
    },
  }))

  const hide = () => modalRef.current?.setVisible(false)

  const handleAction = (action: A) => {
    const info = selectInfoRef.current
    if (info == null) return
    hide()
    props.onAction(action, info)
  }

  const renderItem = ({ item, index }: { item: MenuItemDef<A>, index: number }) => (
    <View style={s.itemWrap}>
      <TVButton
        hasTVPreferredFocus={index === 0}
        borderRadius={6}
        style={[s.actionBtn, { backgroundColor: theme['c-button-background'] }]}
        onPress={() => handleAction(item.action)}
      >
        <Text
          size={15}
          color={item.danger ? theme['c-primary'] : theme['c-button-font']}
        >
          {item.label}
        </Text>
      </TVButton>
    </View>
  )

  return (
    <Modal
      ref={modalRef}
      keyHide
      bgHide={false}
      bgColor="rgba(0,0,0,0.5)"
      statusBarPadding={false}
    >
      <View style={s.overlay}>
        <View style={[s.card, { backgroundColor: theme['c-content-background'] }]}>

          {/* 操作按钮列表，超出可滚动 */}
          <FlatList
            data={props.menus as MenuItemDef<A>[]}
            renderItem={renderItem}
            keyExtractor={item => item.action}
            style={s.list}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            getItemLayout={(_, index) => ({
              length: ITEM_HEIGHT + ITEM_GAP,
              offset: (ITEM_HEIGHT + ITEM_GAP) * index,
              index,
            })}
          />

          {/* 分割线 */}
          <View style={[s.divider, { backgroundColor: theme['c-border-background'] }]} />

          {/* 取消按钮 */}
          <View style={s.cancelWrap}>
            <TVButton
              borderRadius={6}
              style={[s.cancelBtn, { backgroundColor: theme['c-button-background'] }]}
              onPress={hide}
            >
              <Text size={14} color={theme['c-primary']}>{t('dialog_cancel')}</Text>
            </TVButton>
          </View>

        </View>
      </View>
    </Modal>
  )
}

export default forwardRef(TVListMenuDialogInner) as <T, A extends string = string>(
  props: TVListMenuDialogProps<T, A> & { ref?: React.Ref<TVListMenuDialogType<T>> }
) => JSX.Element | null

const ITEM_HEIGHT = 52
const ITEM_GAP = 8
const MAX_VISIBLE = 6

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: 320,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 10,
    maxHeight: MAX_VISIBLE * (ITEM_HEIGHT + ITEM_GAP) + 16 + 52 + 16,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  itemWrap: {
    marginBottom: ITEM_GAP,
  },
  actionBtn: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
    marginTop: 4,
  },
  cancelWrap: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    alignItems: 'flex-end',
  },
  cancelBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    minWidth: 100,
    alignItems: 'center',
    borderRadius: 6,
  },
})
