/**
 * 我的列表歌曲操作菜单 — TV 弹窗版
 *
 * 操作项：播放 / 播放MV（仅网易云、酷狗有 MV 时） / 稍后播放 / 添加到 / 移动到 / 歌曲换源 / 不喜欢 / 移除
 * 全部使用 TVListMenuDialog 居中弹窗，遥控器可聚焦点击。
 */
import { useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { useI18n } from '@/lang'
import TVListMenuDialog, { type TVListMenuDialogType, type MenuItemDef } from '@/components/common/TVListMenuDialog'

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
  onPlayMv?: (selectInfo: SelectInfo) => void
}
export interface ListMenuType {
  show: (selectInfo: SelectInfo, position?: Position) => void
}

export type { Position as PositionType }

type MenuAction = 'play' | 'playLater' | 'add' | 'move' | 'toggleSource' | 'dislike' | 'remove' | 'playMv'

const EMPTY_SELECT: SelectInfo = {
  musicInfo: null as unknown as LX.Music.MusicInfo,
  selectedList: [],
  index: -1,
  listId: '',
  single: true,
}

export default forwardRef<ListMenuType, ListMenuProps>((props, ref) => {
  const t = useI18n()
  const dialogRef = useRef<TVListMenuDialogType<SelectInfo>>(null)

  const buildMenus = (info: SelectInfo): MenuItemDef<MenuAction>[] => {
    const items: MenuItemDef<MenuAction>[] = [
      { action: 'play', label: t('play') },
    ]

    // 网易云（wy）或酷狗（kg）且歌曲有 MV 标识时，紧跟在"播放"后追加"播放MV"
    // wy: mv 为数字 ID；kg: mv 为 mvhash 字符串 —— 统一用 meta.mv 存储，truthy 即有 MV
    const meta = info?.musicInfo?.meta as (LX.Music.MusicInfoMeta_online & { mv?: number | string }) | undefined
    if ((info?.musicInfo?.source === 'wy' || info?.musicInfo?.source === 'kg') && meta?.mv) {
      items.push({ action: 'playMv', label: '播放MV' })
    }

    items.push(
      { action: 'playLater',    label: t('play_later') },
      { action: 'add',          label: t('add_to') },
      { action: 'move',         label: t('move_to') },
      { action: 'toggleSource', label: t('toggle_source') },
      { action: 'dislike',      label: t('dislike') },
      { action: 'remove',       label: t('list_remove') },
    )

    return items
  }

  // 当前弹窗展示的 menus，随 show() 同步更新，避免依赖 state 更新时序
  const [menus, setMenus] = useState<ReadonlyArray<MenuItemDef<MenuAction>>>(() => buildMenus(EMPTY_SELECT))

  useImperativeHandle(ref, () => ({
    show(newSelectInfo, _position?) {
      setMenus(buildMenus(newSelectInfo))
      dialogRef.current?.show(newSelectInfo)
    },
  }))

  const handleAction = (action: MenuAction, info: SelectInfo) => {
    switch (action) {
      case 'play':         props.onPlay(info);         break
      case 'playLater':    props.onPlayLater(info);    break
      case 'add':          props.onAdd(info);          break
      case 'move':         props.onMove(info);         break
      case 'toggleSource': props.onToggleSource(info); break
      case 'dislike':      props.onDislike(info);      break
      case 'remove':       props.onRemove(info);       break
      case 'playMv':       props.onPlayMv?.(info);     break
    }
  }

  return (
    <TVListMenuDialog<SelectInfo, MenuAction>
      ref={dialogRef}
      menus={menus}
      onAction={handleAction}
    />
  )
})
