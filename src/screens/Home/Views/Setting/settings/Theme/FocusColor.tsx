import { memo, useCallback } from 'react'
import { View } from 'react-native'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { updateSetting } from '@/core/common'
import SubTitle from '../../components/SubTitle'
import themes from '@/theme/themes/themes'
import Text from '@/components/common/Text'
import TVButton from '@/components/common/TVButton'
import { createStyle } from '@/utils/tools'
import { scaleSizeH } from '@/utils/pixelRatio'

const ITEM_HEIGHT = 62
const COLOR_ITEM_HEIGHT = 36
const IMAGE_HEIGHT = 29

const FocusColorItem = ({ id, name, color, isActive, onSelect }: {
  id: string
  name: string
  color: string
  isActive: boolean
  onSelect: (id: string) => void
}) => {
  const theme = useTheme()
  return (
    <TVButton
      style={{ ...styles.item, width: scaleSizeH(ITEM_HEIGHT) } as any}
      onPress={() => { onSelect(id) }}
      borderRadius={8}
    >
      <View style={styles.itemInner}>
        <View style={{ ...styles.colorContent, width: scaleSizeH(COLOR_ITEM_HEIGHT), borderColor: isActive ? color : 'transparent' }}>
          <View style={{ ...styles.imageContent, width: scaleSizeH(IMAGE_HEIGHT), backgroundColor: color }} />
        </View>
        <Text style={styles.name} size={12} color={isActive ? color : theme['c-font']} numberOfLines={1}>{name}</Text>
      </View>
    </TVButton>
  )
}

export default memo(() => {
  const t = useI18n()
  const focusColorId = useSettingValue('theme.focusColorId')

  const handleSelect = useCallback((id: string) => {
    updateSetting({ 'theme.focusColorId': id })
  }, [])

  return (
    <SubTitle title={t('setting_basic_focus_color')}>
      <View style={styles.list}>
        {themes.map(({ id, config }) => (
          <FocusColorItem
            key={id}
            id={id}
            name={t(`theme_${id}`)}
            color={config.themeColors['c-theme']}
            isActive={focusColorId === id}
            onSelect={handleSelect}
          />
        ))}
      </View>
    </SubTitle>
  )
})

const styles = createStyle({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 5,
  },
  item: {
    alignItems: 'center',
  },
  itemInner: {
    alignItems: 'center',
  },
  colorContent: {
    height: COLOR_ITEM_HEIGHT,
    borderRadius: 4,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContent: {
    height: IMAGE_HEIGHT,
    borderRadius: 4,
  },
  name: {
    marginTop: 2,
  },
})
