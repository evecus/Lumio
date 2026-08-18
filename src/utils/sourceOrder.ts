import settingState from '@/store/setting/state'

/**
 * 根据用户在设置中自定义的顺序（common.sourceOrder）对平台列表重新排序
 *
 * 规则：
 * - 未设置自定义顺序（空数组）时，原样返回，保持默认顺序
 * - 已设置时，按自定义顺序排列；未出现在自定义顺序中的平台（例如后续新增的音源）
 *   自动追加到末尾，避免被“吞掉”
 *
 * @param list 原始平台列表（保持原有顺序、结构不变）
 */
export const getOrderedSources = <T extends { id: string }>(list: T[]): T[] => {
  const order = settingState.setting['common.sourceOrder']
  if (!order?.length) return list

  const listMap = new Map(list.map(item => [item.id, item]))
  const ordered: T[] = []

  for (const id of order) {
    const item = listMap.get(id)
    if (!item) continue
    ordered.push(item)
    listMap.delete(id)
  }
  // 追加自定义顺序中未包含的平台，保持它们原有的相对顺序
  for (const item of list) {
    if (listMap.has(item.id)) ordered.push(item)
  }

  return ordered
}
