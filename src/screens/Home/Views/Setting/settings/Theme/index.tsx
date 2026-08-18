import { memo } from 'react'

// import Section from '../../components/Section'
import Theme from './Theme'
import FocusColor from './FocusColor'
// import { useI18n } from '@/lang/i18n'

export default memo(() => {
  return (
    <>
      <Theme />
      <FocusColor />
    </>
  )
})
