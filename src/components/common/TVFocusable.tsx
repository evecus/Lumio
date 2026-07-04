/**
 * TVFocusable - TV 遥控器焦点高亮统一组件
 *
 * 参照 BiliTV 的 TvFocusableItem + BaseTvCard 实现：
 * - onFocus/onBlur 驱动 focused state，聚焦时显示主题色背景
 * - Pressable 在 Android TV 0.73 上 onFocus 最可靠
 * - 外部可通过 focused 状态控制子元素样式（如文字颜色）
 */
import { useState, type ReactNode } from 'react'
import { Pressable, type PressableProps, type ViewStyle } from 'react-native'
import { useTheme } from '@/store/theme/hook'

export interface TVFocusableProps extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode | ((focused: boolean) => ReactNode)
  style?: ViewStyle | ((focused: boolean) => ViewStyle)
  focusBg?: string          // 自定义聚焦背景色，不传则用主题色
  focusStyle?: ViewStyle    // 额外聚焦时样式
  radius?: number           // 圆角，默认 8
}

export default ({
  children,
  style,
  focusBg,
  focusStyle,
  radius = 8,
  onFocus: propsOnFocus,
  onBlur: propsOnBlur,
  ...props
}: TVFocusableProps) => {
  const theme = useTheme()
  const [focused, setFocused] = useState(false)

  const bg = focusBg ?? theme['c-primary-alpha-100'] ?? 'rgba(77,175,124,0.9)'

  const baseStyle: ViewStyle = {
    borderRadius: radius,
    overflow: 'hidden',
  }

  const activeFocusStyle: ViewStyle = focused ? {
    backgroundColor: bg,
    ...focusStyle,
  } : {}

  const computedStyle = typeof style === 'function'
    ? { ...baseStyle, ...style(focused), ...activeFocusStyle }
    : { ...baseStyle, ...style, ...activeFocusStyle }

  return (
    <Pressable
      style={computedStyle}
      onFocus={(e) => { setFocused(true); propsOnFocus?.(e) }}
      onBlur={(e) => { setFocused(false); propsOnBlur?.(e) }}
      {...props}
    >
      {typeof children === 'function' ? children(focused) : children}
    </Pressable>
  )
}
