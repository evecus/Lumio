// @flow

import { Navigation } from 'react-native-navigation'

import {
  Home,
  PlayDetail,
  SonglistDetail,
  Comment,
  TVMusicDetail,
  // Setting,
} from '@/screens'
import { Provider } from '@/store/Provider'
import ScaledStage from '@/components/ScaledStage'

import {
  HOME_SCREEN,
  PLAY_DETAIL_SCREEN,
  SONGLIST_DETAIL_SCREEN,
  COMMENT_SCREEN,
  TV_MUSIC_DETAIL_SCREEN,
  VERSION_MODAL,
  PACT_MODAL,
  SYNC_MODE_MODAL,
  // SETTING_SCREEN,
} from './screenNames'
import VersionModal from './components/VersionModal'
import PactModal from './components/PactModal'
import SyncModeModal from './components/SyncModeModal'

function WrappedComponent(Component: any, useScaledStage = true) {
  return function inject(props: Record<string, any>) {
    const content = useScaledStage
      ? (
        <ScaledStage>
          <Component
            {...props}
          />
        </ScaledStage>
        )
      : <Component {...props} />

    const EnhancedComponent = () => (
      <Provider>
        {content}
      </Provider>
    )

    return <EnhancedComponent />
  }
}

export default () => {
  Navigation.registerComponent(HOME_SCREEN, () => WrappedComponent(Home))
  Navigation.registerComponent(PLAY_DETAIL_SCREEN, () => WrappedComponent(PlayDetail))
  Navigation.registerComponent(SONGLIST_DETAIL_SCREEN, () => WrappedComponent(SonglistDetail))
  Navigation.registerComponent(COMMENT_SCREEN, () => WrappedComponent(Comment))
  Navigation.registerComponent(TV_MUSIC_DETAIL_SCREEN, () => WrappedComponent(TVMusicDetail))
  // 弹窗类的独立浮层屏幕按真实设备尺寸铺满显示，不套用固定画布缩放
  Navigation.registerComponent(VERSION_MODAL, () => WrappedComponent(VersionModal, false))
  Navigation.registerComponent(PACT_MODAL, () => WrappedComponent(PactModal, false))
  Navigation.registerComponent(SYNC_MODE_MODAL, () => WrappedComponent(SyncModeModal, false))
  // Navigation.registerComponent(SETTING_SCREEN, () => WrappedComponent(Setting))

  console.info('All screens have been registered...')
}
