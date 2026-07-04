import { memo } from 'react'

import Basic from './settings/Basic'
import Player from './settings/Player'
import List from './settings/List'
import Backup from './settings/Backup'
import Other from './settings/Other'
import Theme from './settings/Theme'
import Sync from './settings/Sync'
import Section from './components/Section'
import { useI18n } from '@/lang'

export const SETTING_SCREENS = [
  'basic',
  'player',
  'theme',
  'list',
  'backup',
  'sync',
  'other',
] as const

export type SettingScreenIds = typeof SETTING_SCREENS[number]

// TV端：所有设置一次性渲染在单页
export default memo(() => {
  const t = useI18n()

  return (
    <>
      <Basic />
      <Player />
      <Section title={t('setting_theme')}>
        <Theme />
      </Section>
      <List />
      <Backup />
      <Sync />
      <Other />
    </>
  )
})
