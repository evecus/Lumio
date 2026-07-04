import { memo } from 'react'
import { View, StyleSheet } from 'react-native'
import TVButton from '@/components/common/TVButton'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'

export default memo(({ onConfirm, onHide, dirOnly }: {
  onConfirm: () => void
  onHide: () => void
  dirOnly: boolean
}) => {
  const t = useI18n()
  const theme = useTheme()

  return (
    <View style={{ ...styles.footer, backgroundColor: theme['c-content-background'] }}>
      <TVButton style={{ ...styles.footerBtn, width: dirOnly ? '50%' : '100%' }} onPress={onHide}>
        <Text color={theme['c-button-font']}>{t('cancel')}</Text>
      </TVButton>
      {dirOnly
        ? <TVButton style={styles.footerBtn} onPress={onConfirm}>
            <Text color={theme['c-button-font']}>{t('confirm')}</Text>
          </TVButton>
        : null
      }
    </View>
  )
})

const styles = StyleSheet.create({
  footer: {
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: 'row',
    // borderTopWidth: BorderWidths.normal,
    elevation: 8,
  },
  footerBtn: {
    width: '50%',
    paddingTop: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },
})
