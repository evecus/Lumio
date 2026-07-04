/**
 * TV 歌曲列表行 — 仿酷狗风格
 * 每行焦点单元：[主按钮] [···]
 * 行内左右键在两个按钮间切换，到边界时触发跨列/翻页回调
 */
import { useRef, forwardRef, useImperativeHandle } from 'react'
import { View, StyleSheet } from 'react-native'

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
import { useTheme } from '@/store/theme/hook'
import TVButton, { type TVButtonType } from '@/components/common/TVButton'
import { scaleSizeH } from '@/utils/pixelRatio'
import { LIST_ITEM_HEIGHT } from '@/config/constant'
import { useSettingValue } from '@/store/setting/hook'

export const ITEM_HEIGHT = (scaleSizeH(LIST_ITEM_HEIGHT) * 1.15) || (LIST_ITEM_HEIGHT * 1.15)

export interface TVListItemHandle {
  /** 焦点到主按钮 */
  focusMain: () => void
  /** 焦点到三点按钮 */
  focusMore: () => void
}

// 音质 badge
const useQualityTag = (musicInfo: LX.Music.MusicInfoOnline) => {
  let info: { type: BadgeType | null; text: string } = { type: null, text: '' }
  if (musicInfo.meta._qualitys.flac24bit) {
    info = { type: 'secondary', text: '24bit' }
  } else if (musicInfo.meta._qualitys.flac ?? musicInfo.meta._qualitys.ape) {
    info = { type: 'secondary', text: 'SQ' }
  } else if (musicInfo.meta._qualitys['320k']) {
    info = { type: 'tertiary', text: 'HQ' }
  }
  return info
}

// ─── 回调类型 ─────────────────────────────────────────────────────────────────
export interface TVListItemCallbacks {
  /** 主按钮按左键（到行最左端） */
  onMainLeft: () => void
  /** 三点按钮按右键（到行最右端） */
  onMoreRight: () => void
}

// ─── 我的列表歌曲行 ───────────────────────────────────────────────────────────
export const MyListItem = forwardRef<TVListItemHandle, {
  item: LX.Music.MusicInfo
  index: number
  isActive: boolean
  onPress: (item: LX.Music.MusicInfo, index: number) => void
  onShowMenu: (item: LX.Music.MusicInfo, index: number, position: { x: number; y: number; w: number; h: number }) => void
  callbacks: TVListItemCallbacks
}>(({ item, index, isActive, onPress, onShowMenu, callbacks }, ref) => {
  const theme = useTheme()
  const mainRef = useRef<TVButtonType>(null)
  const moreRef = useRef<TVButtonType>(null)
  const isShowAlbumName = useSettingValue('list.isShowAlbumName')
  const isShowInterval = useSettingValue('list.isShowInterval')

  useImperativeHandle(ref, () => ({
    focusMain() { mainRef.current?.requestFocus() },
    focusMore() { moreRef.current?.requestFocus() },
  }))

  const handleShowMenu = () => {
    moreRef.current?.measure((fx, fy, width, height, px, py) => {
      onShowMenu(item, index, { x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) })
    })
  }

  const subParts: string[] = [item.singer]
  if (isShowAlbumName && item.meta.albumName) subParts.push(item.meta.albumName)
  if (isShowInterval && item.interval) subParts.push(item.interval)
  const subText = subParts.join(' · ')

  return (
    <View style={[styles.row, { height: ITEM_HEIGHT }]}>
      <TVButton
        ref={mainRef}
        style={styles.main}
        borderRadius={6}
        lockHorizontal
        onDirection={dir => {
          if (dir === 'left') callbacks.onMainLeft()
          else moreRef.current?.requestFocus()
        }}
        onPress={() => onPress(item, index)}
      >
        <View style={styles.inner}>
          {isActive
            ? <Icon style={styles.sn} name="play-outline" size={16} color={theme['c-primary']} />
            : <Text style={styles.sn} size={15} color={theme['c-font']}>{index + 1}</Text>
          }
          <View style={styles.nameWrap}>
            <Text numberOfLines={1} size={15} color={theme['c-primary']}>
              {item.name}
            </Text>
            <View style={styles.subRow}>
              <Text style={styles.subInfo} size={12} color={theme['c-500']} numberOfLines={1}>
                {subText}
              </Text>
            </View>
          </View>
        </View>
      </TVButton>

      <TVButton
        ref={moreRef}
        style={styles.more}
        borderRadius={6}
        lockHorizontal
        onDirection={dir => {
          if (dir === 'left') mainRef.current?.requestFocus()
          else callbacks.onMoreRight()
        }}
        onPress={handleShowMenu}
      >
        <MoreDotIcon />
      </TVButton>
    </View>
  )
})

