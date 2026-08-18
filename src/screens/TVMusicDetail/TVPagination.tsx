/**
 * 底部翻页组件  < 1 >
 */
import { memo } from 'react'
import { View, StyleSheet } from 'react-native'
import TVButton from '@/components/common/TVButton'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'

interface Props {
  page: number        // 当前页（1-based）
  maxPage: number
  onPrev: () => void
  onNext: () => void
}

export default memo(({ page, maxPage, onPrev, onNext }: Props) => {
  const theme = useTheme()
  const canPrev = page > 1
  const canNext = page < maxPage

  return (
    <View style={styles.root}>
      <TVButton
        style={styles.btn}
        borderRadius={6}
        onPress={onPrev}
        disabled={!canPrev}
      >
        <Text size={20} color={canPrev ? theme['c-font'] : theme['c-font-label']}>{'‹'}</Text>
      </TVButton>

      <Text style={styles.pageText} size={15} color={theme['c-font']}>
        {page}
      </Text>

      <TVButton
        style={styles.btn}
        borderRadius={6}
        onPress={onNext}
        disabled={!canNext}
      >
        <Text size={20} color={canNext ? theme['c-font'] : theme['c-font-label']}>{'›'}</Text>
      </TVButton>
    </View>
  )
})

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 16,
    flexShrink: 0,
  },
  btn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 48,
    alignItems: 'center',
  },
  pageText: {
    minWidth: 32,
    textAlign: 'center',
  },
})
