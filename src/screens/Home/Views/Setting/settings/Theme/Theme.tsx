import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { View, type ImageSourcePropType } from 'react-native'
import { setTheme } from '@/core/theme'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'

import SubTitle from '../../components/SubTitle'
import { BG_IMAGES, getAllThemes, type LocalTheme } from '@/theme/themes'
import Text from '@/components/common/Text'
import TVButton from '@/components/common/TVButton'
import { createStyle } from '@/utils/tools'
import { scaleSizeH } from '@/utils/pixelRatio'
import { Icon } from '@/components/common/Icon'
import ImageBackground from '@/components/common/ImageBackground'

const useActive = (id: string) => {
  const activeThemeId = useSettingValue('theme.id')
  const isActive = useMemo(() => activeThemeId == id, [activeThemeId, id])
  return isActive
}

const ThemeItem = ({ id, name, color, image, setTheme, showAll }: {
  id: string
  name: string
  color: string
  showAll: boolean
  image?: ImageSourcePropType
  setTheme: (id: string) => void
}) => {
  const theme = useTheme()
  const isActive = useActive(id)

  return (
    showAll || isActive ? (
      <TVButton style={{ ...styles.item, width: scaleSizeH(ITEM_HEIGHT) } as any} onPress={() => { setTheme(id) }} borderRadius={8}>
        <View style={styles.itemInner}>
          <View style={{ ...styles.colorContent, width: scaleSizeH(COLOR_ITEM_HEIGHT), borderColor: isActive ? color : 'transparent' }}>
            {
              image
                ? <ImageBackground style={{ ...styles.imageContent, width: scaleSizeH(IMAGE_HEIGHT), backgroundColor: color }}
                    imageStyle={{ borderRadius: 4 }}
                    source={image} />
                : <View style={{ ...styles.imageContent, width: scaleSizeH(IMAGE_HEIGHT), backgroundColor: color }}></View>
              }
          </View>
          <Text style={styles.name} size={12} color={isActive ? color : theme['c-font']} numberOfLines={1}>{name}</Text>
        </View>
      </TVButton>
    ) : null
  )
}

const MoreBtn = ({ showAll, setShowAll }: {
  showAll: boolean
  setShowAll: (showAll: boolean) => void
}) => {
  const theme = useTheme()
  const t = useI18n()

  return (
    showAll ? null
      : (
          <TVButton style={{ ...styles.moreBtn, borderRadius: 6, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4 }}
          onPress={() => { setShowAll(!showAll) }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text size={14} color={theme['c-primary-font']} numberOfLines={1}>{t('setting_basic_theme_more_btn_show')}</Text>
            <Icon name="chevron-right" size={12} color={theme['c-primary-font']} />
          </View>
        </TVButton>
        )

  )
}

interface ThemeInfo {
  themes: Readonly<LocalTheme[]>
  userThemes: LX.Theme[]
  dataPath: string
}
const initInfo: ThemeInfo = { themes: [], userThemes: [], dataPath: '' }
export default memo(() => {
  const [showAll, setShowAll] = useState(true)
  const t = useI18n()
  const [themeInfo, setThemeInfo] = useState(initInfo)
  const setThemeId = useCallback((id: string) => {
    requestAnimationFrame(() => {
      setTheme(id)
    })
  }, [])

  useEffect(() => {
    void getAllThemes().then(setThemeInfo)
  }, [])

  return (
    <SubTitle title={t('setting_basic_theme')}>
      <View style={styles.list}>
        {
          themeInfo.themes.map(({ id, config }) => {
            return <ThemeItem
              key={id}
              color={config.themeColors['c-theme']}
              image={config.extInfo['bg-image'] ? BG_IMAGES[config.extInfo['bg-image']] : undefined}
              showAll={showAll}
              id={id}
              name={t(`theme_${id}`)}
              setTheme={setThemeId} />
          })
        }
        {
          themeInfo.userThemes.map(({ id, name, config }) => {
            return <ThemeItem
              key={id}
              color={config.themeColors['c-theme']}
              // image={undefined}
              showAll={showAll}
              id={id}
              name={name}
              setTheme={setThemeId} />
          })
        }
        <MoreBtn showAll={showAll} setShowAll={setShowAll} />
      </View>
    </SubTitle>
  )
})

const ITEM_HEIGHT = 62
const COLOR_ITEM_HEIGHT = 36
const IMAGE_HEIGHT = 29
const styles = createStyle({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 5,
  },
  item: {
    // marginRight: 15,
    alignItems: 'center',
    // marginTop: 5,
    // backgroundColor: 'rgba(0,0,0,0.2)',
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
    // backgroundColor: 'rgba(0,0,0,0.2)',
  },
  imageContent: {
    height: IMAGE_HEIGHT,
    borderRadius: 4,
    // elevation: 1,
  },
  name: {
    marginTop: 2,
  },
  moreBtn: {
    marginLeft: 10,
    alignItems: 'center',
  },
})
