import { memo, useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, View, type LayoutChangeEvent, type ColorValue } from 'react-native'
import { AnimatedText, type AnimatedTextProps } from './Text'

export interface MarqueeTextProps {
  children: string
  size?: number
  color?: ColorValue
  style?: AnimatedTextProps['style']
  /**
   * 容器宽度（决定何时触发滚动）。不传则使用外层布局自适应宽度。
   */
  width?: number
  /**
   * 文字滚动速度，单位：像素/秒
   */
  speed?: number
  /**
   * 单趟滚动结束后，停留再重新开始前的等待时间（毫秒）
   */
  pauseDuration?: number
}

/**
 * 跑马灯文字组件。
 * 文字未超出容器宽度时，保持静态居中展示；
 * 超出容器宽度时，整行文字从右到左循环滚动，不做省略号截断。
 */
export default memo(({ children, size = 15, color, style, width, speed = 40, pauseDuration = 1200 }: MarqueeTextProps) => {
  const [containerWidth, setContainerWidth] = useState(width ?? 0)
  const [textWidth, setTextWidth] = useState(0)
  const translateX = useRef(new Animated.Value(0)).current
  const animationRef = useRef<Animated.CompositeAnimation | null>(null)

  const handleContainerLayout = (e: LayoutChangeEvent) => {
    if (width != null) return
    const w = e.nativeEvent.layout.width
    if (w && w !== containerWidth) setContainerWidth(w)
  }
  const handleTextLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width
    if (w && w !== textWidth) setTextWidth(w)
  }

  const shouldScroll = containerWidth > 0 && textWidth > containerWidth

  useEffect(() => {
    animationRef.current?.stop()
    translateX.setValue(0)

    if (!shouldScroll) return

    const distance = textWidth - containerWidth
    const duration = (distance / speed) * 1000

    const loopAnim = () => {
      translateX.setValue(0)
      animationRef.current = Animated.sequence([
        Animated.delay(pauseDuration),
        Animated.timing(translateX, {
          toValue: -distance,
          duration,
          useNativeDriver: true,
        }),
        Animated.delay(pauseDuration),
      ])
      animationRef.current.start(({ finished }) => {
        if (finished) loopAnim()
      })
    }
    loopAnim()

    return () => {
      animationRef.current?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldScroll, textWidth, containerWidth, speed, pauseDuration])

  return (
    <View
      style={[mq.container, width != null ? { width } : null]}
      onLayout={handleContainerLayout}
    >
      <Animated.View
        style={shouldScroll ? { transform: [{ translateX }] } : mq.staticWrap}
        onLayout={handleTextLayout}
      >
        <AnimatedText
          size={size}
          color={color}
          style={[style, mq.text]}
          numberOfLines={1}
        >{children}</AnimatedText>
      </Animated.View>
    </View>
  )
})

const mq = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  staticWrap: {
    alignSelf: 'flex-start',
  },
  text: {
    flexShrink: 0,
  },
})
