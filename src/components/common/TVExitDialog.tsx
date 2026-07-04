/**
 * TV 专用退出确认弹窗
 * - 跟随主题色，替代系统原生 Alert
 * - 两个按钮均可被遥控器焦点框选中
 * - "我不"按钮默认获得焦点，防止误触退出
 */
import { useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import Modal, { type ModalType } from './Modal'
import TVButton from './TVButton'
import Text from './Text'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'

export interface TVExitDialogType {
  show: (onConfirm: () => void, message?: string) => void
}

export default forwardRef<TVExitDialogType>((_, ref) => {
  const theme = useTheme()
  const t = useI18n()
  const modalRef = useRef<ModalType>(null)
  const onConfirmRef = useRef<() => void>(() => {})
  const [message, setMessage] = useState<string>('')

  useImperativeHandle(ref, () => ({
    show(onConfirm, msg?) {
      onConfirmRef.current = onConfirm
      setMessage(msg ?? t('exit_app_tip'))
      modalRef.current?.setVisible(true)
    },
  }))

  const hide = () => modalRef.current?.setVisible(false)

  const handleCancel = () => { hide() }

  const handleConfirm = () => {
    hide()
    onConfirmRef.current()
  }

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

          {/* 标题栏：背景与底层背景保持一致，文字为主体色 */}
          <View style={[s.header, { backgroundColor: theme['c-content-background'] }]}>
            <Text size={16} color={theme['c-primary']}>
              {message}
            </Text>
          </View>

          {/* 按钮区 */}
          <View style={s.btnRow}>

            {/* 取消（默认焦点） */}
            <TVButton
              hasTVPreferredFocus
              onPress={handleCancel}
              borderRadius={6}
              style={[s.btn, { backgroundColor: theme['c-button-background'] }]}
            >
              <Text size={14} color={theme['c-button-font']}>
                {t('dialog_cancel')}
              </Text>
            </TVButton>

            {/* 确认退出：背景与取消按钮一致，文字为主体色 */}
            <TVButton
              onPress={handleConfirm}
              borderRadius={6}
              style={[s.btn, { backgroundColor: theme['c-button-background'] }]}
            >
              <Text size={14} color={theme['c-primary']}>
                {t('list_remove_tip_button')}
              </Text>
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
    width: 400,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 8,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 22,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  btn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    minWidth: 100,
    alignItems: 'center',
  },
})
