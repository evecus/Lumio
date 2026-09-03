/**
 * ScaledStage — 整体等比缩放 + 留白容器
 *
 * 把子内容当成一块固定尺寸（CANVAS_WIDTH x CANVAS_HEIGHT）的“设计画布”，
 * 整体等比缩放去适应真实设备屏幕，多余空间留白、画布居中显示。
 *
 * 效果类似视频播放器的原始比例播放（letterbox / pillarbox）：
 * - 设备比画布更“宽”（比如画布 16:9，设备是 21:9 超宽屏）
 *   → 用高度撑满，两边留白（pillarbox）
 * - 设备比画布更“窄/更长”（比如画布 16:9，设备是 4:3 或竖屏）
 *   → 用宽度撑满，上下留白（letterbox）
 *
 * 因为宽高用同一个 scale，画布内部的宽高比永远和设计时一致，
 * 不会出现拉伸/压扁的畸变。
 *
 * 画布内部所有组件按 CANVAS_WIDTH x CANVAS_HEIGHT 这个固定坐标系编写
 * 像素值即可（可直接理解为在 1920x1080 分辨率下量出来的真实像素），
 * 不需要再关心真实设备屏幕尺寸。
 */
import { useState, useCallback, type ReactNode } from 'react'
import { View, StyleSheet, useWindowDimensions } from 'react-native'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/config/canvas'
import { useTheme } from '@/store/theme/hook'

export default ({ children }: { children: ReactNode }) => {
  const theme = useTheme()
  // 优先用容器实测尺寸（更可靠，尤其是某些 TV 设备上 useWindowDimensions
  // 拿到的初始值不准确或者和真实可用区域有出入），拿不到时退回窗口尺寸
  const window = useWindowDimensions()
  const [measured, setMeasured] = useState({ width: 0, height: 0 })

  const onLayout = useCallback((e: any) => {
    const { width, height } = e.nativeEvent.layout
    setMeasured(prev => (prev.width === width && prev.height === height) ? prev : { width, height })
  }, [])

  const containerW = measured.width || window.width
  const containerH = measured.height || window.height

  // 取较小的缩放比例，保证宽高同比缩放，画布比例不变形；
  // 多余空间由外层容器的 justifyContent/alignItems 居中，自然形成留白
  const scale = containerW && containerH
    ? Math.min(containerW / CANVAS_WIDTH, containerH / CANVAS_HEIGHT)
    : 1

  return (
    <View
      style={[s.root, { backgroundColor: theme['c-app-background'] ?? '#000' }]}
      onLayout={onLayout}
    >
      <View
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: [{ scale }],
        }}
      >
        {children}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
})
