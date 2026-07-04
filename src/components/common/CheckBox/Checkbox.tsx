import * as React from 'react'
import {
  Animated,
  type GestureResponderEvent,
  StyleSheet,
  View,
} from 'react-native'

import { Icon } from '../Icon'
import { createStyle } from '@/utils/tools'
import { scaleSizeW } from '@/utils/pixelRatio'

export interface Props {
  status: 'checked' | 'unchecked' | 'indeterminate'
  disabled?: boolean
  onPress?: (e: GestureResponderEvent) => void
  size?: number
  tintColors: {
    true: string
    false: string
  }
}

const ANIMATION_DURATION = 200
const PADDING = scaleSizeW(4)

const Checkbox = ({
  status,
  disabled,
  size = 1,
  onPress,
  tintColors,
  ...rest
}: Props) => {
  const checked = status === 'checked'
  const indeterminate = status === 'indeterminate'

  const icon = indeterminate
    ? 'minus-box'
    : 'checkbox-marked'

  const { current: scaleAnim } = React.useRef<Animated.Value>(
    new Animated.Value(checked ? 1 : 0),
  )

  const isFirstRendering = React.useRef<boolean>(true)

  React.useEffect(() => {
    if (isFirstRendering.current) {
      isFirstRendering.current = false
      return
    }

    Animated.timing(scaleAnim, {
      toValue: checked ? 1 : 0,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start()
  }, [checked, scaleAnim])

  return (
    <View
      style={{
        padding: PADDING,
        marginLeft: -PADDING,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon
        allowFontScaling={false}
        name="checkbox-blank-outline"
        size={24 * size}
        color={tintColors.false}
      />
      <View style={[StyleSheet.absoluteFill, styles.fillContainer]}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Icon
            allowFontScaling={false}
            name={icon}
            size={24 * size}
            color={tintColors.true}
          />
        </Animated.View>
      </View>
    </View>
  )
}

Checkbox.displayName = 'Checkbox'

const styles = createStyle({
  fillContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default Checkbox
