import { View } from 'react-native'

import TVButton from '@/components/common/TVButton'
import { type TagInfoItem } from '@/store/songlist/state'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'

export interface TagGroupProps {
  name: string
  list: TagInfoItem[]
  onTagChange: (name: string, id: string) => void
  activeId: string
  isFirstGroup?: boolean
}

export default ({ name, list, onTagChange, activeId, isFirstGroup = false }: TagGroupProps) => {
  const theme = useTheme()
  return (
    <View>
      {
        name
          ? <Text style={styles.tagTypeTitle} color={theme['c-font-label']}>{name}</Text>
          : null
      }
      <View style={styles.tagTypeList}>
        {list.map((item, itemIndex) => {
          const active = activeId == item.id
          // 第一组第一个按钮获得初始焦点，侧边栏打开时遥控器有落点
          const isFirstItem = isFirstGroup && itemIndex === 0
          return (
            <TVButton
              style={{ ...styles.tagButton, backgroundColor: theme['c-button-background'] }}
              key={item.id}
              hasTVPreferredFocus={isFirstItem}
              onPress={active ? undefined : () => { onTagChange(item.name, item.id) }}
              borderRadius={4}
            >
              <Text
                style={[styles.tagButtonText, active && { color: theme['c-primary-font-active'] }]}
                color={active ? theme['c-primary-font-active'] : theme['c-font']}
              >
                {item.name}
              </Text>
            </TVButton>
          )
        })}
      </View>
    </View>
  )
}

const styles = createStyle({
  tagTypeTitle: {
    marginTop: 15,
    marginBottom: 10,
  },
  tagTypeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagButton: {
    borderRadius: 4,
    marginRight: 10,
    marginBottom: 10,
  },
  tagButtonText: {
    fontSize: 13,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
})
