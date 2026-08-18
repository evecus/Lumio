/**
 * useSourceLabel - 根据设置返回平台名称
 *
 * 读取 common.sourceNameType（real / alias），通过 i18n 取完整名称。
 *
 * @param stripMusic  true = 去掉末尾"音乐"两字（用于搜索页等空间紧凑场景）
 *                    false（默认）= 返回完整名称（用于歌单页等）
 *
 * 例（real 模式）：
 *   stripMusic=false → "酷我音乐"
 *   stripMusic=true  → "酷我"
 *
 * 例（alias 模式）：
 *   stripMusic=false → "小蜗音乐"
 *   stripMusic=true  → "小蜗"
 */
import { useCallback } from 'react'
import { useSettingValue } from '@/store/setting/hook'
import { useI18n } from '@/lang'

export const useSourceLabel = (stripMusic = false) => {
  const sourceNameType = useSettingValue('common.sourceNameType')
  const t = useI18n()

  const getLabel = useCallback((src: string): string => {
    const full = t(`source_${sourceNameType}_${src}` as any) as string
    if (stripMusic && full.endsWith('音乐')) return full.slice(0, -2)
    return full
  }, [sourceNameType, t, stripMusic])

  return getLabel
}