// ─── 在线歌曲行（排行榜 / 歌单用）────────────────────────────────────────────
const TVListItem = forwardRef<TVListItemHandle, {
  item: LX.Music.MusicInfoOnline
  index: number
  onPress: (item: LX.Music.MusicInfoOnline, index: number) => void
  onShowMenu: (item: LX.Music.MusicInfoOnline, index: number, position: { x: number; y: number; w: number; h: number }) => void
  callbacks: TVListItemCallbacks
}>(({ item, index, onPress, onShowMenu, callbacks }, ref) => {
  const theme = useTheme()
  const mainRef = useRef<TVButtonType>(null)
  const moreRef = useRef<TVButtonType>(null)
  const qualityTag = useQualityTag(item)
  const isShowAlbumName = useSettingValue('list.isShowAlbumName')
  const isShowInterval = useSettingValue('list.isShowInterval')

  useImperativeHandle(ref, () => ({
    focusMain() { mainRef.current?.requestFocus() },
    focusMore() { moreRef.current?.requestFocus() },
  }))

  const handleShowMenu = () => {
    moreRef.current?.measure((fx, fy, width, height, px, py) => {
      onShowMenu(item, index, { x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) })
    })
  }

  const subParts: string[] = [item.singer]
  if (isShowAlbumName && item.meta.albumName) subParts.push(item.meta.albumName)
  if (isShowInterval && item.interval) subParts.push(item.interval)
  const subText = subParts.join(' · ')

  return (
    <View style={[styles.row, { height: ITEM_HEIGHT }]}>
      <TVButton
        ref={mainRef}
        style={styles.main}
        borderRadius={6}
        lockHorizontal
        onDirection={dir => {
          if (dir === 'left') callbacks.onMainLeft()
          else moreRef.current?.requestFocus()
        }}
        onPress={() => onPress(item, index)}
      >
        <View style={styles.inner}>
          <Text style={styles.sn} size={15} color={theme['c-font']}>{index + 1}</Text>
          <View style={styles.nameWrap}>
            <Text numberOfLines={1} size={15} color={theme['c-primary']}>{item.name}</Text>
            <View style={styles.subRow}>
              {qualityTag.type ? <Badge type={qualityTag.type}>{qualityTag.text}</Badge> : null}
              <Text style={styles.subInfo} size={12} color={theme['c-500']} numberOfLines={1}>{subText}</Text>
            </View>
          </View>
        </View>
      </TVButton>

      <TVButton
        ref={moreRef}
        style={styles.more}
        borderRadius={6}
        lockHorizontal
        onDirection={dir => {
          if (dir === 'left') mainRef.current?.requestFocus()
          else callbacks.onMoreRight()
        }}
        onPress={handleShowMenu}
      >
        <MoreDotIcon />
      </TVButton>
    </View>
  )
})

export default TVListItem

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 2,
  },
  main: {
    flex: 1,
    height: '100%',
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 4,
  },
  sn: {
    width: 48,
    textAlign: 'center',
    fontWeight: '600',
  },
  nameWrap: {
    flex: 1,
    flexShrink: 1,
    paddingRight: 6,
    justifyContent: 'center',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 2,
    gap: 4,
  },
  subInfo: {
    flexShrink: 1,
    fontWeight: '300',
  },
  more: {
    height: '80%',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
})
