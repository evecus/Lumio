import { useRef, useState, useMemo, forwardRef, useImperativeHandle } from 'react'
import { FlatList, View, RefreshControl, type FlatListProps } from 'react-native'

import ListItem from './ListItem'
// import { navigations } from '@/navigation'
import { type ListInfoItem } from '@/store/songlist/state'
import { useLayout } from '@/utils/hooks'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { scaleSizeW } from '@/utils/pixelRatio'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { type TVButtonType } from '@/components/common/TVButton'

type FlatListType = FlatListProps<ListInfoItem>

// const MAX_WIDTH = scaleSizeW(110)
// const MIN_WIDTH = scaleSizeW(110)
const NUM_COLUMNS = 5
const GAP = scaleSizeW(20)

export interface ListProps {
  onRefresh: () => void
  onLoadMore: () => void
  onOpenDetail: (item: ListInfoItem, index: number, btn: TVButtonType) => void
}
export type Status = 'loading' | 'refreshing' | 'end' | 'error' | 'idle'

export interface ListType {
  setList: (list: ListInfoItem[], showSource?: boolean) => void
  setStatus: (val: Status) => void
}

export default forwardRef<ListType, ListProps>(({ onRefresh, onLoadMore, onOpenDetail }, ref) => {
  const flatListRef = useRef<FlatList>(null)
  const [currentList, setList] = useState<ListInfoItem[]>([])
  const [showSource, setShowSource] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const { onLayout, width } = useLayout()
  const theme = useTheme()
  // console.log('render songlist')

  useImperativeHandle(ref, () => ({
    setList(list, showSource = false) {
      // rawListRef.current = list
      setList(list)
      setShowSource(showSource)
    },
    setStatus(val) {
      setStatus(val)
    },
  }))

  const handleLoadMore = () => {
    if (status != 'idle') return
    onLoadMore()
  }

  const renderItem: FlatListType['renderItem'] = ({ item, index }) => (
    <ListItem
      item={item}
      index={index}
      width={itemWidth}
      showSource={showSource}
      onPress={onOpenDetail}
    />
  )
  const getkey: FlatListType['keyExtractor'] = item => item.id
  // const getItemLayout: FlatListType['getItemLayout'] = (data, index) => {
  //   return { length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }
  // }
  const refreshControl = useMemo(() => (
    <RefreshControl
      colors={[theme['c-primary']]}
      // progressBackgroundColor={theme.primary}
      refreshing={status == 'refreshing'}
      onRefresh={onRefresh} />
  ), [status, onRefresh, theme])
  const footerComponent = useMemo(() => {
    let label: FooterLabel
    switch (status) {
      case 'refreshing': return null
      case 'loading':
        label = 'list_loading'
        break
      case 'end':
        label = 'list_end'
        break
      case 'error':
        label = 'list_error'
        break
      case 'idle':
        label = null
        break
    }
    return (
      <View style={{ width: '100%' }}>
        <Footer label={label} onLoadMore={onLoadMore} />
      </View>
    )
  }, [onLoadMore, status])


  // const itemWidth = useMemo(() => {
  //   let itemWidth = Math.max(Math.trunc(width * 0.125), MAX_WIDTH)
  //   // if (itemWidth < )
  // }, [width])
  // const computedItemWidth = useMemo(() => {
  //   let w = width - GAP
  //   let n = width / (MIN_WIDTH + GAP)
  //   if (n > 10) n = 10
  //   return Math.floor(w / n)
  // }, [width])
  // console.log(Math.trunc(width * 0.125), itemWidth)
  // console.log(itemWidth, MIN_WIDTH, GAP, width)
  const itemWidth = useMemo(() => (width - GAP) / NUM_COLUMNS, [width])
  // console.log(rowNum)
  const list = useMemo(() => {
    const list = [...currentList]
    let whiteItemNum = (list.length % NUM_COLUMNS)
    if (whiteItemNum > 0) whiteItemNum = NUM_COLUMNS - whiteItemNum
    for (let i = 0; i < whiteItemNum; i++) {
      list.push({
        id: `white__${i}`,
        play_count: '',
        author: '',
        name: '',
        img: '',
        desc: '',
        // @ts-expect-error
        source: '',
      })
    }
    return list
  }, [currentList])
  // console.log(listInfo.list.map((item) => item.id))

  return (
    <View style={styles.container} onLayout={onLayout}>
      {
        width == 0
          ? null
          : (
              <FlatList
                key={String(NUM_COLUMNS)}
                ref={flatListRef}
                style={styles.list}
                columnWrapperStyle={{ justifyContent: 'space-evenly' }}
                numColumns={NUM_COLUMNS}
                data={list}
                maxToRenderPerBatch={4}
                // updateCellsBatchingPeriod={80}
                windowSize={8}
                removeClippedSubviews={false}
                // initialNumToRender={12}
                renderItem={renderItem}
                keyExtractor={getkey}
                // getItemLayout={getItemLayout}
                // onRefresh={onRefresh}
                // refreshing={refreshing}
                onEndReachedThreshold={0.6}
                onEndReached={handleLoadMore}
                refreshControl={refreshControl}
                ListFooterComponent={footerComponent}
              />
            )
      }
    </View>
  )
})

type FooterLabel = 'list_loading' | 'list_end' | 'list_error' | null
const Footer = ({ label, onLoadMore }: {
  label: FooterLabel
  onLoadMore: () => void
}) => {
  const theme = useTheme()
  const t = useI18n()
  const handlePress = () => {
    if (label != 'list_error') return
    onLoadMore()
  }
  return (
    label
      ? (
          <View>
            <Text onPress={handlePress} style={styles.footer} color={theme['c-font-label']}>{t(label)}</Text>
          </View>
        )
      : null
  )
}


const styles = createStyle({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  list: {
    flex: 1,
    paddingLeft: 10,
    paddingRight: 10,
  },
  footer: {
    textAlign: 'center',
    padding: 10,
  },
})
