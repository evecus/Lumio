import { memo, useRef } from 'react'
import { View, StyleSheet, type ViewStyle } from 'react-native'

// 黑色圆圈 + 三横点 more 图标
const MoreDotIcon = () => (
  <View style={md.circle}>
    <View style={md.dot} />
    <View style={md.dot} />
    <View style={md.dot} />
  </View>
)
const md = StyleSheet.create({
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#1a1a1a',
  },
})
import Text from '@/components/common/Text'
import Badge, { type BadgeType } from '@/components/common/Badge'
import { Icon } from '@/components/common/Icon'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { scaleSizeH } from '@/utils/pixelRatio'
import { LIST_ITEM_HEIGHT } from '@/config/constant'
import { createStyle, type RowInfo } from '@/utils/tools'
import TVButton, { type TVButtonType } from '@/components/common/TVButton'

// TV 模式：列表项加高，遥控器更容易选中
export const ITEM_HEIGHT = (scaleSizeH(LIST_ITEM_HEIGHT) * 1.15) || (LIST_ITEM_HEIGHT * 1.15)

const useQualityTag = (musicInfo: LX.Music.MusicInfoOnline) => {
  const t = useI18n()
  let info: { type: BadgeType | null, text: string } = { type: null, text: '' }
  if (musicInfo.meta._qualitys.flac24bit) {
    info.type = 'secondary'
    info.text = t('quality_lossless_24bit')
  } else if (musicInfo.meta._qualitys.flac ?? musicInfo.meta._qualitys.ape) {
    info.type = 'secondary'
    info.text = t('quality_lossless')
  } else if (musicInfo.meta._qualitys['320k']) {
    info.type = 'tertiary'
    info.text = t('quality_high_quality')
  }
  return info
}

export default memo(({ item, index, showSource, onPress, onLongPress, onShowMenu, selectedList, rowInfo, isShowAlbumName, isShowInterval }: {
  item: LX.Music.MusicInfoOnline
  index: number
  showSource?: boolean
  onPress: (item: LX.Music.MusicInfoOnline, index: number) => void
  onLongPress: (item: LX.Music.MusicInfoOnline, index: number) => void
  onShowMenu: (item: LX.Music.MusicInfoOnline, index: number, position: { x: number, y: number, w: number, h: number }) => void
  selectedList: LX.Music.MusicInfoOnline[]
  rowInfo: RowInfo
  isShowAlbumName: boolean
  isShowInterval: boolean
}) => {
  const theme = useTheme()
  const isSelected = selectedList.includes(item)

  const moreButtonRef = useRef<TVButtonType>(null)
  const handleShowMenu = () => {
    if (moreButtonRef.current?.measure) {
      moreButtonRef.current.measure((fx, fy, width, height, px, py) => {
        onShowMenu(item, index, { x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) })
      })
    }
  }
  const tagInfo = useQualityTag(item)
  const singer = item.singer
  const subParts: string[] = [singer]
  if (isShowAlbumName && item.meta.albumName) subParts.push(item.meta.albumName)
  if (isShowInterval && item.interval) subParts.push(item.interval)
  const subText = subParts.join(' · ')

  return (
    <View style={{
      ...styles.listItem,
      width: rowInfo.rowWidth,
      height: ITEM_HEIGHT,
      backgroundColor: isSelected ? theme['c-primary-background-hover'] : 'rgba(0,0,0,0)',
    }}>
      <TVButton
        style={styles.listItemLeft as ViewStyle}
        onPress={() => { onPress(item, index) }}
        onLongPress={() => { onLongPress(item, index) }}
        borderRadius={6}
      >
        <View style={styles.listItemLeftInner}>
          {/* 序号颜色改为 theme['c-font'] */}
          <Text style={styles.sn} size={15} color={theme['c-font']}>{index + 1}</Text>
          <View style={styles.itemInfo}>
            {/* 歌曲名称颜色改为始终使用 theme['c-primary'] */}
            <Text numberOfLines={1} size={15} color={theme['c-primary']}>{item.name}</Text>
            <View style={styles.listItemSingle}>
              {tagInfo.type ? <Badge type={tagInfo.type}>{tagInfo.text}</Badge> : null}
              {showSource ? <Badge type="tertiary">{item.source}</Badge> : null}
              <Text style={styles.listItemSingleText} size={12} color={theme['c-500']} numberOfLines={1}>{subText}</Text>
            </View>
          </View>
        </View>
      </TVButton>
      <TVButton
        ref={moreButtonRef}
        onPress={handleShowMenu}
        style={styles.moreButton as ViewStyle}
        borderRadius={6}
      >
        <MoreDotIcon />
      </TVButton>
    </View>
  )
}, (prevProps, nextProps) => {
  return !!(prevProps.item === nextProps.item &&
    prevProps.index === nextProps.index &&
    prevProps.isShowAlbumName === nextProps.isShowAlbumName &&
    prevProps.isShowInterval === nextProps.isShowInterval &&
    nextProps.selectedList.includes(nextProps.item) == prevProps.selectedList.includes(nextProps.item)
  )
})

const styles = createStyle({
  listItem: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    paddingRight: 2,
    alignItems: 'center',
  },
  listItemLeft: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    height: '100%',
  },
  listItemLeftInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  sn: {
    width: 48,
    textAlign: 'center',
    paddingLeft: 3,
    paddingRight: 3,
    fontWeight: '600',
  },
  itemInfo: {
    flexGrow: 1,
    flexShrink: 1,
    paddingRight: 8,
    justifyContent: 'center',
  },
  listItemSingle: {
    paddingTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listItemSingleText: {
    flexGrow: 0,
    flexShrink: 1,
    fontWeight: '300',
  },
  moreButton: {
    height: '80%',
    paddingLeft: 18,
    paddingRight: 18,
    justifyContent: 'center',
  },
})
