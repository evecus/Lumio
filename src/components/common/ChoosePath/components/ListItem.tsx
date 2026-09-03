import { memo } from 'react'
import { View } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import TVButton from '@/components/common/TVButton'
import { type RowInfo, createStyle } from '@/utils/tools'

export interface PathItem {
  name: string
  path: string
  isDir: boolean
  mtime?: Date
  desc?: string
  size?: number
  sizeText?: string
  disabled?: boolean
}

export default memo(({ item, onPress, rowInfo, hasTVPreferredFocus }: {
  item: PathItem
  onPress: (item: PathItem) => void
  rowInfo: RowInfo
  hasTVPreferredFocus?: boolean
}) => {
  const theme = useTheme()

  return (
    <View style={{ ...styles.listItem, width: rowInfo.rowWidth }} onStartShouldSetResponder={() => true}>
      {
        item.disabled ? (
          <View style={{ ...styles.listItem, opacity: 0.3 }}>
            <View style={styles.itemInfo}>
              <Text style={styles.listItemTitleText}>{item.name}</Text>
              <Text style={styles.listItemDesc} size={12} color={theme['c-font-label']} numberOfLines={1}>{item.mtime ? new Date(item.mtime).toLocaleString() : item.desc}</Text>
            </View>
            {
              item.isDir ? null
                : <Text style={styles.size} size={12} color={theme['c-font-label']}>{item.sizeText}</Text>
            }
          </View>
        ) : (
          <TVButton
            style={styles.listItemTouchable}
            hasTVPreferredFocus={hasTVPreferredFocus}
            onPress={() => { onPress(item) }}
          >
            <View style={styles.listItemInner}>
              <View style={styles.itemInfo}>
                <Text style={styles.listItemTitleText}>{item.name}</Text>
                <Text style={styles.listItemDesc} size={12} color={theme['c-font-label']} numberOfLines={1}>{item.mtime ? new Date(item.mtime).toLocaleString() : item.desc}</Text>
              </View>
              {
                item.isDir
                  ? <Icon name="chevron-right" color={theme['c-primary-light-100-alpha-600']} size={18} />
                  : <Text style={styles.size} size={12} color={theme['c-font-label']}>{item.sizeText}</Text>
              }
            </View>
          </TVButton>
        )
      }
    </View>
  )
})

const styles = createStyle({
  listItem: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    paddingLeft: 10,
    paddingRight: 10,
    alignItems: 'center',
  },
  listItemTouchable: {
    flex: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  listItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 0,
    paddingRight: 0,
  },
  itemInfo: {
    flexGrow: 1,
    flexShrink: 1,
    paddingTop: 12,
    paddingBottom: 12,
  },
  listItemTitleText: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexGrow: 0,
    flexShrink: 1,
  },
  listItemDesc: {
    paddingTop: 2,
  },
  size: {
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
})
