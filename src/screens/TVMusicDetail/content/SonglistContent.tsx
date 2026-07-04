/**
 * 歌单内容 — 加载歌单歌曲，渲染分页两列列表，支持收藏
 */
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { View } from 'react-native'
import {
  OnlineMusicList,
  type OnlineMusicListType,
} from '../TVMusicList'
import {
  getListDetail,
  setListDetailInfo,
  setListDetail,
  clearListDetail,
} from '@/core/songlist'
import songlistState from '@/store/songlist/state'
import { handlePlay, handleCollect } from '@/screens/SonglistDetail/listAction'
import ListMenu, { type ListMenuType } from '@/components/OnlineList/ListMenu'
import ListMusicAdd, { type MusicAddModalType } from '@/components/MusicAddModal'
import ListMusicMultiAdd, { type MusicMultiAddModalType } from '@/components/MusicMultiAddModal'
import { handlePlayLater, handleDislikeMusic } from '@/components/OnlineList/listAction'

export interface SonglistContentType {
  collect: () => void
}

interface Props {
  id: string
  source: LX.OnlineSource
  name?: string
}

export default forwardRef<SonglistContentType, Props>(({ id, source, name }, ref) => {
  const listRef = useRef<OnlineMusicListType>(null)
  const listMenuRef = useRef<ListMenuType>(null)
  const listMusicAddRef = useRef<MusicAddModalType>(null)
  const listMusicMultiAddRef = useRef<MusicMultiAddModalType>(null)
  const isUnmountedRef = useRef(false)
  const loadedIdRef = useRef('')

  useImperativeHandle(ref, () => ({
    collect() {
      const listName = songlistState.listDetailInfo.info.name || name || ''
      void handleCollect(id, source, listName)
    },
  }))

  useEffect(() => {
    isUnmountedRef.current = false
    if (loadedIdRef.current === id) return
    loadedIdRef.current = id

    setListDetailInfo(source, id)
    listRef.current?.setStatus('loading')
    listRef.current?.setList([])

    const page = 1
    getListDetail(id, source, page).then(detail => {
      if (isUnmountedRef.current) return
      const result = setListDetail(detail, id, page)
      listRef.current?.setList(result.list)
      listRef.current?.setStatus(songlistState.listDetailInfo.maxPage <= page ? 'end' : 'idle')
    }).catch(() => {
      clearListDetail()
      listRef.current?.setStatus('error')
    })

    return () => { isUnmountedRef.current = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleLoadMore = () => {
    const info = songlistState.listDetailInfo
    if (!info.list.length) return
    const page = info.page + 1
    listRef.current?.setStatus('loading')
    getListDetail(id, source, page).then(detail => {
      if (isUnmountedRef.current) return
      const result = setListDetail(detail, id, page)
      listRef.current?.appendList(result.list)
      listRef.current?.setStatus(songlistState.listDetailInfo.maxPage <= page ? 'end' : 'idle')
    }).catch(() => {
      listRef.current?.setStatus('error')
    })
  }

  const handlePress = (item: LX.Music.MusicInfoOnline, index: number) => {
    void handlePlay(id, source, songlistState.listDetailInfo.list, index)
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
        onPlay={info => { void handlePlay(id, source, songlistState.listDetailInfo.list, info.index) }}
        onPlayLater={info => { handlePlayLater(info.musicInfo, [], () => {}) }}
        onAdd={info => { listMusicAddRef.current?.show({ musicInfo: info.musicInfo, listId: '', isMove: false }) }}
        onMove={info => { listMusicAddRef.current?.show({ musicInfo: info.musicInfo, listId: '', isMove: true }) }}
        onDislike={info => { void handleDislikeMusic(info.musicInfo) }}
      />
    </View>
  )
})
