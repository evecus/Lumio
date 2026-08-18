/**
 * TV 适配版 Button
 *
 * 改用 TouchableHighlight 替代 Pressable，原因：
 * - TouchableHighlight 的 underlayColor 是 Android TV 遥控器 D-Pad 聚焦时
 *   最稳定可靠的高亮方案，与系统焦点系统深度集成
 * - Pressable 的 onFocus/onBlur 在部分 Android TV 固件上存在不触发的问题
 * - underlayColor 显示为实色背景块（类似图中绿色阴影），视觉反馈明显
 */
import { useTheme } from '@/store/theme/hook'
import { useRef, useImperativeHandle, forwardRef } from 'react'
import {
  TouchableHighlight,
  View,
  type TouchableHighlightProps,
  type ViewProps,
  type View as ViewType,
} from 'react-native'

export interface BtnProps extends Omit<TouchableHighlightProps, 'style'> {
  ripple?: never  // 保持接口兼容，TouchableHighlight 用 underlayColor 替代
  style?: ViewProps['style']
  onChangeText?: (value: string) => void
  onClearText?: () => void
  children: React.ReactNode
}

export interface BtnType {
  measure: (callback: (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => void) => void
}

export default forwardRef<BtnType, BtnProps>(({ disabled, children, style, underlayColor: propsUnderlayColor, ...props }, ref) => {
  const theme = useTheme()
  const btnRef = useRef<ViewType>(null)

  // TV 遥控器聚焦高亮色：用主题主色 90% 不透明度，视觉上是明显的实色块
  const underlayColor = propsUnderlayColor ?? theme['c-primary-alpha-100'] ?? 'rgba(77,175,124,0.9)'

  useImperativeHandle(ref, () => ({
    measure(callback) {
      btnRef.current?.measure(callback)
    },
  }))

  return (
    <TouchableHighlight
      underlayColor={underlayColor}
      disabled={disabled}
      style={[{ opacity: disabled ? 0.3 : 1, borderRadius: 4, overflow: 'hidden' }, style as any]}
      {...props}
      ref={btnRef as any}
    >
      {/* TouchableHighlight 要求单个子节点，用 View 包裹 */}
      <View style={{ borderRadius: 4 }}>
        {children}
      </View>
    </TouchableHighlight>
  )
})
