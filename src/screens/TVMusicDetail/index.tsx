/**
 * TV 歌曲详情页（歌单列表 / 排行榜列表 / 我的收藏列表）
 *
 * 单行顶部栏：
 *   左：搜索图标
 *   中：页面标题（歌单名/排行榜名/列表名）+ 爱心图标（仅歌单页，替代"收藏歌单"按钮）
 *   右：播放封面入口 + 设置图标
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import { View, StyleSheet, BackHandler } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { useStatusbarHeight } from '@/store/common/hook'
import { useIsPlay, usePlayerMusicInfo } from '@/store/player/hook'
import Text from '@/components/common/Text'
import MarqueeText from '@/components/common/MarqueeText'
import { Icon } from '@/components/common/Icon'
import Image from '@/components/common/Image'
import TVButton from '@/components/common/TVButton'
import PageContent from '@/components/PageContent'
import StatusBar from '@/components/common/StatusBar'
import { setComponentId } from '@/core/common'
import { COMPONENT_IDS } from '@/config/constant'
import { pop } from '@/navigation'
import commonState from '@/store/common/state'
import { navigations } from '@/navigation'
import { type TVMusicDetailParams } from '@/navigation/navigation'

import LeaderboardContent, { type LeaderboardContentType } from './content/LeaderboardContent'
import SonglistContent, { type SonglistContentType } from './content/SonglistContent'
import MylistContent, { type MylistContentType } from './content/MylistContent'

type ContentRef = LeaderboardContentType | SonglistContentType | MylistContentType

// ─── 单行顶部栏 ───────────────────────────────────────────────────────────────
interface DetailTopBarProps {
  title: string
  isSonglist: boolean
  onSearchPress: () => void
  onPlayPress: () => void
  onSettingPress: () => void
  onCollect: () => void
  collected?: boolean
}

const DetailTopBar = ({
  title, isSonglist,
  onSearchPress, onPlayPress, onSettingPress,
  onCollect, collected,
}: DetailTopBarProps) => {
  const theme = useTheme()
  const statusBarHeight = useStatusbarHeight()
  const isPlay = useIsPlay()
  const musicInfo = usePlayerMusicInfo()

  return (
    <View style={[
      tb.root,
      {
        paddingTop: statusBarHeight + 6,
        backgroundColor: theme['c-content-background'],
        borderBottomColor: theme['c-border-background'],
      },
    ]}>
      {/* 左：播放入口 + 歌曲名（有歌曲时显示） */}
      <TVButton style={tb.playBtn} onPress={onPlayPress} borderRadius={22}>
        <View style={tb.playLeft}>
          <View style={[tb.playPic, { backgroundColor: theme['c-border-background'] }]}>
            {musicInfo.pic
              ? <Image url={musicInfo.pic} style={tb.playPicImg} />
              : <Icon name={isPlay ? 'pause' : 'play'} size={20} color={theme['c-primary']} />
            }
          </View>
          {musicInfo.name ? (
            <MarqueeText
              size={13}
              color="#222"
              style={tb.songName}
              width={220}
            >{musicInfo.singer ? `${musicInfo.name} - ${musicInfo.singer}` : musicInfo.name}</MarqueeText>
          ) : null}
        </View>
      </TVButton>

      {/* 中：标题 + 爱心（仅歌单） */}
      <View style={tb.titleWrap}>
        <Text size={18} color={theme['c-font']} style={tb.title} numberOfLines={1}>{title}</Text>
        {isSonglist && (
          <TVButton style={tb.heartBtn} onPress={onCollect} borderRadius={6}>
            <Icon
              name="love"
              size={22}
              color={collected ? theme['c-primary'] : theme['c-font-2']}
            />
          </TVButton>
        )}
      </View>

      {/* 右：搜索 + 设置 */}
      <View style={tb.right}>
        <TVButton style={tb.iconBtn} onPress={onSearchPress} borderRadius={8}>
          <View style={tb.iconWithLabel}>
            <Icon name="search-2" size={22} color={theme['c-font']} />
            <Text size={13} color="#111" style={tb.iconLabel}>搜索</Text>
          </View>
        </TVButton>
        <TVButton style={tb.iconBtn} onPress={onSettingPress} borderRadius={8}>
          <View style={tb.iconWithLabel}>
            <Icon name="setting" size={22} color={theme['c-font']} />
            <Text size={13} color="#111" style={tb.iconLabel}>设置</Text>
          </View>
        </TVButton>
      </View>
    </View>
  )
}

const tb = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  title: { fontWeight: '600', flexShrink: 1 },
  heartBtn: { padding: 6 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { padding: 8, borderRadius: 8 },
  playBtn: { padding: 4, borderRadius: 22 },
  playLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playPic: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  playPicImg: { width: 40, height: 40, borderRadius: 20 },
  songName: { fontWeight: '500' },
  iconWithLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconLabel: { fontWeight: '500' },
})

// ─── 主页面 ───────────────────────────────────────────────────────────────────
export default ({ componentId, params }: { componentId: string; params: TVMusicDetailParams }) => {
  const contentRef = useRef<ContentRef>(null)
  const [collected, setCollected] = useState(false)

  useEffect(() => {
    setComponentId(COMPONENT_IDS.tvMusicDetail, componentId)
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      global.state_event.emit('tvMusicDetailWillPop')
      void pop(componentId)
      return true
    })
    return () => { back.remove() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleBack = useCallback(() => {
    global.state_event.emit('tvMusicDetailWillPop')
    void pop(componentId)
  }, [componentId])

  const openPlayDetail = useCallback(() => {
    if (commonState.componentIds.home) {
      navigations.pushPlayDetailScreen(commonState.componentIds.home)
    }
  }, [])

  const openSearch = useCallback(() => {
    global.state_event.emit('tvMusicDetailWillPop')
    void pop(componentId)
    requestAnimationFrame(() => { global.app_event.emit('tvDetailGotoSearch') })
  }, [componentId])

  const openSetting = useCallback(() => {
    global.state_event.emit('tvMusicDetailWillPop')
    void pop(componentId)
    requestAnimationFrame(() => { global.app_event.emit('tvDetailGotoSetting') })
  }, [componentId])

  const handleCollect = useCallback(() => {
    if (params.type === 'songlist') {
      (contentRef.current as SonglistContentType)?.collect()
      setCollected(prev => !prev)
    }
  }, [params])

  return (
    <PageContent>
      <StatusBar />
      <View style={styles.root}>
        <DetailTopBar
          title={params.name}
          isSonglist={params.type === 'songlist'}
          onSearchPress={openSearch}
          onPlayPress={openPlayDetail}
          onSettingPress={openSetting}
          onCollect={handleCollect}
          collected={collected}
        />

        <View style={styles.content}>
          {params.type === 'leaderboard' && (
            <LeaderboardContent
              ref={contentRef as React.Ref<LeaderboardContentType>}
              id={params.id}
              source={params.source}
            />
          )}
          {params.type === 'songlist' && (
            <SonglistContent
              ref={contentRef as React.Ref<SonglistContentType>}
              id={params.id}
              source={params.source}
            />
          )}
          {params.type === 'mylist' && (
            <MylistContent
              ref={contentRef as React.Ref<MylistContentType>}
              id={params.id}
            />
          )}
        </View>
      </View>
    </PageContent>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'column' },
  content: { flex: 1, paddingHorizontal: 24 },
})
