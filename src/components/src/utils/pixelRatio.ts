/**
 * Created by qianxin on 17/6/1.
 * 屏幕工具类
 *
 * ⚠️ 缩放模型说明（2026 重构）：
 * 项目现在采用「整体等比缩放 + 留白」的适配方案（类似视频播放器的
 * letterbox/pillarbox），而不是过去这里「按屏幕宽高分别拉伸」的方案。
 *
 * 真正负责设备适配的是 <ScaledStage>（见 src/components/ScaledStage.tsx）：
 * 它把所有页面内容渲染在一块固定尺寸的“设计画布”（CANVAS_WIDTH x
 * CANVAS_HEIGHT，见 src/config/canvas.ts）上，再用 transform: scale 整体
 * 缩放这块画布去适应真实设备屏幕，多余空间留白、居中显示，不会产生宽高比
 * 畸变。
 *
 * 因此，画布内部所有组件本来就是按“画布坐标系”（当前是 1920x1080）编写的
 * 像素值，不需要再根据「真实设备屏幕尺寸」二次缩放——如果再缩放一次，就会
 * 出现“缩放叠加缩放”的错乱。
 *
 * 所以下面这些函数改为「原样返回 size」（只保留用户自定义字体缩放
 * global.lx.fontSize 与系统 fontScale 这两个和屏幕适配无关的功能），
 * 调用方代码完全不用改。
 */
import { PixelRatio } from 'react-native'

let fontScale = PixelRatio.getFontScale()

/**
 * 设置text
 * @param size  画布坐标系下的字号（px），当前画布基准 1920x1080
 * @returns dp（画布坐标系下的 dp，实际显示大小由 ScaledStage 整体缩放决定）
 */
export function getTextSize(size: number) {
  // 系统字体缩放（无障碍设置）依然生效；屏幕尺寸缩放交给 ScaledStage 统一处理
  return Math.floor(size / (fontScale || 1)) || size
}
export function setSpText(size: number) {
  return getTextSize(size) * global.lx.fontSize
}

/**
 * 设置高度
 * @param size  画布坐标系下的高度（px），当前画布基准 1920x1080
 * @returns dp（画布坐标系下的 dp，实际显示大小由 ScaledStage 整体缩放决定）
 */
export function scaleSizeH(size: number) {
  return size * global.lx.fontSize
}

/**
 * 设置宽度
 * @param size  画布坐标系下的宽度（px），当前画布基准 1920x1080
 * @returns dp（画布坐标系下的 dp，实际显示大小由 ScaledStage 整体缩放决定）
 */
export function scaleSizeW(size: number) {
  return size * global.lx.fontSize
}


export const scaleSizeWR = (size: number) => {
  return size * 2 - scaleSizeW(size)
}

export const scaleSizeHR = (size: number) => {
  return size * 2 - scaleSizeH(size)
}

export const scaleSizeAbsHR = (size: number) => {
  return size * 2 - size
}
