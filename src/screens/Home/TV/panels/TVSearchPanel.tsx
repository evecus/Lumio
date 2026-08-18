/**
 * TV 键盘搜索面板 — 三栏布局
 *
 * 左栏 : 键盘 + 搜索框（无搜索按钮）
 * 中栏 : 根据 stage 三态切换（不用分割线分隔两列，靠留白区分）
 *        - 'discover'（默认，未搜索）：左 = 热门搜索，右 = 搜索历史
 *        - 'typing'  （正在输入）    ：左 = 搜索建议，右 = 搜索历史
 *        - 'result'  （已发起搜索）  ：中栏隐藏，右栏搜索结果区独占剩余空间
 * 右栏 : 搜索结果列表（'result' 阶段两列显示，行内不显示「···」更多按钮）
 */
import {
  useEffect, useRef, useState, useCallback, memo, forwardRef,
  useImperativeHandle,
} from 'react'
import { View, StyleSheet, ScrollView, DeviceEventEmitter } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import TVButton, { type TVButtonType } from '@/components/common/TVButton'
import OnlineList, { type OnlineListType, type OnlineListProps } from '@/components/OnlineList'
import { search } from '@/core/search/music'
import searchMusicState from '@/store/search/music/state'
import { addHistoryWord, getSearchHistory } from '@/core/search/search'
import { getList as getHotSearchList } from '@/core/hotSearch'
import { getSearchSetting, saveSearchSetting } from '@/utils/data'
import commonState from '@/store/common/state'
import type { Source } from '@/store/search/music/state'
import { useSourceLabel } from '@/utils/hooks/useSourceLabel'
import musicSdk from '@/utils/musicSdk'
import { setFocusZone } from '../index'

// ─── 键盘按键定义 ────────────────────────────────────────────────────────────
const ALL_KEYS = [
  'a','b','c','d','e','f',
  'g','h','i','j','k','l',
  'm','n','o','p','q','r',
  's','t','u','v','w','x',
  'y','z','1','2','3','4',
  '5','6','7','8','9','0',
]
const COLS = 6
const ROWS: string[][] = []
for (let i = 0; i < ALL_KEYS.length; i += COLS) {
  ROWS.push(ALL_KEYS.slice(i, i + COLS))
}

// ─── 防抖工具 ────────────────────────────────────────────────────────────────
function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { fn(...args); timer = null }, ms)
  }
}

// ─── 中栏三态 ────────────────────────────────────────────────────────────────
type Stage = 'discover' | 'typing' | 'result'

// ─── 接口 ────────────────────────────────────────────────────────────────────
export interface TVSearchPanelType {
  focusTopBar: () => void
}

