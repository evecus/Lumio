import { useRef, forwardRef, useImperativeHandle } from 'react'
import Modal, { type ModalType } from './Modal'
import { type Source } from '@/store/songlist/state'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'

export interface OpenListType {
  setInfo: (source: Source) => void
  show: (source: Source) => void
}

export default forwardRef<OpenListType, {}>((props, ref) => {
  const modalRef = useRef<ModalType>(null)
  const songlistInfoRef = useRef<{ source: Source }>({ source: 'kw' })

  useImperativeHandle(ref, () => ({
    setInfo(source) {
      songlistInfoRef.current.source = source
    },
    show(source) {
      songlistInfoRef.current.source = source
      modalRef.current?.show(source)
    },
  }))

  const handleOpenSonglist = (id: string, name = '') => {
    if (!commonState.componentIds.home) return
    navigations.pushTVMusicDetailScreen(commonState.componentIds.home, {
      type: 'songlist',
      id,
      name,
      source: songlistInfoRef.current.source,
    })
  }

  return (
    <Modal ref={modalRef} onOpenId={handleOpenSonglist} />
  )
})
