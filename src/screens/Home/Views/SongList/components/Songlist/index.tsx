import { useRef, forwardRef, useImperativeHandle } from 'react'
import { type ListInfoItem } from '@/store/songlist/state'
// import LoadingMask, { LoadingMaskType } from '@/components/common/LoadingMask'
import List, { type ListProps, type ListType, type Status } from './List'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'
import { type TVButtonType } from '@/components/common/TVButton'

export interface SonglistProps {
  onRefresh: ListProps['onRefresh']
  onLoadMore: ListProps['onLoadMore']
}
export interface SonglistType {
  setList: (list: ListInfoItem[], showSource?: boolean) => void
  setStatus: (val: Status) => void
  restoreFocus: () => void
}

export default forwardRef<SonglistType, SonglistProps>(({
  onRefresh,
  onLoadMore,
}, ref) => {
  const listRef = useRef<ListType>(null)
  const lastFocusedCardRef = useRef<TVButtonType | null>(null)

  useImperativeHandle(ref, () => ({
    setList(list, showSource) {
      listRef.current?.setList(list, showSource)
    },
    setStatus(val) {
      listRef.current?.setStatus(val)
    },
    restoreFocus() {
      lastFocusedCardRef.current?.requestFocus()
    },
  }))

  const handleOpenDetail = (item: ListInfoItem, index: number, btn: TVButtonType) => {
    if (!commonState.componentIds.home) return
    lastFocusedCardRef.current = btn
    navigations.pushTVMusicDetailScreen(commonState.componentIds.home, {
      type: 'songlist',
      id: item.id,
      name: item.name,
      source: item.source,
    })
  }

  return (
    <List
      ref={listRef}
      onRefresh={onRefresh}
      onLoadMore={onLoadMore}
      onOpenDetail={handleOpenDetail}
    />
  )
})
