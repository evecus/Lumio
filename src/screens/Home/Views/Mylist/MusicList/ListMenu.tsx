/**
 * 我的列表歌曲操作菜单 — TV 弹窗版
 *
 * 操作项：播放 / 稍后播放 / 添加到 / 移动到 / 歌曲换源 / 不喜欢 / 移除
 * 全部使用 TVListMenuDialog 居中弹窗，遥控器可聚焦点击。
 */
import { useRef, useImperativeHandle, forwardRef } from 'react'
import { useI18n } from '@/lang'
import TVListMenuDialog, { type TVListMenuDialogType } from '@/components/common/TVListMenuDialog'

export interface SelectInfo {
  musicInfo: LX.Music.MusicInfo
  selectedList: LX.Music.MusicInfo[]
  index: number
  listId: string
  single: boolean
}

export interface Position { w: number, h: number, x: number, y: number }

export interface ListMenuProps {
  onPlay: (selectInfo: SelectInfo) => void
  onPlayLater: (selectInfo: SelectInfo) => void
  onAdd: (selectInfo: SelectInfo) => void
  onMove: (selectInfo: SelectInfo) => void
  onToggleSource: (selectInfo: SelectInfo) => void
  onDislike: (selectInfo: SelectInfo) => void
  onRemove: (selectInfo: SelectInfo) => void
}
export interface ListMenuType {
  show: (selectInfo: SelectInfo, position?: Position) => void
}

export type { Position as PositionType }

export default forwardRef<ListMenuType, ListMenuProps>((props, ref) => {
  const t = useI18n()
  const dialogRef = useRef<TVListMenuDialogType<SelectInfo>>(null)

  useImperativeHandle(ref, () => ({
    show(selectInfo, _position?) {
      dialogRef.current?.show(selectInfo)
    },
  }))

  const menus = [
    { action: 'play'         as const, label: t('play') },
    { action: 'playLater'    as const, label: t('play_later') },
    { action: 'add'          as const, label: t('add_to') },
    { action: 'move'         as const, label: t('move_to') },
    { action: 'toggleSource' as const, label: t('toggle_source') },
    { action: 'dislike'      as const, label: t('dislike') },
    { action: 'remove'       as const, label: t('list_remove') },
  ] as const

  const handleAction = (action: typeof menus[number]['action'], info: SelectInfo) => {
    switch (action) {
      case 'play':         props.onPlay(info);         break
      case 'playLater':    props.onPlayLater(info);    break
      case 'add':          props.onAdd(info);          break
      case 'move':         props.onMove(info);         break
      case 'toggleSource': props.onToggleSource(info); break
      case 'dislike':      props.onDislike(info);      break
      case 'remove':       props.onRemove(info);       break
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
