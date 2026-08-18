/**
 * 在线歌曲列表操作菜单 — TV 弹窗版
 *
 * 操作项：播放 / 稍后播放 / 添加到 / 移动到 / 不喜欢（共5个）
 */
import { useRef, useImperativeHandle, forwardRef } from 'react'
import { useI18n } from '@/lang'
import TVListMenuDialog, { type TVListMenuDialogType } from '@/components/common/TVListMenuDialog'

export interface SelectInfo {
  musicInfo: LX.Music.MusicInfoOnline
  selectedList: LX.Music.MusicInfoOnline[]
  index: number
  single: boolean
}

export interface Position { w: number, h: number, x: number, y: number }

export interface ListMenuProps {
  onPlay: (selectInfo: SelectInfo) => void
  onPlayLater: (selectInfo: SelectInfo) => void
  onAdd: (selectInfo: SelectInfo) => void
  onMove: (selectInfo: SelectInfo) => void
  onDislike: (selectInfo: SelectInfo) => void
}
export interface ListMenuType {
  show: (selectInfo: SelectInfo, position?: Position) => void
}

export default forwardRef<ListMenuType, ListMenuProps>((props, ref) => {
  const t = useI18n()
  const dialogRef = useRef<TVListMenuDialogType<SelectInfo>>(null)

  useImperativeHandle(ref, () => ({
    show(selectInfo, _position?) {
      dialogRef.current?.show(selectInfo)
    },
  }))

  const menus = [
    { action: 'play'      as const, label: t('play') },
    { action: 'playLater' as const, label: t('play_later') },
    { action: 'add'       as const, label: t('add_to') },
    { action: 'move'      as const, label: t('move_to') },
    { action: 'dislike'   as const, label: t('dislike') },
  ] as const

  const handleAction = (action: typeof menus[number]['action'], info: SelectInfo) => {
    switch (action) {
      case 'play':      props.onPlay(info);      break
      case 'playLater': props.onPlayLater(info); break
      case 'add':       props.onAdd(info);       break
      case 'move':      props.onMove(info);      break
      case 'dislike':   props.onDislike(info);   break
    }
  }

  return (
    <TVListMenuDialog<SelectInfo>
      ref={dialogRef}
      menus={menus}
      onAction={handleAction}
    />
  )
})
