/**
 * 排行榜内容 — 加载榜单歌曲，渲染分页两列列表
 */
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { View } from 'react-native'
import {
  OnlineMusicList,
  type OnlineMusicListType,
} from '../TVMusicList'
import { getListDetail, setListDetailInfo, setListDetail, clearListDetail } from '@/core/leaderboard'
import boardState from '@/store/leaderboard/state'
import { handlePlay } from '@/screens/Home/Views/Leaderboard/listAction'
// 复用 OnlineList 的菜单组件
import ListMenu, { type ListMenuType } from '@/components/OnlineList/ListMenu'
import ListMusicAdd, { type MusicAddModalType } from '@/components/MusicAddModal'
import ListMusicMultiAdd, { type MusicMultiAddModalType } from '@/components/MusicMultiAddModal'
import { handlePlayLater, handleDislikeMusic } from '@/components/OnlineList/listAction'

export interface LeaderboardContentType {
  // 没有额外对外方法，占位
  _type: 'leaderboard'
}

interface Props {
  id: string
  source: LX.OnlineSource
}

export default forwardRef<LeaderboardContentType, Props>(({ id, source }, ref) => {
  const listRef = useRef<OnlineMusicListType>(null)
  const listMenuRef = useRef<ListMenuType>(null)
  const listMusicAddRef = useRef<MusicAddModalType>(null)
  const listMusicMultiAddRef = useRef<MusicMultiAddModalType>(null)
  const isUnmountedRef = useRef(false)
  const loadedIdRef = useRef('')

  useImperativeHandle(ref, () => ({ _type: 'leaderboard' }))

  useEffect(() => {
    isUnmountedRef.current = false
    if (loadedIdRef.current === id) return
    loadedIdRef.current = id

    setListDetailInfo(id)
    listRef.current?.setStatus('loading')
    listRef.current?.setList([])

    const page = 1
    getListDetail(id, page).then(detail => {
      if (isUnmountedRef.current) return
      const result = setListDetail(detail, id, page)
      listRef.current?.setList(result.list)
      listRef.current?.setStatus(boardState.listDetailInfo.maxPage <= page ? 'end' : 'idle')
    }).catch(() => {
      clearListDetail()
      listRef.current?.setStatus('error')
    })

    return () => { isUnmountedRef.current = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleLoadMore = () => {
    const info = boardState.listDetailInfo
    if (!info.list.length) return
    const page = info.page + 1
    listRef.current?.setStatus('loading')
    getListDetail(id, page).then(detail => {
      if (isUnmountedRef.current) return
      const result = setListDetail(detail, id, page)
      listRef.current?.appendList(result.list)
      listRef.current?.setStatus(boardState.listDetailInfo.maxPage <= page ? 'end' : 'idle')
    }).catch(() => {
      listRef.current?.setStatus('error')
    })
  }

  const handlePress = (item: LX.Music.MusicInfoOnline, index: number) => {
    void handlePlay(id, boardState.listDetailInfo.list, index)
  }

  const handleShowMenu = (
    item: LX.Music.MusicInfoOnline,
    index: number,
    position: { x: number; y: number; w: number; h: number },
  ) => {
    listMenuRef.current?.show({
      musicInfo: item,
      index,
      single: true,
      selectedList: [],
    }, position)
  }

  return (
    <View style={{ flex: 1 }}>
      <OnlineMusicList
        ref={listRef}
        onPress={handlePress}
        onShowMenu={handleShowMenu}
        onLoadMore={handleLoadMore}
      />
      <ListMusicAdd ref={listMusicAddRef} onAdded={() => {}} />
      <ListMusicMultiAdd ref={listMusicMultiAddRef} onAdded={() => {}} />
      <ListMenu
        ref={listMenuRef}
        onPlay={info => { void handlePlay(id, boardState.listDetailInfo.list, info.index) }}
        onPlayLater={info => { handlePlayLater(info.musicInfo, [], () => {}) }}
        onAdd={info => { listMusicAddRef.current?.show({ musicInfo: info.musicInfo, listId: '', isMove: false }) }}
        onMove={info => { listMusicAddRef.current?.show({ musicInfo: info.musicInfo, listId: '', isMove: true }) }}
        onDislike={info => { void handleDislikeMusic(info.musicInfo) }}
      />
    </View>
  )
})
