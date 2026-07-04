import { memo, forwardRef, useImperativeHandle } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import Main from '@/screens/Home/Views/Setting/Main'
import { setFocusZone } from '../index'

export interface TVSettingPanelType {
  focusTopBar: () => void
}

export default memo(forwardRef<TVSettingPanelType>((_, ref) => {
  useImperativeHandle(ref, () => ({
    focusTopBar() {},
  }))

  return (
    <View style={s.root}>
      <ScrollView
        style={s.content}
        keyboardShouldPersistTaps="always"
        onFocus={() => setFocusZone('content')}
      >
        <View style={s.contentInner}>
          <Main />
        </View>
      </ScrollView>
    </View>
  )
}))

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  contentInner: { paddingHorizontal: 20, paddingVertical: 15 },
})
