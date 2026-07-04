/**
 * TV 键盘搜索面板（同级页面版）
 *
 * 左：键盘（abcdefg... 顺序 + 数字接在 z 后面）
 * 右：搜索结果（单列）
 */
import { useEffect, useRef, useState, useCallback, memo, forwardRef, useImperativeHandle } from 'react'
import { View, StyleSheet } from 'react-native'
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
import { setFocusZone } from '../index'

// 字母 + 数字按顺序排列，每行6个
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

export interface TVSearchPanelType {
  /** 把焦点推到键盘第一个按键 */
  focusTopBar: () => void
}

export default memo(forwardRef<TVSearchPanelType>((_, ref) => {
  const theme = useTheme()
  const getLabel = useSourceLabel(true)
  const [input, setInput] = useState('')
  const listRef = useRef<OnlineListType>(null)
  const searchInfoRef = useRef<{ text: string, source: Source }>({ text: '', source: 'kw' })
  const isActiveRef = useRef(false)
  const [activeSource, setActiveSource] = useState<Source>('kw')
  const sources = searchMusicState.sources
  // 键盘第一个键的 ref，back 时用来还焦点
  const firstKeyRef = useRef<TVButtonType>(null)

  useImperativeHandle(ref, () => ({
    focusTopBar() {
      firstKeyRef.current?.requestFocus()
    },
  }))

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

  const handleSelectSource = useCallback((src: Source) => {
    searchInfoRef.current.source = src
    setActiveSource(src)
    void saveSearchSetting({ temp_source: src as LX.OnlineSource })
  }, [])

  const appendChar = useCallback((ch: string) => setInput(p => p + ch), [])
  const backspace   = useCallback(() => setInput(p => p.slice(0, -1)), [])
  const clear       = useCallback(() => setInput(''), [])

  const doSearch = useCallback(() => {
    const text = input.trim()
    if (!text) return
    void addHistoryWord(text)
    searchInfoRef.current.text = text
    listRef.current?.setList([], false, false)
    listRef.current?.setStatus('loading')
    search(text, 1, searchInfoRef.current.source).then(list => {
      if (!isActiveRef.current) return
      listRef.current?.setList(list, false, false)
      const info = searchMusicState.listInfos[searchInfoRef.current.source]!
      listRef.current?.setStatus(info.maxPage <= 1 ? 'end' : 'idle')
    }).catch(() => { listRef.current?.setStatus('error') })
  }, [input])

  const handleRefresh: OnlineListProps['onRefresh'] = () => {
    listRef.current?.setStatus('refreshing')
    search(searchInfoRef.current.text, 1, searchInfoRef.current.source).then(list => {
      if (!isActiveRef.current) return
      listRef.current?.setList(list, false, false)
      const info = searchMusicState.listInfos[searchInfoRef.current.source]!
      listRef.current?.setStatus(info.maxPage <= 1 ? 'end' : 'idle')
    }).catch(() => { listRef.current?.setStatus('error') })
  }

  const handleLoadMore: OnlineListProps['onLoadMore'] = () => {
    listRef.current?.setStatus('loading')
    const info = searchMusicState.listInfos[searchInfoRef.current.source]!
    const page = info?.list.length ? info.page + 1 : 1
    search(searchInfoRef.current.text, page, searchInfoRef.current.source).then(list => {
      if (!isActiveRef.current) return
      listRef.current?.setList(list, true, false)
      listRef.current?.setStatus(info.maxPage <= page ? 'end' : 'idle')
    }).catch(() => { listRef.current?.setStatus('error') })
  }

  const bg      = theme['c-content-background']
  const border  = theme['c-border-background']
  const primary = theme['c-primary'] ?? '#1aad19'

  return (
    <View style={s.root}>
      {/* 左：键盘 */}
      <View style={[s.keyboardWrap, { borderRightColor: border }]}>
        <View style={s.keyboard}>
          {/* 输入显示框 */}
          <View style={[s.inputBox, { backgroundColor: bg, borderColor: border }]}>
            <Icon name="search-2" size={16} color={theme['c-font-label']} />
            <Text size={18} style={s.inputText} numberOfLines={1}>
              {input || '请用遥控器按字母输入...'}
            </Text>
          </View>

          {/* 音乐平台选择栏 */}
          <View style={[s.sourceBar, { borderColor: border }]}>
            {sources.map(src => {
              const active = src === activeSource
              const label = getLabel(src)
              return (
                <TVButton key={src}
                  style={[s.sourceTab, active && { borderBottomColor: primary }]}
                  onPress={() => handleSelectSource(src)}
                  onFocus={() => setFocusZone('topbar')}>
                  <Text size={15} color={active ? primary : undefined}>{label}</Text>
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

          {/* 删除 + 清空 */}
          <View style={[s.keyRow, { marginTop: 4 }]}>
            <TVButton style={[s.keyHalf, { backgroundColor: bg, borderColor: border, borderWidth: 1 }]} onPress={backspace} onFocus={() => setFocusZone('topbar')}>
              <Text size={16}>删除</Text>
            </TVButton>
            <TVButton style={[s.keyHalf, { backgroundColor: bg, borderColor: border, borderWidth: 1 }]} onPress={clear} onFocus={() => setFocusZone('topbar')}>
              <Text size={16}>清空</Text>
            </TVButton>
          </View>

          {/* 搜索 */}
          <View style={s.keyRow}>
            <TVButton style={[s.keyFull, { backgroundColor: bg, borderColor: primary, borderWidth: 1.5 }]} onPress={doSearch} onFocus={() => setFocusZone('topbar')}>
              <Text size={18} color={primary} style={{ fontWeight: '600' }}>搜 索</Text>
            </TVButton>
          </View>
        </View>
      </View>

      {/* 右：结果列表 */}
      <View style={s.results}>
        <OnlineList ref={listRef} onRefresh={handleRefresh} onLoadMore={handleLoadMore}
          checkHomePagerIdle rowType="single" />
      </View>
    </View>
  )
}))

const KEY_H = 54

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  keyboardWrap: {
    width: 460,
    flexShrink: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
    justifyContent: 'flex-start',
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
  keyFull: { flex: 1, height: KEY_H, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  keyText: { textTransform: 'uppercase' },
  results: { flex: 1 },
})
