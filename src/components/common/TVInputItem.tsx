/**
 * TVInputItem - TV 遥控器专用通用输入框组件
 *
 * 核心原理：
 * TvFocusView 设置了 FOCUS_BLOCK_DESCENDANTS，且 onLayout 为空体，
 * 子 View 既无法获得焦点也无法正常布局，所以 TextInput 不能嵌套在 TVButton 内部。
 *
 * 正确方案：普通 View 作容器，TVButton 和 TextInput 作兄弟节点，
 * 通过 StyleSheet.absoluteFillObject 让两者视觉完全重叠：
 *   - TVButton（zIndex:1）：遥控器焦点框 + OK键触发 TextInput.focus()
 *   - TextInput（zIndex:2）：独立参与焦点树，负责实际输入和弹输入法
 *   - 键盘收起后：仅当本实例正在编辑时，才调用 tvBtnRef.requestFocus() 把焦点还回来
 *
 * 注意事项：
 * onBlur 先于 keyboardDidHide 触发，所以 isEditingRef 必须在 keyboardDidHide 里才置 false，
 * 不能在 onBlur 里置 false，否则 keyboardDidHide 判断时已经是 false，requestFocus 不会执行。
 */
import { useRef, useState, useCallback, forwardRef, useImperativeHandle, useEffect } from 'react'
import { TextInput, View, Keyboard, StyleSheet, type TextInputProps } from 'react-native'
import TVButton, { type TVButtonType } from '@/components/common/TVButton'
import { useTheme } from '@/store/theme/hook'

export interface TVInputItemProps extends Omit<TextInputProps, 'style'> {
  value: string
  onChangeText: (text: string) => void
  inputStyle?: TextInputProps['style']
  wrapStyle?: object
  /** 键盘收起/失焦时触发，可用于保存值 */
  onSubmit?: (text: string) => void
}

export interface TVInputItemType {
  focus: () => void
  blur: () => void
  getValue: () => string
}

export default forwardRef<TVInputItemType, TVInputItemProps>((
  { value, onChangeText, inputStyle, wrapStyle, onSubmit, hasTVPreferredFocus, ...props },
  ref,
) => {
  const theme = useTheme()
  const tvBtnRef = useRef<TVButtonType>(null)
  const textInputRef = useRef<TextInput>(null)
  const [tvFocused, setTvFocused] = useState(false)
  const valueRef = useRef(value)
  // isEditingRef：TextInput focus 时置 true，keyboardDidHide 时置 false
  // 注意：不能在 onBlur 里置 false，因为 onBlur 早于 keyboardDidHide 触发
  const isEditingRef = useRef(false)
  valueRef.current = value

  useImperativeHandle(ref, () => ({
    focus() { textInputRef.current?.focus() },
    blur() { textInputRef.current?.blur() },
    getValue() { return valueRef.current },
  }))

  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', () => {
      if (!isEditingRef.current) return  // 不是本实例在编辑，忽略
      isEditingRef.current = false       // 在这里才置 false，不在 onBlur 里
      textInputRef.current?.blur()
      setTimeout(() => {
        tvBtnRef.current?.requestFocus()
      }, 50)
    })
    return () => sub.remove()
  }, [])

  const handleTVPress = useCallback(() => {
    textInputRef.current?.focus()
  }, [])

  const handleTVFocus = useCallback(() => setTvFocused(true), [])
  const handleTVBlur = useCallback(() => setTvFocused(false), [])

  const handleInputFocus = useCallback(() => {
    isEditingRef.current = true
  }, [])

  // onBlur 里只做保存，不改 isEditingRef（让 keyboardDidHide 来改）
  const handleInputBlur = useCallback(() => {
    onSubmit?.(valueRef.current)
  }, [onSubmit])

  const borderColor = tvFocused
    ? (theme['c-primary'] ?? '#4daf7c')
    : 'transparent'

  return (
    <View style={[styles.container, wrapStyle as any]}>
      <TVButton
        ref={tvBtnRef}
        style={[StyleSheet.absoluteFillObject, styles.tvButton, { borderColor }]}
        onPress={handleTVPress}
        onFocus={handleTVFocus}
        onBlur={handleTVBlur}
        hasTVPreferredFocus={hasTVPreferredFocus}
        borderRadius={4}
      >
        <View />
      </TVButton>

      <TextInput
        ref={textInputRef}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        autoCapitalize="none"
        autoComplete="off"
        style={[
          StyleSheet.absoluteFillObject,
          styles.input,
          {
            color: theme['c-font'],
            backgroundColor: theme['c-primary-input-background'],
          },
          inputStyle,
        ]}
        placeholderTextColor={theme['c-primary-dark-100-alpha-600']}
        selectionColor={theme['c-primary-light-100-alpha-300']}
        {...props}
      />
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    height: 42,
  },
  tvButton: {
    borderWidth: 2,
    borderRadius: 4,
    zIndex: 1,
  },
  input: {
    zIndex: 2,
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 0,
    paddingBottom: 0,
    fontSize: 14,
    borderRadius: 4,
  },
})
