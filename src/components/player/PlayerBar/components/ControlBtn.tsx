import { TouchableHighlight, View } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { useIsPlay } from '@/store/player/hook'
import { useTheme } from '@/store/theme/hook'
import { playNext, playPrev, togglePlay } from '@/core/player/player'
import { createStyle } from '@/utils/tools'

// TV 模式按钮尺寸：底栏空间有限，用 52，保证遥控器焦点区足够大
const BTN_SIZE = 52
const ICON_SIZE = 26

const handlePlayPrev = () => { void playPrev() }
const handlePlayNext = () => { void playNext() }

const PlayPrevBtn = () => {
  const theme = useTheme()
  return (
    <TouchableHighlight
      style={styles.cotrolBtn}
      underlayColor={theme['c-primary-alpha-100'] ?? 'rgba(255,255,255,0.15)'}
      onPress={handlePlayPrev}
    >
      <View style={styles.inner}>
        <Icon name='prevMusic' color={theme['c-button-font']} size={ICON_SIZE} />
      </View>
    </TouchableHighlight>
  )
}

const PlayNextBtn = () => {
  const theme = useTheme()
  return (
    <TouchableHighlight
      style={styles.cotrolBtn}
      underlayColor={theme['c-primary-alpha-100'] ?? 'rgba(255,255,255,0.15)'}
      onPress={handlePlayNext}
    >
      <View style={styles.inner}>
        <Icon name='nextMusic' color={theme['c-button-font']} size={ICON_SIZE} />
      </View>
    </TouchableHighlight>
  )
}

const TogglePlayBtn = () => {
  const isPlay = useIsPlay()
  const theme = useTheme()
  return (
    <TouchableHighlight
      style={styles.cotrolBtn}
      underlayColor={theme['c-primary-alpha-100'] ?? 'rgba(255,255,255,0.15)'}
      onPress={togglePlay}
      hasTVPreferredFocus
    >
      <View style={styles.inner}>
        <Icon name={isPlay ? 'pause' : 'play'} color={theme['c-button-font']} size={ICON_SIZE} />
      </View>
    </TouchableHighlight>
  )
}

// TV 固定横屏，始终显示上一首、播放/暂停、下一首三个按钮
export default () => {
  return (
    <>
      <PlayPrevBtn />
      <TogglePlayBtn />
      <PlayNextBtn />
    </>
  )
}

const styles = createStyle({
  cotrolBtn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
  },
  inner: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
