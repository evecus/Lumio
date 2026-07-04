import { StyleSheet, TouchableHighlight } from 'react-native'
import { navigations } from '@/navigation'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { scaleSizeH } from '@/utils/pixelRatio'
import commonState from '@/store/common/state'
import playerState from '@/store/player/state'
import { LIST_IDS, NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import Image from '@/components/common/Image'
import { useCallback } from 'react'
import { setLoadErrorPicUrl, setMusicInfo } from '@/core/player/playInfo'
import { useTheme } from '@/store/theme/hook'

// TV 模式：封面图略加大，更容易被遥控器聚焦
const PIC_HEIGHT = scaleSizeH(52)

const styles = StyleSheet.create({
  image: {
    width: PIC_HEIGHT,
    height: PIC_HEIGHT,
    borderRadius: 4,
  },
  touchable: {
    borderRadius: 4,
    overflow: 'hidden',
  },
})

export default ({ isHome }: { isHome: boolean }) => {
  const musicInfo = usePlayerMusicInfo()
  const theme = useTheme()

  const handlePress = () => {
    if (!musicInfo.id) return
    navigations.pushPlayDetailScreen(commonState.componentIds.home!)
  }

  const handleLongPress = () => {
    if (!isHome) return
    const listId = playerState.playMusicInfo.listId
    if (!listId || listId == LIST_IDS.DOWNLOAD) return
    global.app_event.jumpListPosition()
  }

  const handleError = useCallback((url: string | number) => {
    setLoadErrorPicUrl(url as string)
    setMusicInfo({
      pic: null,
    })
  }, [])

  return (
    <TouchableHighlight
      style={styles.touchable}
      underlayColor={theme['c-primary-alpha-100'] ?? 'rgba(255,255,255,0.15)'}
      onPress={handlePress}
      onLongPress={handleLongPress}
    >
      <Image url={musicInfo.pic} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic} style={styles.image} onError={handleError} />
    </TouchableHighlight>
  )
}
