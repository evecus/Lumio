import { memo, useRef, useState } from 'react'
import { View, TouchableHighlight, FlatList, type FlatListProps } from 'react-native'

import { Icon } from '@/components/common/Icon'

import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { scaleSizeH } from '@/utils/pixelRatio'
import { SETTING_SCREENS, type SettingScreenIds } from '../Main'
import { useI18n } from '@/lang'

type FlatListType = FlatListProps<SettingScreenIds>

const ITEM_HEIGHT = scaleSizeH(40) * 1.2

const ListItem = memo(({ id, activeId, onPress }: {
  onPress: (item: SettingScreenIds) => void
  activeId: string
  id: SettingScreenIds
}) => {
  const theme = useTheme()
  const t = useI18n()
  const active = activeId == id

  return (
    <View style={{
      ...styles.listItem,
      height: ITEM_HEIGHT,
      borderLeftWidth: active ? 3 : 0,
      borderLeftColor: active ? theme['c-primary'] : 'transparent',
      backgroundColor: active ? (theme['c-primary-alpha-100'] ?? 'rgba(255,255,255,0.06)') : 'transparent',
    }}>
      {active
        ? <Icon style={styles.listActiveIcon} name="chevron-right" size={13} color={theme['c-primary-font']} />
        : null
      }
      <TouchableHighlight
        style={styles.listName}
        underlayColor={theme['c-primary-alpha-100'] ?? 'rgba(255,255,255,0.12)'}
        onPress={() => { onPress(id) }}
      >
        <View style={styles.listNameInner}>
          <Text numberOfLines={1} size={15} color={active ? theme['c-primary-font'] : theme['c-font']}>{t(`setting_${id}`)}</Text>
        </View>
      </TouchableHighlight>
    </View>
  )
}, (prevProps, nextProps) => {
  return !!(prevProps.id === nextProps.id &&
    prevProps.activeId != nextProps.id &&
    nextProps.activeId != nextProps.id
  )
})


export default ({ onChangeId }: {
  onChangeId: (id: SettingScreenIds) => void
}) => {
  const flatListRef = useRef<FlatList>(null)
  const [activeId, setActiveId] = useState(global.lx.settingActiveId)

  const handleChangeId = (id: SettingScreenIds) => {
    onChangeId(id)
    setActiveId(id)
    global.lx.settingActiveId = id
  }

  const renderItem: FlatListType['renderItem'] = ({ item }) => (
    <ListItem
      key={item}
      id={item}
      activeId={activeId}
      onPress={handleChangeId}
    />
  )
  const getkey: FlatListType['keyExtractor'] = item => item
  const getItemLayout: FlatListType['getItemLayout'] = (data, index) => {
    return { length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }
  }

  return (
    <FlatList
      ref={flatListRef}
      style={styles.container}
      data={SETTING_SCREENS}
      maxToRenderPerBatch={9}
      windowSize={9}
      removeClippedSubviews={false}
      initialNumToRender={18}
      renderItem={renderItem}
      keyExtractor={getkey}
      getItemLayout={getItemLayout}
    />
  )
}


const styles = createStyle({
  container: {
    flexShrink: 1,
    flexGrow: 0,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
    paddingLeft: 2,
    overflow: 'hidden',
  },
  listActiveIcon: {
    marginRight: 4,
  },
  listName: {
    height: '100%',
    justifyContent: 'center',
    flexGrow: 1,
    flexShrink: 1,
    borderRadius: 5,
    overflow: 'hidden',
  },
  listNameInner: {
    paddingLeft: 8,
    paddingRight: 5,
    height: '100%',
    justifyContent: 'center',
  },
})
