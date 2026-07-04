/**
 * TV 专用通用确认弹窗
 * - 跟随主题色，替代系统原生 Alert
 * - 两个按钮均可被遥控器焦点框选中
 * - "取消"按钮默认获得焦点，防止误操作
 */
import { useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import Modal, { type ModalType } from './Modal'
import TVButton from './TVButton'
import Text from './Text'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'

export interface TVConfirmDialogType {
  show: (options: {
    message: string
    cancelButtonText?: string
    confirmButtonText?: string
    onCancel?: () => void
    onConfirm?: () => void
  }) => void
}

export default forwardRef<TVConfirmDialogType>((_, ref) => {
  const theme = useTheme()
  const t = useI18n()
  const modalRef = useRef<ModalType>(null)
  const onConfirmRef = useRef<() => void>(() => {})
  const onCancelRef = useRef<() => void>(() => {})
  const [message, setMessage] = useState('')
  const [cancelText, setCancelText] = useState('')
  const [confirmText, setConfirmText] = useState('')

  useImperativeHandle(ref, () => ({
    show({ message, cancelButtonText, confirmButtonText, onCancel, onConfirm }) {
      setMessage(message)
      setCancelText(cancelButtonText ?? t('dialog_cancel'))
      setConfirmText(confirmButtonText ?? t('dialog_confirm'))
      onCancelRef.current = onCancel ?? (() => {})
      onConfirmRef.current = onConfirm ?? (() => {})
      modalRef.current?.setVisible(true)
    },
  }))

  const hide = () => modalRef.current?.setVisible(false)

  const handleCancel = () => {
    hide()
    onCancelRef.current()
  }

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
          <View style={[s.header, { backgroundColor: theme['c-content-background'] }]}>
            <Text size={16} color={theme['c-primary']}>
              {message}
            </Text>
          </View>
          <View style={s.btnRow}>
            <TVButton
              hasTVPreferredFocus
              onPress={handleCancel}
              borderRadius={6}
              style={[s.btn, { backgroundColor: theme['c-button-background'] }]}
            >
              <Text size={14} color={theme['c-button-font']}>
                {cancelText}
              </Text>
            </TVButton>
            <TVButton
              onPress={handleConfirm}
              borderRadius={6}
              style={[s.btn, { backgroundColor: theme['c-button-background'] }]}
            >
              <Text size={14} color={theme['c-primary']}>
                {confirmText}
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
