import { useRef, useImperativeHandle, forwardRef, useState } from 'react'
import ConfirmAlert, { type ConfirmAlertType } from '@/components/common/ConfirmAlert'
import Text from '@/components/common/Text'
import { View } from 'react-native'
import TVInputItem, { type TVInputItemType } from '@/components/common/TVInputItem'
import { createStyle, toast } from '@/utils/tools'
import { useI18n } from '@/lang'
import { importUserApiGroup } from '@/core/userApiGroup'

export interface GroupImportOnlineType {
  show: () => void
}

export default forwardRef<GroupImportOnlineType, {}>((props, ref) => {
  const t = useI18n()
  const alertRef = useRef<ConfirmAlertType>(null)
  const inputRef = useRef<TVInputItemType>(null)
  const [visible, setVisible] = useState(false)
  const [text, setText] = useState('')
  const [btn, setBtn] = useState({ disabled: false, text: t('user_api_btn_import_online_input_confirm') })

  const handleShow = () => {
    alertRef.current?.setVisible(true)
    setBtn({ disabled: false, text: t('user_api_btn_import_online_input_confirm') })
    requestAnimationFrame(() => { setText('') })
  }

  useImperativeHandle(ref, () => ({
    show() {
      if (visible) handleShow()
      else {
        setVisible(true)
        requestAnimationFrame(() => { handleShow() })
      }
    },
  }))

  const handleImport = async() => {
    let url = text.trim()
    if (!/^https?:\/\//.test(url)) {
      url = ''
      setText('')
    }
    if (!url.length) return
    setBtn({ disabled: true, text: t('user_api_btn_import_online_input_loading') })
    try {
      const { succeededCount, failedCount } = await importUserApiGroup(url)
      if (failedCount) {
        toast(t('user_api_group_import_partial_tip', { success: succeededCount, fail: failedCount }), 'long')
      } else {
        toast(t('user_api_group_import_success_tip', { count: succeededCount }))
      }
    } catch (err: any) {
      toast(t('user_api_group_import_failed_tip', { message: err.message }), 'long')
      return
    } finally {
      setBtn({ disabled: false, text: t('user_api_btn_import_online_input_confirm') })
    }
    alertRef.current?.setVisible(false)
  }

  return (
    visible
      ? <ConfirmAlert
          ref={alertRef}
          onConfirm={handleImport}
          disabledConfirm={btn.disabled}
          confirmText={btn.text}
        >
          <View style={styles.content}>
            <Text style={{ marginBottom: 5 }}>{t('user_api_btn_import_group')}</Text>
            <TVInputItem
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder={t('user_api_btn_import_online_input_tip')}
              wrapStyle={styles.inputWrap}
              inputStyle={styles.input}
              inputMode="url"
              hasTVPreferredFocus
            />
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
  inputWrap: {
    flexGrow: 1,
    flexShrink: 1,
  },
  input: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 290,
  },
})
