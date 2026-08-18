import { TouchableHighlight } from 'react-native'
import { navigations } from '@/navigation'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import commonState from '@/store/common/state'
import playerState from '@/store/player/state'
import Text from '@/components/common/Text'
import { LIST_IDS } from '@/config/constant'
import { createStyle } from '@/utils/tools'


export default ({ isHome }: { isHome: boolean }) => {
  const musicInfo = usePlayerMusicInfo()
  const downloadFileName = useSettingValue('download.fileName')
  const theme = useTheme()

  const handlePress = () => {
    if (!musicInfo.id) return
    navigations.pushPlayDetailScreen(commonState.componentIds.home!)
  }

  const handleLongPress = () => {
    const listId = playerState.playMusicInfo.listId
    if (!listId || listId == LIST_IDS.DOWNLOAD) return
    global.app_event.jumpListPosition()
  }

  const title = musicInfo.id
    ? musicInfo.singer
      ? downloadFileName.replace('歌手', musicInfo.singer).replace('歌名', musicInfo.name)
      : musicInfo.name
    : ''

  return (
    <TouchableHighlight
      style={styles.container}
      underlayColor={theme['c-primary-alpha-100'] ?? 'rgba(255,255,255,0.12)'}
      onLongPress={handleLongPress}
      onPress={handlePress}
    >
      <Text color={theme['c-font-label']} numberOfLines={1}>{title}</Text>
    </TouchableHighlight>
  )
}

const styles = createStyle({
  container: {
    width: '100%',
    paddingHorizontal: 2,
    borderRadius: 4,
    overflow: 'hidden',
    minHeight: 28,
    justifyContent: 'center',
  },
})
