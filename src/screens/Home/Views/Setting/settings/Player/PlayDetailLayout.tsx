import { memo, useMemo } from 'react'

import { StyleSheet, View } from 'react-native'

import SubTitle from '../../components/SubTitle'
import CheckBox from '@/components/common/CheckBox'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'

type Layout_Type = LX.AppSetting['playDetail.style.layout']

const LAYOUT_LIST: Layout_Type[] = ['cover', 'background']

const useActive = (id: Layout_Type) => {
  const layout = useSettingValue('playDetail.style.layout')
  const isActive = useMemo(() => layout == id, [layout, id])
  return isActive
}

const Item = ({ id, name }: {
  id: Layout_Type
  name: string
}) => {
  const isActive = useActive(id)
  return <CheckBox marginRight={8} check={isActive} label={name} onChange={() => { updateSetting({ 'playDetail.style.layout': id }) }} need />
}

export default memo(() => {
  const t = useI18n()

  return (
    <SubTitle title={t('play_detail_setting_layout')}>
      <View style={styles.list}>
        {
          LAYOUT_LIST.map((id) => <Item name={t(`play_detail_setting_layout_${id}`)} id={id} key={id} />)
        }
      </View>
    </SubTitle>
  )
})

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
})
