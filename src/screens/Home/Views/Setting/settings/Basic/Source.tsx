import { memo, useCallback, useMemo, useRef } from 'react'

import { View } from 'react-native'

import SubTitle from '../../components/SubTitle'
import CheckBox from '@/components/common/CheckBox'
import TVButton from '@/components/common/TVButton'
import { Icon } from '@/components/common/Icon'
import { confirmDialog, createStyle, tipDialog } from '@/utils/tools'
import { setApiSource } from '@/core/apiSource'
import { useI18n } from '@/lang'
import apiSourceInfo from '@/utils/musicSdk/api-source-info'
import { useSettingValue } from '@/store/setting/hook'
import settingState from '@/store/setting/state'
import { useStatus, useUserApiList, state as userApiState } from '@/store/userApi'
import { removeUserApi } from '@/core/userApi'
import Button from '../../components/Button'
import ScriptImportExport, { type ScriptImportExportType } from './UserApiEditModal/ScriptImportExport'
import ScriptImportOnline, { type ScriptImportOnlineType } from './UserApiEditModal/ScriptImportOnline'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'

const apiSourceList = apiSourceInfo.map(api => ({
  id: api.id,
  name: api.name,
  disabled: api.disabled,
}))

const useActive = (id: string) => {
  const activeLangId = useSettingValue('common.apiSource')
  const isActive = useMemo(() => activeLangId == id, [activeLangId, id])
  return isActive
}

const Item = ({ id, name, desc, statusLabel, change, onRemove }: {
  id: string
  name: string
  desc?: string
  statusLabel?: string
  change: (id: string) => void
  onRemove?: (id: string, name: string) => void
}) => {
  const isActive = useActive(id)
  const theme = useTheme()
  const handleRemove = () => {
    onRemove?.(id, name)
  }
  // const [toggleCheckBox, setToggleCheckBox] = useState(false)
  return (
    <View style={styles.itemRow}>
      <CheckBox marginBottom={5} check={isActive} onChange={() => { change(id) }} need>
        <Text style={styles.sourceLabel}>
          {name}
          {
            desc ? <Text style={styles.sourceDesc} color={theme['c-500']} size={13}>  {desc}</Text> : null
          }
          {
            statusLabel ? <Text style={styles.sourceStatus} size={13}>  {statusLabel}</Text> : null
          }
        </Text>
      </CheckBox>
      {
        onRemove
          ? (
              <TVButton
                style={styles.removeBtn}
                onPress={handleRemove}
                borderRadius={4}
              >
                <Icon size={15} name="close" color={theme['c-500']} />
              </TVButton>
            )
          : null
      }
    </View>
  )
}

export default memo(() => {
  const t = useI18n()
  const list = useMemo(() => apiSourceList.map(s => ({
    // @ts-expect-error
    name: t(`setting_basic_source_${s.id}`) || s.name,
    id: s.id,
  })), [t])
  const setApiSourceId = useCallback((id: string) => {
    setApiSource(id)
  }, [])
  const userApiListRaw = useUserApiList()
  const apiStatus = useStatus()
  const apiSourceSetting = useSettingValue('common.apiSource')
  const userApiList = useMemo(() => {
    const getApiStatus = () => {
      let status
      if (apiStatus.status) status = t('setting_basic_source_status_success')
      else if (apiStatus.message == 'initing') status = t('setting_basic_source_status_initing')
      else status = t('setting_basic_source_status_failed')

      return status
    }
    return userApiListRaw.map(api => {
      const statusLabel = api.id == apiSourceSetting ? `[${getApiStatus()}]` : ''
      return {
        id: api.id,
        name: api.name,
        label: `${api.name}${statusLabel}`,
        desc: [/^\d/.test(api.version) ? `v${api.version}` : api.version].filter(Boolean).join(', '),
        statusLabel,
        // status: apiStatus.status,
        // message: apiStatus.message,
        // disabled: false,
      }
    })
  }, [userApiListRaw, apiStatus, apiSourceSetting, t])

  const scriptImportExportRef = useRef<ScriptImportExportType>(null)
  const scriptImportOnlineRef = useRef<ScriptImportOnlineType>(null)

  const handleRemove = useCallback(async(id: string, name: string) => {
    const confirm = await confirmDialog({
      message: t('user_api_remove_tip', { name }),
      cancelButtonText: t('cancel_button_text_2'),
      confirmButtonText: t('confirm_button_text'),
      bgClose: false,
    })
    if (!confirm) return
    void removeUserApi([id]).finally(() => {
      if (settingState.setting['common.apiSource'] == id) {
        let backApiId = apiSourceInfo.find(api => !api.disabled)?.id
        if (!backApiId) backApiId = userApiState.list[0]?.id
        setApiSource(backApiId ?? '')
      }
    })
  }, [t])

  const handleImportLocal = () => {
    if (userApiState.list.length > 20) {
      void tipDialog({
        message: t('user_api_max_tip'),
        btnText: t('ok'),
      })
      return
    }
    scriptImportExportRef.current?.import()
  }

  const handleImportOnline = () => {
    if (userApiState.list.length > 20) {
      void tipDialog({
        message: t('user_api_max_tip'),
        btnText: t('ok'),
      })
      return
    }
    scriptImportOnlineRef.current?.show()
  }

  return (
    <SubTitle title={t('setting_basic_source')}>
      <View style={styles.list}>
        {
          list.map(({ id, name }) => <Item name={name} id={id} key={id} change={setApiSourceId} />)
        }
        {
          userApiList.map(({ id, name, desc, statusLabel }) => <Item name={name} desc={desc} statusLabel={statusLabel} id={id} key={id} change={setApiSourceId} onRemove={handleRemove} />)
        }
      </View>
      <View style={styles.btn}>
        <Button onPress={handleImportLocal}>{t('user_api_btn_import_local')}</Button>
        <Button onPress={handleImportOnline}>{t('user_api_btn_import_online')}</Button>
      </View>
      <ScriptImportExport ref={scriptImportExportRef} />
      <ScriptImportOnline ref={scriptImportOnlineRef} />
    </SubTitle>
  )
})

const styles = createStyle({
  list: {
    flexGrow: 0,
    flexShrink: 1,
    // flexDirection: 'row',
    // flexWrap: 'wrap',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  removeBtn: {
    marginLeft: 6,
    marginBottom: 5,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btn: {
    marginTop: 10,
    flexDirection: 'row',
  },
  sourceLabel: {

  },
  sourceDesc: {

  },
  sourceStatus: {

  },
})
