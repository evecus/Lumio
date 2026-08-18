/**
 * 添加到列表弹窗 — TV 重设计版
 *
 * 风格与 TVListMenuDialog 保持一致：
 * - 居中白色圆角卡片，颜色跟随主题
 * - 顶部标题栏（歌曲名高亮）
 * - 垂直列表，每项独占一行，遥控器可聚焦
 * - 底部"取消"按钮
 * - 遥控器返回键 / 点击取消 均可关闭
 */
import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import Modal, { type ModalType } from '@/components/common/Modal'
import TVButton from '@/components/common/TVButton'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { toast } from '@/utils/tools'
import { addListMusics, moveListMusics } from '@/core/list'
import settingState from '@/store/setting/state'
import List from './List'

export interface SelectInfo {
  musicInfo: LX.Music.MusicInfo | null
  listId: string
  isMove: boolean
}
const initSelectInfo: SelectInfo = { musicInfo: null, listId: '', isMove: false }

export interface MusicAddModalProps {
  onAdded?: () => void
}
export interface MusicAddModalType {
  show: (info: SelectInfo) => void
}

export default forwardRef<MusicAddModalType, MusicAddModalProps>(({ onAdded }, ref) => {
  const t = useI18n()
  const theme = useTheme()
  const modalRef = useRef<ModalType>(null)
  const [selectInfo, setSelectInfo] = useState<SelectInfo>(initSelectInfo)

  useImperativeHandle(ref, () => ({
    show(info) {
      setSelectInfo(info)
      requestAnimationFrame(() => {
        modalRef.current?.setVisible(true)
      })
    },
  }))

  const hide = () => modalRef.current?.setVisible(false)

  const handleHide = () => {
    requestAnimationFrame(() => {
      setSelectInfo({ ...initSelectInfo })
    })
  }

  const handleSelect = (listInfo: LX.List.MyListInfo) => {
    hide()
    if (!selectInfo.musicInfo) return
    if (selectInfo.isMove) {
      void moveListMusics(
        selectInfo.listId,
        listInfo.id,
        [selectInfo.musicInfo],
        settingState.setting['list.addMusicLocationType'],
      ).then(() => {
        onAdded?.()
        toast(t('list_edit_action_tip_move_success'))
      }).catch(() => {
        toast(t('list_edit_action_tip_move_failed'))
      })
    } else {
      void addListMusics(
        listInfo.id,
        [selectInfo.musicInfo],
        settingState.setting['list.addMusicLocationType'],
      ).then(() => {
        onAdded?.()
        toast(t('list_edit_action_tip_add_success'))
      }).catch(() => {
        toast(t('list_edit_action_tip_add_failed'))
      })
    }
  }

  return (
    <Modal
      ref={modalRef}
      onHide={handleHide}
      keyHide
      bgHide={false}
      bgColor="rgba(0,0,0,0.5)"
      statusBarPadding={false}
    >
      <View style={s.overlay}>
        <View style={[s.card, { backgroundColor: theme['c-content-background'] }]}>

          {/* 标题 */}
          <View style={[s.header, { borderBottomColor: theme['c-border-background'] }]}>
            {selectInfo.musicInfo
              ? (
                  <Text size={15} numberOfLines={1} style={s.titleText}>
                    {t(selectInfo.isMove ? 'list_add_title_first_move' : 'list_add_title_first_add')}{' '}
                    <Text size={15} color={theme['c-primary']} numberOfLines={1}>{selectInfo.musicInfo.name}</Text>{' '}
                    {t('list_add_title_last')}
                  </Text>
                )
              : null
            }
          </View>

          {/* 列表 */}
          {selectInfo.musicInfo
            ? (
                <List
                  musicInfo={selectInfo.musicInfo}
                  onPress={handleSelect}
                />
              )
            : null
          }

          {/* 分割线 */}
          <View style={[s.divider, { backgroundColor: theme['c-border-background'] }]} />

          {/* 取消 */}
          <View style={s.footerWrap}>
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
})

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: 380,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 10,
    paddingTop: 0,
    paddingBottom: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleText: {
    textAlign: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
    marginTop: 4,
  },
  footerWrap: {
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