// ═══════════════════════════════════════════════════════════════════════════════
export default memo(forwardRef<TVSearchPanelType>((_, ref) => {
  const theme       = useTheme()
  const getLabel    = useSourceLabel(true)
  const [input, setInput]           = useState('')
  const [stage, setStage]           = useState<Stage>('discover')
  const [tipList, setTipList]       = useState<string[]>([])
  const [hotList, setHotList]       = useState<string[]>([])
  const [historyList, setHistoryListState] = useState<string[]>([])
  const [activeSource, setActiveSource] = useState<Source>('kw')

  const listRef        = useRef<OnlineListType>(null)
  const searchInfoRef  = useRef<{ text: string; source: Source }>({ text: '', source: 'kw' })
  const firstKeyRef    = useRef<TVButtonType>(null)
  const sources        = searchMusicState.sources
  // 用于取消正在进行的搜索请求
  const cancelSearchRef = useRef<(() => void) | null>(null)
  // 用于丢弃过期的热门搜索请求结果（快速切换平台时）
  const hotListReqIdRef = useRef(0)
  // 镜像 stage 到 ref，供 tvMenuKey 事件监听器读取最新值（避免因监听器闭包
  // 捕获旧值而误判，同时也不必让监听器随 stage 变化反复重新订阅）
  const stageRef = useRef<Stage>('discover')
  useEffect(() => { stageRef.current = stage }, [stage])

  // 遥控器菜单键：搜索结果阶段若有歌曲行聚焦，弹出该歌曲的操作菜单
  // （搜索结果行本身不显示"···"按钮，菜单键是该场景下唯一的呼出方式）
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('tvMenuKey', () => {
      if (commonState.navActiveId !== 'nav_search') return
      if (stageRef.current !== 'result') return
      listRef.current?.tryOpenMenuForFocused()
    })
    return () => { sub.remove() }
  }, [])

  // 把焦点还给键盘第一个键（供父组件调用）
  useImperativeHandle(ref, () => ({
    focusTopBar() { firstKeyRef.current?.requestFocus() },
  }))

  // 监听导航激活
  useEffect(() => {
    const handler = (newId: string) => {
      if (newId === 'nav_search') {
        void getSearchSetting().then(info => {
          const src = info.temp_source as Source
          searchInfoRef.current.source = src
          setActiveSource(src)
        })
      }
    }
    global.state_event.on('navActiveIdUpdated', handler)
    // 组件本身是常驻挂载（display:none），首次 mount 的时机可能早于用户
    // 真正切换到搜索面板（甚至早于应用启动时恢复上次页面的 setNavActiveId 调用），
    // 所以这里额外用当前的 commonState.navActiveId 主动同步一次，
    // 不能只依赖“之后才发生”的 navActiveIdUpdated 事件。
    if (commonState.navActiveId === 'nav_search') handler('nav_search')
    return () => { global.state_event.off('navActiveIdUpdated', handler) }
  }, [])

  // ── 拉取搜索历史 ──────────────────────────────────────────────────────────
  // 历史搜索在 TV 搜索页固定展示，不受「search.isShowHistorySearch」这个
  // 面向旧版手机端 UI 的全局设置影响，所以这里不再依赖那个设置去读取。
  useEffect(() => {
    void getSearchHistory().then(list => { setHistoryListState([...list]) })
  }, [])

  // ── 拉取热门搜索（随平台切换重新拉取）─────────────────────────────────────
  useEffect(() => {
    const reqId = ++hotListReqIdRef.current
    setHotList([])
    void getHotSearchList(activeSource).then(list => {
      if (reqId !== hotListReqIdRef.current) return // 已被更新的请求顶替，丢弃过期结果
      setHotList(list ?? [])
    })
  }, [activeSource])

  // ── 平台切换 ──────────────────────────────────────────────────────────────
  const handleSelectSource = useCallback((src: Source) => {
    searchInfoRef.current.source = src
    setActiveSource(src)
    void saveSearchSetting({ temp_source: src as LX.OnlineSource })
    // 切换平台后，用当前输入刷新建议
    if (input.trim()) {
      fetchTipList(input.trim(), src)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input])

  // ── tipSearch 请求（防抖 200ms） ──────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchTipList = useCallback(
    debounce((keyword: string, source: Source) => {
      const sdk = source !== 'all' ? (musicSdk as any)[source] : null
      if (!sdk?.tipSearch?.search) { setTipList([]); return }
      sdk.tipSearch.search(keyword)
        .then((list: string[]) => { setTipList(list ?? []) })
        .catch(() => { setTipList([]) })
    }, 200),
    [],
  )

  // ── 键盘操作 ──────────────────────────────────────────────────────────────
  const appendChar = useCallback((ch: string) => {
    setInput(prev => {
      const next = prev + ch
      setStage('typing')
      fetchTipList(next.trim(), searchInfoRef.current.source)
      return next
    })
  }, [fetchTipList])

  const backspace = useCallback(() => {
    setInput(prev => {
      const next = prev.slice(0, -1)
      if (next.trim()) {
        setStage('typing')
        fetchTipList(next.trim(), searchInfoRef.current.source)
      } else {
        // 删空了，回到发现页（历史+热门）
        setTipList([])
        setStage('discover')
      }
      return next
    })
  }, [fetchTipList])

  // ── 清空：完全回到「历史搜索 + 热门搜索」视图，不保留上次的搜索结果 ──────
  const clear = useCallback(() => {
    setInput('')
    setTipList([])
    setStage('discover')
    if (cancelSearchRef.current) { cancelSearchRef.current(); cancelSearchRef.current = null }
    listRef.current?.setList([], false, false)
    listRef.current?.setStatus('idle')
  }, [])

  // ── 取消当前搜索：视为清空，统一回到发现页 ────────────────────────────────
  const cancelSearch = useCallback(() => {
    clear()
  }, [clear])

  // ── 实际搜索（点击建议词 / 热门搜索 / 历史搜索 / 搜索按钮） ───────────────
  const doSearch = useCallback((text: string) => {
    const keyword = text.trim()
    if (!keyword) return
    if (cancelSearchRef.current) { cancelSearchRef.current(); cancelSearchRef.current = null }
    let cancelled = false
    cancelSearchRef.current = () => { cancelled = true }

    // 历史搜索在 TV 端固定记录，强制忽略「search.isShowHistorySearch」设置
    void addHistoryWord(keyword, true).then(() => {
      void getSearchHistory().then(list => { setHistoryListState([...list]) })
    })

    setStage('result')
    searchInfoRef.current.text = keyword
    listRef.current?.setList([], false, false)
    listRef.current?.setStatus('loading')
    search(keyword, 1, searchInfoRef.current.source)
      .then(list => {
        // 仅用 cancelled 判断该次请求是否已被取消/被新请求顶替；
        // 不再用 isActiveRef 来决定要不要更新 UI —— 之前这里一旦
        // isActiveRef.current 是 false（例如面板常驻挂载导致的时序问题，
        // 或用户短暂切走过 nav），就会直接 return，既不设置列表也不
        // 更新 status，导致右栏永远停在“加载中...”，看起来就像“搜不到”。
        if (cancelled) return
        cancelSearchRef.current = null
        listRef.current?.setList(list, false, false)
        const info = searchMusicState.listInfos[searchInfoRef.current.source]!
        listRef.current?.setStatus(info.maxPage <= 1 ? 'end' : 'idle')
        // 搜索完成后焦点自动移到第一个结果
        listRef.current?.focusFirstItem()
      })
      .catch(() => { if (!cancelled) listRef.current?.setStatus('error') })
  }, [])

  // ── 点击建议词 / 热门搜索 / 历史搜索词 ────────────────────────────────────
  const handleTipPress = useCallback((word: string) => {
    setInput(word)
    setTipList([])
    doSearch(word)
  }, [doSearch])

  // ── 结果列表刷新 / 加载更多 ───────────────────────────────────────────────
  const handleRefresh: OnlineListProps['onRefresh'] = () => {
    listRef.current?.setStatus('refreshing')
    search(searchInfoRef.current.text, 1, searchInfoRef.current.source)
      .then(list => {
        listRef.current?.setList(list, false, false)
        const info = searchMusicState.listInfos[searchInfoRef.current.source]!
        listRef.current?.setStatus(info.maxPage <= 1 ? 'end' : 'idle')
      })
      .catch(() => { listRef.current?.setStatus('error') })
  }

  const handleLoadMore: OnlineListProps['onLoadMore'] = () => {
    listRef.current?.setStatus('loading')
    const info = searchMusicState.listInfos[searchInfoRef.current.source]!
    const page = info?.list.length ? info.page + 1 : 1
    search(searchInfoRef.current.text, page, searchInfoRef.current.source)
      .then(list => {
        listRef.current?.setList(list, true, false)
        listRef.current?.setStatus(info.maxPage <= page ? 'end' : 'idle')
      })
      .catch(() => { listRef.current?.setStatus('error') })
  }

  // ── 主题色 ────────────────────────────────────────────────────────────────
  const bg      = theme['c-content-background']
  const border  = theme['c-border-background']
  const primary = theme['c-primary'] ?? '#1aad19'
  const fontLabel = theme['c-font-label']

  // ── 渲染标签（热门搜索 / 搜索历史 / 搜索建议 共用，统一为流式排列的胶囊按钮，
  //    避免三种入口视觉不一致显得违和） ───────────────────────────────────
  const renderWordTag = useCallback((word: string, key: string) => (
    <TVButton
      key={key}
      style={[s.tag, { backgroundColor: bg, borderColor: border }]}
      onPress={() => handleTipPress(word)}
      onFocus={() => setFocusZone('topbar')}
    >
      <Text numberOfLines={1} size={14} style={s.tagText}>{word}</Text>
    </TVButton>
  ), [bg, border, handleTipPress])

  // ── 中栏左列内容（热门搜索 / 搜索建议，取决于 stage）──────────────────────
  const renderLeftCol = () => {
    if (stage === 'typing') {
      return (
        <>
          <View style={[s.tipHeader, { borderBottomColor: border }]}>
            <Text size={13} color={fontLabel}>搜索建议</Text>
          </View>
          {tipList.length === 0 ? (
            <View style={s.tipEmpty}>
              <Text size={13} color={fontLabel}>输入字母获取建议</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={s.discoverList}
              contentContainerStyle={s.tagWrap}
            >
              {tipList.map((word, i) => renderWordTag(word, `tip_${i}_${word}`))}
            </ScrollView>
          )}
        </>
      )
    }
    // stage === 'discover'：左列显示热门搜索
    return (
      <>
        <View style={[s.tipHeader, { borderBottomColor: border }]}>
          <Text size={13} color={fontLabel}>热门搜索</Text>
        </View>
        {hotList.length === 0 ? (
          <View style={s.tipEmpty}>
            <Text size={13} color={fontLabel}>暂无热门搜索</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={s.discoverList}
            contentContainerStyle={s.tagWrap}
          >
            {hotList.map((word, i) => renderWordTag(word, `hot_${i}_${word}`))}
          </ScrollView>
        )}
      </>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>

      {/* ══ 左栏：键盘 ══ */}
      <View style={[s.keyboardWrap, { borderRightColor: border }]}>
        <View style={s.keyboard}>

          {/* 搜索框 */}
          <View style={[s.inputBox, { backgroundColor: bg, borderColor: border }]}>
            <Icon name="search-2" size={16} color={fontLabel} />
            <Text size={18} style={s.inputText} numberOfLines={1}>
              {input || '请用遥控器按字母输入...'}
            </Text>
          </View>

          {/* 平台选择栏 — 单行，内容多时可横向滚动 */}
          <View style={[s.sourceBar, { borderColor: border }]}>
            {sources.map(src => {
              const active = src === activeSource
              return (
                <TVButton key={src}
                  style={[s.sourceTab, active && { borderBottomColor: primary }]}
                  onPress={() => handleSelectSource(src)}
                  onFocus={() => setFocusZone('topbar')}>
                  <Text size={15} color={active ? primary : undefined}>{getLabel(src)}</Text>
                </TVButton>
              )
            })}
          </View>

          {/* 字母 + 数字键 */}
          {ROWS.map((row, ri) => (
            <View key={ri} style={s.keyRow}>
              {row.map((ch, ci) => (
                <TVButton
                  key={ch}
                  ref={ri === 0 && ci === 0 ? firstKeyRef : undefined}
                  style={[s.key, { backgroundColor: bg }]}
                  onPress={() => appendChar(ch)}
                  onFocus={() => setFocusZone('topbar')}
                  hasTVPreferredFocus={ri === 0 && ci === 0}
                >
                  <Text size={20} style={s.keyText}>{ch}</Text>
                </TVButton>
              ))}
            </View>
          ))}

          {/* 第一行：删除 | 清空 */}
          <View style={[s.keyRow, { marginTop: 4 }]}>
            <TVButton
              style={[s.keyHalf, { backgroundColor: bg, borderColor: border, borderWidth: 1 }]}
              onPress={backspace}
              onFocus={() => setFocusZone('topbar')}>
              <Text size={16}>删除</Text>
            </TVButton>
            <TVButton
              style={[s.keyHalf, { backgroundColor: bg, borderColor: border, borderWidth: 1 }]}
              onPress={clear}
              onFocus={() => setFocusZone('topbar')}>
              <Text size={16}>清空</Text>
            </TVButton>
          </View>

          {/* 第二行：搜索 | 取消 */}
          <View style={s.keyRow}>
            <TVButton
              style={[s.keyHalf, { backgroundColor: bg, borderColor: primary, borderWidth: 1.5 }]}
              onPress={() => doSearch(input)}
              onFocus={() => setFocusZone('topbar')}>
              <Text size={16} color={primary} style={{ fontWeight: '600' }}>搜索</Text>
            </TVButton>
            <TVButton
              style={[s.keyHalf, { backgroundColor: bg, borderColor: border, borderWidth: 1 }]}
              onPress={cancelSearch}
              onFocus={() => setFocusZone('topbar')}>
              <Text size={16}>取消</Text>
            </TVButton>
          </View>

        </View>
      </View>

      {/* ══ 中栏：discover / typing 时显示左右两列，result 时整体隐藏 ══ */}
      {stage === 'result' ? null : (
        <View style={[s.discoverWrap, { borderRightColor: border }]}>
          {/* 左列：热门搜索（discover） 或 搜索建议（typing） */}
          <View style={s.discoverCol}>
            {renderLeftCol()}
          </View>

          {/* 右列：搜索历史（discover 和 typing 阶段都显示） */}
          <View style={s.discoverCol}>
            <View style={[s.tipHeader, { borderBottomColor: border }]}>
              <Text size={13} color={fontLabel}>搜索历史</Text>
            </View>
            {historyList.length === 0 ? (
              <View style={s.tipEmpty}>
                <Text size={13} color={fontLabel}>暂无搜索历史</Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={s.discoverList}
                contentContainerStyle={s.tagWrap}
              >
                {historyList.map((word, i) => renderWordTag(word, `his_${i}_${word}`))}
              </ScrollView>
            )}
          </View>
        </View>
      )}

      {/* ══ 右栏：搜索结果 ══
          OnlineList 需要始终保持挂载（不能用 stage === 'result' 卸载/重建），
          否则 doSearch 里紧跟 setStage('result') 之后立刻调用的
          listRef.current?.setList/setStatus 会因为组件还没挂载完成、
          ref 尚未就绪而被 `?.` 悄悄跳过，表现为“点了搜索但列表没反应”。
          所以这里始终渲染，仅用 display 控制其余 stage 下不显示。 */}
      <View style={[s.results, { paddingHorizontal: 8, display: stage === 'result' ? 'flex' : 'none' }]}>
        <OnlineList
          ref={listRef}
          onRefresh={handleRefresh}
          onLoadMore={handleLoadMore}
          checkHomePagerIdle
          rowType="double"
          hideMoreButton
          allowOverflow
        />
      </View>

    </View>
  )
}))

