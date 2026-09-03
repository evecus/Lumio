import { memo, useState, useEffect, useRef } from 'react'
import { View, StyleSheet } from 'react-native'
import type { TextInputProps } from 'react-native'
import TVInputItem, { type TVInputItemType } from '@/components/common/TVInputItem'
import Text from '@/components/common/Text'

export interface InputItemProps extends Omit<TextInputProps, 'style'> {
  value: string
  label: string
  onChanged: (text: string, callback: (value: string) => void) => void
}

export default memo(({ value, label, onChanged, ...props }: InputItemProps) => {
  const [text, setText] = useState(value)
  const textRef = useRef(value)
  const isMountRef = useRef(false)
  const inputRef = useRef<TVInputItemType>(null)

  useEffect(() => {
    isMountRef.current = true
    return () => { isMountRef.current = false }
  }, [])

  useEffect(() => {
    if (value !== text) {
      const v = String(value)
      setText(v)
      textRef.current = v
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const handleChangeText = (t: string) => {
    setText(t)
    textRef.current = t
  }

  const handleSubmit = (t: string) => {
    onChanged?.(t, (newValue: string) => {
      if (!isMountRef.current) return
      const v = String(newValue)
      setText(v)
      textRef.current = v
    })
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label} size={14}>{label}</Text>
      <TVInputItem
        ref={inputRef}
        value={text}
        onChangeText={handleChangeText}
        onSubmit={handleSubmit}
        wrapStyle={styles.inputWrap}
        inputStyle={styles.input}
        {...props}
      />
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    paddingLeft: 25,
    marginBottom: 15,
  },
  label: {
    marginBottom: 2,
  },
  inputWrap: {
    maxWidth: 300,
  },
  input: {
    maxWidth: 300,
  },
})
