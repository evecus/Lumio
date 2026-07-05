/**
 * TV 键盘搜索面板 — 三栏布局
 *
 * 左栏  : 键盘 + 搜索框（无搜索按钮）
 * 中栏  : tipSearch 搜索建议列表（点击建议词直接搜索）
 * 右栏  : 搜索结果列表
 */
import {
  useEffect, useRef, useState, useCallback, memo, forwardRef,
  useImperativeHandle,
} from 'react'
import { View, StyleSheet, FlatList } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import TVButton, { type TVButtonType } from '@/components/common/TVButton'
import OnlineList, { type OnlineListType, type OnlineListProps } from '@/components/OnlineList'
import { search } from '@/core/search/music'
import searchMusicState from '@/store/search/music/state'
import { addHistoryWord } from '@/core/search/search'
import { getSearchSetting, saveSearchSetting } from '@/utils/data'
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

// ─── 接口 ────────────────────────────────────────────────────────────────────
export interface TVSearchPanelType {
  focusTopBar: () => void
}

// ═══════════════════════════════════════════════════════════════════════════════
export default memo(forwardRef<TVSearchPanelType>((_, ref) => {
  const theme       = useTheme()
  const getLabel    = useSourceLabel(true)
  const [input, setInput]           = useState('')
  const [tipList, setTipList]       = useState<string[]>([])
  const [activeSource, setActiveSource] = useState<Source>('kw')

  const listRef        = useRef<OnlineListType>(null)
  const searchInfoRef  = useRef<{ text: string; source: Source }>({ text: '', source: 'kw' })
  const isActiveRef    = useRef(false)
  const firstKeyRef    = useRef<TVButtonType>(null)
  const sources        = searchMusicState.sources
  // 用于取消正在进行的搜索请求
  const cancelSearchRef = useRef<(() => void) | null>(null)

  // 把焦点还给键盘第一个键（供父组件调用）
  useImperativeHandle(ref, () => ({
    focusTopBar() { firstKeyRef.current?.requestFocus() },
  }))

  // 监听导航激活
  useEffect(() => {
    const handler = (newId: string) => {
      if (newId === 'nav_search') {
        isActiveRef.current = true
        void getSearchSetting().then(info => {
          const src = info.temp_source as Source
          searchInfoRef.current.source = src
          setActiveSource(src)
        })
      } else {
        isActiveRef.current = false
      }
    }
    global.state_event.on('navActiveIdUpdated', handler)
    return () => { global.state_event.off('navActiveIdUpdated', handler) }
  }, [])

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
      fetchTipList(next.trim(), searchInfoRef.current.source)
      return next
    })
  }, [fetchTipList])

  const backspace = useCallback(() => {
    setInput(prev => {
      const next = prev.slice(0, -1)
      if (next.trim()) {
        fetchTipList(next.trim(), searchInfoRef.current.source)
      } else {
        setTipList([])
      }
      return next
    })
  }, [fetchTipList])

  const clear = useCallback(() => {
    setInput('')
    setTipList([])
  }, [])

  // ── 取消当前搜索 ──────────────────────────────────────────────────────────
  const cancelSearch = useCallback(() => {
    if (cancelSearchRef.current) {
      cancelSearchRef.current()
      cancelSearchRef.current = null
    }
    listRef.current?.setStatus('idle')
  }, [])

  // ── 实际搜索（点击建议词） ────────────────────────────────────────────────
  const doSearch = useCallback((text: string) => {
    const keyword = text.trim()
    if (!keyword) return
    if (cancelSearchRef.current) { cancelSearchRef.current(); cancelSearchRef.current = null }
    let cancelled = false
    cancelSearchRef.current = () => { cancelled = true }
    void addHistoryWord(keyword)
    searchInfoRef.current.text = keyword
    listRef.current?.setList([], false, false)
    listRef.current?.setStatus('loading')
    search(keyword, 1, searchInfoRef.current.source)
      .then(list => {
        if (cancelled || !isActiveRef.current) return
        cancelSearchRef.current = null
        listRef.current?.setList(list, false, false)
        const info = searchMusicState.listInfos[searchInfoRef.current.source]!
        listRef.current?.setStatus(info.maxPage <= 1 ? 'end' : 'idle')
      })
      .catch(() => { if (!cancelled) listRef.current?.setStatus('error') })
  }, [])

  // ── 点击建议词 ────────────────────────────────────────────────────────────
  const handleTipPress = useCallback((word: string) => {
    setInput(word)
    doSearch(word)
  }, [doSearch])

  // ── 结果列表刷新 / 加载更多 ───────────────────────────────────────────────
  const handleRefresh: OnlineListProps['onRefresh'] = () => {
    listRef.current?.setStatus('refreshing')
    search(searchInfoRef.current.text, 1, searchInfoRef.current.source)
      .then(list => {
        if (!isActiveRef.current) return
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
        if (!isActiveRef.current) return
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

  // ── 渲染建议词条目（只显示文字，无图标） ─────────────────────────────────
  const renderTipItem = useCallback(({ item, index }: { item: string; index: number }) => (
    <TVButton
      key={index}
      style={[s.tipItem, { borderBottomColor: border }]}
      onPress={() => handleTipPress(item)}
      onFocus={() => setFocusZone('topbar')}
    >
      <Text numberOfLines={1} size={15} style={s.tipText}>{item}</Text>
    </TVButton>
  ), [border, handleTipPress])

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

      {/* ══ 中栏：搜索建议 ══ */}
      <View style={[s.tipWrap, { borderRightColor: border }]}>
        {/* 标题行 */}
        <View style={[s.tipHeader, { borderBottomColor: border }]}>
          <Text size={13} color={fontLabel}>搜索建议</Text>
        </View>

        {tipList.length === 0 ? (
          <View style={s.tipEmpty}>
            <Text size={13} color={fontLabel}>输入字母获取建议</Text>
          </View>
        ) : (
          <FlatList
            data={tipList}
            keyExtractor={(_, i) => String(i)}
            renderItem={renderTipItem}
            showsVerticalScrollIndicator={false}
            style={s.tipList}
          />
        )}
      </View>

      {/* ══ 右栏：搜索结果 ══ */}
      <View style={s.results}>
        <OnlineList
          ref={listRef}
          onRefresh={handleRefresh}
          onLoadMore={handleLoadMore}
          checkHomePagerIdle
          rowType="single"
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

  // 中栏 — 搜索建议
  tipWrap: {
    width: 180,
    flexShrink: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  tipHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tipList: { flex: 1 },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tipText: { flex: 1 },
  tipEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  // 右栏 — 搜索结果
  results: { flex: 1 },
})