// ─── 样式 ────────────────────────────────────────────────────────────────────
const KEY_H = 54

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },

  // 左栏 — 键盘
  keyboardWrap: {
    width: 460,
    flexShrink: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingTop: 16,
  },
  keyboard: { gap: 7 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 54,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 4,
  },
  inputText: { flex: 1 },
  sourceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 2,
    marginBottom: 4,
  },
  sourceTab: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  keyRow: { flexDirection: 'row', gap: 5 },
  key: { flex: 1, height: KEY_H, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  keyHalf: { flex: 1, height: KEY_H, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  keyText: { textTransform: 'uppercase' },

  // 中栏 — discover / typing 两态共用的“左右两列”容器
  // 注意：两列之间故意不加分割线（需求明确要求不用分割线分隔），
  // 靠列间距 + 各自内部的 padding 做视觉区分
  discoverWrap: {
    flex: 1,
    flexDirection: 'row',
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  discoverCol: {
    flex: 1,
  },
  discoverList: { flex: 1, overflow: 'visible' },

  // 各列的标题栏（“热门搜索”/“搜索历史”/“搜索建议”）
  tipHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tipEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  // 标签流（热门搜索 / 搜索历史 / 搜索建议 三者共用同一套胶囊按钮样式）
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingTop: 10,
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 200,
  },
  tagText: {},

  // 右栏 — 搜索结果（仅 result 阶段渲染，占满剩余空间）
  results: { flex: 1 },
})
