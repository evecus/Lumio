/**
 * 添加到列表 — 列表项 TV 重设计版
 *
 * 每项占满宽度、高度 52dp，遥控器方向键可轻松选中。
 * 已存在的列表显示半透明，点击时提示已添加。
 */
import { View, StyleSheet } from 'react-native'
import TVButton from '@/components/common/TVButton'
import Text from '@/components/common/Text'
import { toast } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useMusicExistsList } from '@/store/list/hook'

export default ({
  listInfo,
  onPress,
  musicInfo,
  hasTVPreferredFocus,
}: {
  listInfo: LX.List.MyListInfo
  onPress: (listInfo: LX.List.MyListInfo) => void
  musicInfo: LX.Music.MusicInfo
  hasTVPreferredFocus?: boolean
}) => {
  const theme = useTheme()
  const isExists = useMusicExistsList(listInfo, musicInfo)

  const handlePress = () => {
    if (isExists) {
      toast(global.i18n.t('list_add_tip_exists'))
      return
    }
    onPress(listInfo)
  }

  return (
    <TVButton
      style={[
        s.btn,
        {
          backgroundColor: theme['c-button-background'],
          borderColor: theme['c-primary-light-400-alpha-300'],
          opacity: isExists ? 0.4 : 1,
        },
      ]}
      onPress={handlePress}
      hasTVPreferredFocus={hasTVPreferredFocus}
      borderRadius={8}
    >
      <Text numberOfLines={1} size={15} color={theme['c-button-font']}>{listInfo.name}</Text>
    </TVButton>
  )
}

// 保留旧 styles 导出，防止其他文件引用报错
export const styles = StyleSheet.create({
  listItem: {},
  button: {},
})

const s = StyleSheet.create({
  btn: {
    height: 52,
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
})
