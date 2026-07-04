/**
 * TV 适配版通用按钮
 *
 * 焦点高亮和点击事件全部由原生 TvFocusView 处理：
 * - 焦点边框：onFocusChanged 原生绘制，不依赖 JS 回调
 * - 点击事件：原生 onKeyDown(DPAD_CENTER) → onClick → topPress 事件 → JS onPress
 * - lockHorizontal: true 时，左右键不移焦点，触发 onDirection({direction:'left'|'right'})
 * - 尺寸由 style 控制，wrap_content 不撑开父布局
 * - requestFocus()：主动将焦点推给此 TvFocusView（需原生 Manager 注册 requestFocus command）
 */
import { useRef, useImperativeHandle, forwardRef, useState } from 'react'
import {
  requireNativeComponent,
  UIManager,
  findNodeHandle,
  type ViewProps,
  type View as ViewType,
} from 'react-native'
import { useSettingValue } from '@/store/setting/hook'
import themes from '@/theme/themes/themes'

const TvFocusView = requireNativeComponent<{
  borderRadius?: number
  focusColor?: number | null
  style?: ViewProps['style']
  onPress?: () => void
  onDirection?: (event: { nativeEvent: { direction: 'left' | 'right' } }) => void
  onFocus?: () => void
  onBlur?: () => void
  hasTVPreferredFocus?: boolean
  lockHorizontal?: boolean
  children?: React.ReactNode
}>('TvFocusView')

interface Props {
  onPress?: () => void
  onLongPress?: () => void
  onDirection?: (direction: 'left' | 'right') => void
  onFocus?: () => void
  onBlur?: () => void
  children: React.ReactNode
  style?: ViewProps['style']
  hasTVPreferredFocus?: boolean
  lockHorizontal?: boolean
  disabled?: boolean
  borderRadius?: number
}

export interface TVButtonType {
  measure: (callback: (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => void) => void
  /** 主动将原生焦点推给此 TvFocusView */
  requestFocus: () => void
}

const parseColorToInt = (colorStr: string): number => {
  // 解析 "rgb(r, g, b)" 或 "rgba(r, g, b, a)" 格式
  const rgba = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/)
  if (rgba) {
    const r = parseInt(rgba[1], 10)
    const g = parseInt(rgba[2], 10)
    const b = parseInt(rgba[3], 10)
    const a = rgba[4] !== undefined ? Math.round(parseFloat(rgba[4]) * 255) : 255
    // Android ARGB 整数
    return ((a & 0xff) << 24) | ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff)
  }
  // 默认蓝田生玉
  return 0xFF3498DB
}

const useFocusColor = () => {
  const focusColorId = useSettingValue('theme.focusColorId')
  const theme = themes.find(t => t.id === focusColorId) ?? themes.find(t => t.id === 'blue')!
  const colorStr = theme.config.themeColors['c-theme']
  // 提取 rgb 分量，生成半透明背景色
  const rgba = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  const bgColor = rgba
    ? `rgba(${rgba[1]}, ${rgba[2]}, ${rgba[3]}, 0)`
    : 'rgba(52, 152, 219, 0)'
  return { focusColor: parseColorToInt(colorStr), bgColor }
}

export default forwardRef<TVButtonType, Props>((((({
  onPress,
  onLongPress,
  onDirection,
  onFocus,
  onBlur,
  children,
  style,
  hasTVPreferredFocus,
  lockHorizontal,
  disabled,
  borderRadius = 8,
}, ref) => {
  const viewRef = useRef<ViewType>(null)
  const { focusColor, bgColor } = useFocusColor()
  const [isFocused, setIsFocused] = useState(false)

  useImperativeHandle(ref, () => ({
    measure(callback) {
      viewRef.current?.measure(callback)
    },
    requestFocus() {
      const node = findNodeHandle(viewRef.current)
      if (node) {
        UIManager.dispatchViewManagerCommand(
          node,
          // @ts-ignore - command registered in TvFocusableLayoutManager.getCommandsMap()
          UIManager.getViewManagerConfig('TvFocusView').Commands.requestFocus,
          [],
        )
      }
    },
  }))

  const handleFocus = () => {
    setIsFocused(true)
    onFocus?.()
  }

  const handleBlur = () => {
    setIsFocused(false)
    onBlur?.()
  }

  return (
    <TvFocusView
      onPress={disabled ? undefined : onPress}
      onDirection={onDirection ? (e) => onDirection(e.nativeEvent.direction) : undefined}
      onFocus={handleFocus}
      onBlur={handleBlur}
      hasTVPreferredFocus={hasTVPreferredFocus}
      lockHorizontal={lockHorizontal}
      borderRadius={borderRadius}
      focusColor={focusColor}
      style={[{ opacity: disabled ? 0.3 : 1 }, isFocused && { backgroundColor: bgColor }, style]}
      ref={viewRef as any}
    >
      {children}
    </TvFocusView>
  )
}) as any)))
