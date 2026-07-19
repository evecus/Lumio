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
import ListMenu, { type ListMenuType } from '@/components/OnlineList/ListMenu'
import ListMusicAdd, { type MusicAddModalType } from '@/components/MusicAddModal'
import ListMusicMultiAdd, { type MusicMultiAddModalType } from '@/components/MusicMultiAddModal'
import { handlePlayLater, handleDislikeMusic } from '@/components/OnlineList/listAction'

export interface LeaderboardContentType {
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
  // 本地按30首切分后的分页页码（getListDetail 内部已按各源真实分页方式统一处理），
  // 与 TV 本地10首/页的展示切片无关
  const remotePageRef = useRef(1)
  const maxRemotePageRef = useRef(1)

  useImperativeHandle(ref, () => ({ _type: 'leaderboard' }))

  useEffect(() => {
    isUnmountedRef.current = false
    if (loadedIdRef.current === id) return
    loadedIdRef.current = id
    remotePageRef.current = 1

    setListDetailInfo(id)
    listRef.current?.setStatus('loading')
    listRef.current?.setList([])

    getListDetail(id, 1).then(detail => {
      if (isUnmountedRef.current) return
      const result = setListDetail(detail, id, 1)
      maxRemotePageRef.current = result.maxPage
      remotePageRef.current = 1
      listRef.current?.setList(result.list)
      listRef.current?.setStatus(result.maxPage <= 1 ? 'end' : 'idle')
    }).catch(() => {
      clearListDetail()
      listRef.current?.setStatus('error')
    })

    return () => { isUnmountedRef.current = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleLoadMore = () => {
    const nextPage = remotePageRef.current + 1
    if (nextPage > maxRemotePageRef.current) return
    listRef.current?.setStatus('loading')
    // 使用本地按30首分页的缓存链（与各源真实分页方式无关），并写回 store，
    // 保证 boardState.listDetailInfo.list 与页面上累积的列表保持一致
    getListDetail(id, nextPage).then(detail => {
      if (isUnmountedRef.current) return
      const result = setListDetail(detail, id, nextPage)
      maxRemotePageRef.current = result.maxPage
      remotePageRef.current = nextPage
      listRef.current?.appendList(detail.list)
      listRef.current?.setStatus(result.maxPage <= nextPage ? 'end' : 'idle')
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
