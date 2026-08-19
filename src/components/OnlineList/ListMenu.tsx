/**
 * 在线歌曲列表操作菜单 — TV 弹窗版
 *
 * 操作项：播放 / 稍后播放 / 添加到 / 移动到 / 不喜欢 / 播放MV（仅网易云有 MV 时）
 */
import { useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { useI18n } from '@/lang'
import TVListMenuDialog, { type TVListMenuDialogType, type MenuItemDef } from '@/components/common/TVListMenuDialog'

export interface SelectInfo {
  musicInfo: LX.Music.MusicInfoOnline
  selectedList: LX.Music.MusicInfoOnline[]
  index: number
  single: boolean
}

export interface Position { w: number, h: number, x: number, y: number }

type MenuAction = 'play' | 'playLater' | 'add' | 'move' | 'dislike' | 'playMv'

export interface ListMenuProps {
  onPlay: (selectInfo: SelectInfo) => void
  onPlayLater: (selectInfo: SelectInfo) => void
  onAdd: (selectInfo: SelectInfo) => void
  onMove: (selectInfo: SelectInfo) => void
  onDislike: (selectInfo: SelectInfo) => void
  onPlayMv?: (selectInfo: SelectInfo) => void
}
export interface ListMenuType {
  show: (selectInfo: SelectInfo, position?: Position) => void
}

const EMPTY_SELECT: SelectInfo = {
  musicInfo: null as unknown as LX.Music.MusicInfoOnline,
  selectedList: [],
  index: -1,
  single: true,
}

export default forwardRef<ListMenuType, ListMenuProps>((props, ref) => {
  const t = useI18n()
  const dialogRef = useRef<TVListMenuDialogType<SelectInfo>>(null)

  const buildMenus = (info: SelectInfo): MenuItemDef<MenuAction>[] => {
    const items: MenuItemDef<MenuAction>[] = [
      { action: 'play',      label: t('play') },
      { action: 'playLater', label: t('play_later') },
      { action: 'add',       label: t('add_to') },
      { action: 'move',      label: t('move_to') },
      { action: 'dislike',   label: t('dislike') },
    ]

    // 仅网易云（wy）且歌曲有 MV ID 时追加"播放MV"
    const meta = info?.musicInfo?.meta as (LX.Music.MusicInfoMeta_online & { mv?: number }) | undefined
    if (info?.musicInfo?.source === 'wy' && meta?.mv) {
      items.push({ action: 'playMv', label: '播放MV' })
    }

    return items
  }

  // 当前弹窗展示的 menus，随 show() 同步更新，避免依赖 state 更新时序（曾出现
  // 首次点击时"播放MV"因 useMemo 依赖 state 的更新时序不稳定而未及时出现的问题）
  const [menus, setMenus] = useState<ReadonlyArray<MenuItemDef<MenuAction>>>(() => buildMenus(EMPTY_SELECT))

  useImperativeHandle(ref, () => ({
    show(newSelectInfo, _position?) {
      // 同步计算好这次要展示的 menus，直接和 selectInfo 一起使用，不依赖
      // React state 更新后再重新渲染，避免菜单弹出时用到的是上一次的 menus
      setMenus(buildMenus(newSelectInfo))
      dialogRef.current?.show(newSelectInfo)
    },
  }))

  const handleAction = (action: MenuAction, info: SelectInfo) => {
    switch (action) {
      case 'play':      props.onPlay(info);           break
      case 'playLater': props.onPlayLater(info);      break
      case 'add':       props.onAdd(info);            break
      case 'move':      props.onMove(info);           break
      case 'dislike':   props.onDislike(info);        break
      case 'playMv':    props.onPlayMv?.(info);       break
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
