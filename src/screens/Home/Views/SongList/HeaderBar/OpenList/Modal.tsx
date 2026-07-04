import { useRef, useImperativeHandle, forwardRef, useState } from 'react'
import ConfirmAlert, { type ConfirmAlertType } from '@/components/common/ConfirmAlert'
import Text from '@/components/common/Text'
import { View } from 'react-native'
import TVInputItem, { type TVInputItemType } from '@/components/common/TVInputItem'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { type Source } from '@/store/songlist/state'

export interface ModalProps {
  onOpenId: (id: string) => void
  onHide?: () => void
}
export interface ModalType {
  show: (source: Source) => void
}

export default forwardRef<ModalType, ModalProps>(({ onOpenId, onHide }, ref) => {
  const alertRef = useRef<ConfirmAlertType>(null)
  const inputRef = useRef<TVInputItemType>(null)
  const [visible, setVisible] = useState(false)
  const [text, setText] = useState('')
  const theme = useTheme()
  const t = useI18n()

  const handleShow = () => {
    alertRef.current?.setVisible(true)
    requestAnimationFrame(() => { setText('') })
  }

  useImperativeHandle(ref, () => ({
    show(source) {
      if (visible) handleShow()
      else {
        setVisible(true)
        requestAnimationFrame(() => { handleShow() })
      }
    },
  }))

  const handleConfirm = () => {
    let id = text.trim()
    if (!id.length) return
    if (id.length > 500) id = id.substring(0, 500)
    alertRef.current?.setVisible(false)
    onOpenId(id)
  }

  return (
    visible
      ? <ConfirmAlert
          ref={alertRef}
          onConfirm={handleConfirm}
          onHide={onHide}
          closeBtn={false}
        >
          <View style={styles.content}>
            <View style={styles.col}>
              <TVInputItem
                ref={inputRef}
                value={text}
                onChangeText={setText}
                placeholder={t('songlist_open_input_placeholder')}
                wrapStyle={styles.inputWrap}
                inputStyle={styles.input}
                hasTVPreferredFocus
              />
            </View>
            <Text style={styles.inputTipText} size={13} color={theme['c-600']}>{t('songlist_open_input_tip')}</Text>
          </View>
        </ConfirmAlert>
      : null
  )
})

const styles = createStyle({
  content: {
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'column',
  },
  col: {
    flexDirection: 'row',
    height: 42,
  },
  inputWrap: {
    flexGrow: 1,
    flexShrink: 1,
  },
  input: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 290,
    height: '100%',
  },
  inputTipText: {
    marginTop: 15,
  },
})
