import searchState from '@/store/search/state'
import searchActions from '@/store/search/action'
import { getSearchHistory as getSearchHistoryFromStore, saveSearchHistory } from '@/utils/data'
import settingState from '@/store/setting/state'


export const setSearchType: typeof searchActions['setSearchType'] = (type) => {
  searchActions.setSearchType(type)
}
export const setSearchText: typeof searchActions['setSearchText'] = (text) => {
  searchActions.setSearchText(text)
}
export const setTipListInfo: typeof searchActions['setTipListInfo'] = (text, source) => {
  searchActions.setTipListInfo(text, source)
}
export const setTipList: typeof searchActions['setTipList'] = (list) => {
  searchActions.setTipList(list)
}

export const getSearchHistory = async() => {
  if (!searchState.historyList.length) searchActions.setHistoryWord(await getSearchHistoryFromStore())
  return searchState.historyList
}
/**
 * 记录一次搜索关键词到历史
 * @param word 关键词
 * @param force 是否忽略「search.isShowHistorySearch」这个全局设置强制记录
 *              （目前仅 TV 搜索页会传 true：历史搜索在 TV 端是页面自身的固定
 *              展示模块，不应该受这个原本面向旧版手机端 UI 的设置项影响）
 */
export const addHistoryWord = async(word: string, force = false) => {
  if ((!force && !settingState.setting['search.isShowHistorySearch']) || !word) return
  if (!searchState.historyList.length) searchActions.setHistoryWord(await getSearchHistoryFromStore())
  const list = searchActions.addHistoryWord(word)
  if (!list) return
  void saveSearchHistory(list)
}
export const removeHistoryWord = (index: number) => {
  const list = searchActions.removeHistoryWord(index)
  void saveSearchHistory(list)
}
export const clearHistoryList = () => {
  const list = searchActions.clearHistoryList()
  void saveSearchHistory(list)
}
