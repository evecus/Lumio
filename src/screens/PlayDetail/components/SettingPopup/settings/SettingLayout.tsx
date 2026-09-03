import { useMemo } from 'react'

import { View } from 'react-native'
import Text from '@/components/common/Text'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import styles from './style'
import CheckBox from '@/components/common/CheckBox'

type Layout_Type = LX.AppSetting['playDetail.style.layout']

const LAYOUT_LIST = [
  'cover',
  'background',
] as const

const useActive = (id: Layout_Type) => {
  const x = useSettingValue('playDetail.style.layout')
  const isActive = useMemo(() => x == id, [x, id])
  return isActive
}

const Item = ({ id, name, change }: {
  id: Layout_Type
  name: string
  change: (id: Layout_Type) => void
}) => {
  const isActive = useActive(id)
  return <CheckBox marginBottom={3} check={isActive} label={name} onChange={() => { change(id) }} need />
}

export default () => {
  const t = useI18n()
  const list = useMemo(() => {
    return LAYOUT_LIST.map(id => ({ id, name: t(`play_detail_setting_layout_${id}`) }))
  }, [t])

  const setLayout = (id: Layout_Type) => {
    updateSetting({ 'playDetail.style.layout': id })
  }

  return (
    <View style={styles.container}>
      <Text>{t('play_detail_setting_layout')}</Text>
      <View style={styles.content}>
        <View style={styles.list}>
          {
            list.map(({ id, name }) => <Item name={name} id={id} key={id} change={setLayout} />)
          }
        </View>
      </View>
    </View>
  )
}
