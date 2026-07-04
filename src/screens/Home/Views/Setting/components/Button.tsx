import { memo } from 'react'

import TVButton from '@/components/common/TVButton'
import { setFocusZone } from '@/screens/Home/TV/index'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { type ViewProps } from 'react-native'

interface ButtonProps {
  disabled?: boolean
  onPress?: () => void
  children?: React.ReactNode
  hasTVPreferredFocus?: boolean
  style?: ViewProps['style']
}

export default memo(({ disabled, onPress, children, hasTVPreferredFocus, style }: ButtonProps) => {
  const theme = useTheme()

  return (
    <TVButton
      style={[{ ...styles.button, backgroundColor: theme['c-button-background'] }, style]}
      onPress={onPress}
      onFocus={() => setFocusZone('content')}
      disabled={disabled}
      hasTVPreferredFocus={hasTVPreferredFocus}
      borderRadius={4}
    >
      <Text size={14} color={theme['c-button-font']}>{children}</Text>
    </TVButton>
  )
})

const styles = createStyle({
  button: {
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 5,
    paddingBottom: 5,
    borderRadius: 4,
    marginRight: 10,
  },
})
