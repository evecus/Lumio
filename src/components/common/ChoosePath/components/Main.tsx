import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { createStyle, getRowInfo } from '@/utils/tools'
import { useEffect, useRef, useState } from 'react'
import { View, FlatList } from 'react-native'

import ListItem, { type PathItem } from './ListItem'
import LoadingMask, { type LoadingMaskType } from '@/components/common/LoadingMask'


export default ({ list, loading, onSetPath, toParentDir }: {
  list: PathItem[]
  loading: boolean
  onSetPath: (item: PathItem) => void
  toParentDir: () => void
}) => {
  const t = useI18n()
  const theme = useTheme()
  const loadingMaskRef = useRef<LoadingMaskType>(null)
  const rowInfo = useRef(getRowInfo('full'))
  const fullRow = useRef({ rowNum: undefined, rowWidth: '100%' } as const)
  // 每次 list 变化递增，作为"上一级"的 key，强制重新挂载以触发 onAttachedToWindow
  const [parentKey, setParentKey] = useState(0)

  useEffect(() => {
    loadingMaskRef.current?.setVisible(loading)
  }, [loading])

  useEffect(() => {
    setParentKey(k => k + 1)
  }, [list])

  return (
    <View style={styles.main}>
      <View style={{ backgroundColor: theme['c-primary-light-700-alpha-900'] }}>
        {/* key 变化 → 组件重新挂载 → onAttachedToWindow 触发 → hasTVPreferredFocus=true 生效 */}
        <ListItem
          key={parentKey}
          item={{
            name: '..',
            desc: t('parent_dir_name'),
            isDir: true,
            path: '',
          }}
          rowInfo={fullRow.current}
          onPress={toParentDir}
          hasTVPreferredFocus
        />
      </View>
      <FlatList
        keyboardShouldPersistTaps={'always'}
        style={styles.list}
        data={list}
        numColumns={rowInfo.current.rowNum}
        renderItem={({ item }) => (
          <ListItem item={item} rowInfo={rowInfo.current} onPress={onSetPath} />
        )}
        keyExtractor={item => item.path + '/' + item.name}
        removeClippedSubviews={false}
      />
      <LoadingMask ref={loadingMaskRef} />
    </View>
  )
}


const styles = createStyle({
  main: {
    flexGrow: 1,
    flexShrink: 1,
    overflow: 'hidden',
  },
  list: {
    flexGrow: 1,
    flexShrink: 1,
  },
})
