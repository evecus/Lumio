/**
 * 音乐平台显示顺序设置（TV 端）
 *
 * 首页“歌单/排行榜”与搜索页的平台 Tab 顺序，默认由 musicSdk 内置顺序决定。
 * 这里允许用户通过遥控器上/下移按钮自定义顺序，设置保存后，
 * 下次进入首页/搜索页时生效（两处 store 在模块加载时读取顺序，非实时响应）。
 */
import { memo, useCallback, useMemo } from 'react'

import { View } from 'react-native'

import SubTitle from '../../components/SubTitle'
import Text from '@/components/common/Text'
import TVButton from '@/components/common/TVButton'
import { createStyle } from '@/utils/tools'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { useSourceLabel } from '@/utils/hooks/useSourceLabel'
import musicSdk from '@/utils/musicSdk'
import { setFocusZone } from '@/screens/Home/TV/index'

const allSourceIds = musicSdk.sources.map(s => s.id) as LX.OnlineSource[]

const useOrderedSourceIds = (): LX.OnlineSource[] => {
  const savedOrder = useSettingValue('common.sourceOrder')
  return useMemo(() => {
    if (!savedOrder.length) return allSourceIds
    const remaining = new Set(allSourceIds)
    const ordered: LX.OnlineSource[] = []
    for (const id of savedOrder) {
      if (!remaining.has(id)) continue
      ordered.push(id)
      remaining.delete(id)
    }
    for (const id of allSourceIds) {
      if (remaining.has(id)) ordered.push(id)
    }
    return ordered
  }, [savedOrder])
}

const moveItem = (list: LX.OnlineSource[], index: number, offset: -1 | 1): LX.OnlineSource[] => {
  const targetIndex = index + offset
  if (targetIndex < 0 || targetIndex >= list.length) return list
  const newList = [...list]
  const tmp = newList[index]
  newList[index] = newList[targetIndex]
  newList[targetIndex] = tmp
  return newList
}

const Item = ({ id, index, total, moveUp, moveDown }: {
  id: LX.OnlineSource
  index: number
  total: number
  moveUp: (index: number) => void
  moveDown: (index: number) => void
}) => {
  const t = useI18n()
  const theme = useTheme()
  const getLabel = useSourceLabel()

  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{getLabel(id)}</Text>
      <View style={styles.rowBtns}>
        <TVButton
          style={[styles.moveBtn, { backgroundColor: theme['c-button-background'] }]}
          disabled={index === 0}
          onPress={() => { moveUp(index) }}
          onFocus={() => { setFocusZone('content') }}
          borderRadius={4}
        >
          <Text size={14} color={index === 0 ? theme['c-500'] : theme['c-button-font']}>
            {t('setting_basic_source_order_up')}
          </Text>
        </TVButton>
        <TVButton
          style={[styles.moveBtn, { backgroundColor: theme['c-button-background'] }]}
          disabled={index === total - 1}
          onPress={() => { moveDown(index) }}
          onFocus={() => { setFocusZone('content') }}
          borderRadius={4}
        >
          <Text size={14} color={index === total - 1 ? theme['c-500'] : theme['c-button-font']}>
            {t('setting_basic_source_order_down')}
          </Text>
        </TVButton>
      </View>
    </View>
  )
}

export default memo(() => {
  const t = useI18n()
  const orderedIds = useOrderedSourceIds()

  const handleMoveUp = useCallback((index: number) => {
    const newOrder = moveItem(orderedIds, index, -1)
    updateSetting({ 'common.sourceOrder': newOrder })
  }, [orderedIds])

  const handleMoveDown = useCallback((index: number) => {
    const newOrder = moveItem(orderedIds, index, 1)
    updateSetting({ 'common.sourceOrder': newOrder })
  }, [orderedIds])

  return (
    <SubTitle title={t('setting_basic_source_order')}>
      <Text style={styles.desc} size={13}>{t('setting_basic_source_order_tip')}</Text>
      <View style={styles.list}>
        {
          orderedIds.map((id, index) => (
            <Item
              key={id}
              id={id}
              index={index}
              total={orderedIds.length}
              moveUp={handleMoveUp}
              moveDown={handleMoveDown}
            />
          ))
        }
      </View>
    </SubTitle>
  )
})

const styles = createStyle({
  desc: {
    marginBottom: 8,
  },
  list: {
    flexGrow: 0,
    flexShrink: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowLabel: {
    width: 110,
  },
  rowBtns: {
    flexDirection: 'row',
  },
  moveBtn: {
    paddingLeft: 14,
    paddingRight: 14,
    paddingTop: 6,
    paddingBottom: 6,
    borderRadius: 4,
    marginRight: 10,
  },
})
