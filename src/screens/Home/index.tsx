import { useEffect } from 'react'
import { setComponentId } from '@/core/common'
import { COMPONENT_IDS } from '@/config/constant'
import TV from './TV'
import { navigations } from '@/navigation'
import settingState from '@/store/setting/state'

export default ({ componentId }: { componentId: string }) => {
  useEffect(() => {
    setComponentId(COMPONENT_IDS.home, componentId)
    if (settingState.setting['player.startupPushPlayDetailScreen']) {
      navigations.pushPlayDetailScreen(componentId, true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <TV />
}
