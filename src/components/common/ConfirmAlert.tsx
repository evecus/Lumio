import { forwardRef, useImperativeHandle, useRef } from 'react'
import { View, ScrollView } from 'react-native'
import Dialog, { type DialogType } from './Dialog'
import TVButton from './TVButton'
import { createStyle } from '@/utils/tools'
import { useI18n } from '@/lang/index'
import { useTheme } from '@/store/theme/hook'
import Text from './Text'

const styles = createStyle({
  main: {
    flexShrink: 1,
    marginTop: 15,
    marginLeft: 5,
    marginRight: 5,
    marginBottom: 25,
  },
  content: {
    flexGrow: 0,
    paddingLeft: 10,
    paddingRight: 10,
  },
  btns: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 15,
  },
  btnsDirection: {
    paddingLeft: 15,
  },
  btnsReversedDirection: {
    paddingLeft: 15,
    flexDirection: 'row-reverse',
  },
  btn: {
    flex: 1,
    borderRadius: 4,
    marginRight: 15,
    padding: 10,
    alignItems: 'center',
  },
  btnReversedDirection: {
    marginLeft: 15,
  },
})

export interface ConfirmAlertProps {
  onCancel?: () => void
  onHide?: () => void
  onConfirm?: () => void
  keyHide?: boolean
  bgHide?: boolean
  closeBtn?: boolean
  title?: string
  text?: string
  cancelText?: string
  confirmText?: string
  showConfirm?: boolean
  disabledConfirm?: boolean
  reverseBtn?: boolean
  children?: React.ReactNode | React.ReactNode[]
}

export interface ConfirmAlertType {
  setVisible: (visible: boolean) => void
}

export default forwardRef<ConfirmAlertType, ConfirmAlertProps>((({
  onHide,
  onCancel,
  onConfirm = () => {},
  keyHide,
  bgHide,
  closeBtn,
  title = '',
  text = '',
  cancelText = '',
  confirmText = '',
  showConfirm = true,
  disabledConfirm = false,
  children,
  reverseBtn = false,
}: ConfirmAlertProps, ref) => {
  const theme = useTheme()
  const t = useI18n()

  const dialogRef = useRef<DialogType>(null)

  useImperativeHandle(ref, () => ({
    setVisible(visible: boolean) {
      dialogRef.current?.setVisible(visible)
    },
  }))

  const handleCancel = () => {
    onCancel?.()
    dialogRef.current?.setVisible(false)
  }

  return (
    <Dialog onHide={onHide} keyHide={keyHide} bgHide={bgHide} closeBtn={closeBtn} title={title} ref={dialogRef}>
      <View style={styles.main}>
        <ScrollView style={styles.content} keyboardShouldPersistTaps={'always'}>
          {children ?? <Text>{text}</Text>}
        </ScrollView>
      </View>
      <View style={{ ...styles.btns, ...(reverseBtn ? styles.btnsReversedDirection : styles.btnsDirection) }}>
        <TVButton
          style={{ ...styles.btn, ...(reverseBtn ? styles.btnReversedDirection : {}), backgroundColor: theme['c-button-background'] }}
          onPress={handleCancel}
        >
          <Text color={theme['c-button-font']}>{cancelText || t('cancel')}</Text>
        </TVButton>
        {showConfirm
          ? <TVButton
              style={{ ...styles.btn, ...(reverseBtn ? styles.btnReversedDirection : {}), backgroundColor: theme['c-button-background'] }}
              onPress={onConfirm}
              disabled={disabledConfirm}
            >
              <Text color={theme['c-button-font']}>{confirmText || t('confirm')}</Text>
            </TVButton>
          : null}
      </View>
    </Dialog>
  )
}))
