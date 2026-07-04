import { useRef, useImperativeHandle, forwardRef, useState } from 'react'
import Text from '@/components/common/Text'
import { View } from 'react-native'
import { createStyle, openUrl } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import Dialog, { type DialogType } from '@/components/common/Dialog'
import TVButton from '@/components/common/TVButton'
import List from './List'
import ScriptImportExport, { type ScriptImportExportType } from './ScriptImportExport'
import ScriptImportOnline, { type ScriptImportOnlineType } from './ScriptImportOnline'
import { state } from '@/store/userApi'
import { tipDialog } from '@/utils/tools'

export interface UserApiEditModalType {
  show: () => void
}

export default forwardRef<UserApiEditModalType, {}>((props, ref) => {
  const dialogRef = useRef<DialogType>(null)
  const [visible, setVisible] = useState(false)
  const theme = useTheme()
  const t = useI18n()
  const scriptImportExportRef = useRef<ScriptImportExportType>(null)
  const scriptImportOnlineRef = useRef<ScriptImportOnlineType>(null)

  const handleShow = () => {
    dialogRef.current?.setVisible(true)
  }
  useImperativeHandle(ref, () => ({
    show() {
      if (visible) handleShow()
      else {
        setVisible(true)
        requestAnimationFrame(() => {
          handleShow()
        })
      }
    },
  }))

  const handleCancel = () => {
    dialogRef.current?.setVisible(false)
  }

  const openFAQPage = () => {
    void openUrl('https://lyswhut.github.io/lx-music-doc/mobile/custom-source')
  }

  const handleImportLocal = () => {
    if (state.list.length > 20) {
      void tipDialog({
        message: t('user_api_max_tip'),
        btnText: t('ok'),
      })
      return
    }
    scriptImportExportRef.current?.import()
  }

  const handleImportOnline = () => {
    if (state.list.length > 20) {
      void tipDialog({
        message: t('user_api_max_tip'),
        btnText: t('ok'),
      })
      return
    }
    scriptImportOnlineRef.current?.show()
  }

  return (
    visible
      ? (
          <Dialog ref={dialogRef} bgHide={false} closeBtn={false}>
            <View style={styles.content}>
              <Text size={16} style={styles.title}>{t('user_api_title')}</Text>
              <List />
              <View style={styles.tips}>
                <Text style={styles.tipsText} size={12}>
                  {t('user_api_readme')}
                </Text>
                <TVButton
                  onPress={openFAQPage}
                  style={{ borderRadius: 4, overflow: 'hidden' }}
                >
                  <Text style={{ ...styles.tipsText, textDecorationLine: 'underline' }} size={12} color={theme['c-primary-font']}>FAQ</Text>
                </TVButton>
                <View>
                  <Text style={styles.tipsText} size={12}>{t('user_api_note')}</Text>
                </View>
              </View>
            </View>
            <View style={styles.btns}>
              <TVButton
                style={{ ...styles.btn, backgroundColor: theme['c-button-background'] }}
                onPress={handleImportLocal}
              >
                <Text size={14} color={theme['c-button-font']}>{t('user_api_btn_import_local')}</Text>
              </TVButton>
              <TVButton
                style={{ ...styles.btn, backgroundColor: theme['c-button-background'] }}
                onPress={handleImportOnline}
              >
                <Text size={14} color={theme['c-button-font']}>{t('user_api_btn_import_online')}</Text>
              </TVButton>
              <TVButton
                hasTVPreferredFocus
                style={{ ...styles.btn, backgroundColor: theme['c-button-background'] }}
                onPress={handleCancel}
              >
                <Text size={14} color={theme['c-button-font']}>{t('close')}</Text>
              </TVButton>
            </View>
            <ScriptImportExport ref={scriptImportExportRef} />
            <ScriptImportOnline ref={scriptImportOnlineRef} />
          </Dialog>
        ) : null
  )
})


const styles = createStyle({
  content: {
    flexShrink: 1,
    paddingHorizontal: 8,
    paddingTop: 15,
    paddingBottom: 10,
    flexDirection: 'column',
  },
  title: {
    marginBottom: 15,
    textAlign: 'center',
  },
  tips: {
    paddingHorizontal: 7,
    marginTop: 15,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tipsText: {
    marginTop: 8,
    textAlignVertical: 'bottom',
  },
  btns: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 15,
    paddingLeft: 15,
  },
  btn: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderRadius: 4,
    marginRight: 15,
  },
})
