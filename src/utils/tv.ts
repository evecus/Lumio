/**
 * TV / 遥控器适配工具
 * 封装焦点样式、按键事件等 TV 专属逻辑
 */

import { Platform } from 'react-native'

/** 当前是否运行在 Android TV / Fire TV 环境
 *  Platform.isTV 在 RN 0.73 类型定义里缺失，用 as any 绕过 */
export const isTV: boolean = (Platform as any).isTV ?? false

/**
 * 遥控器方向键 KeyCode（Android）
 * React Native 的 TVEventHandler 使用这些名称
 */
export const TV_KEY = {
  up: 'up',
  down: 'down',
  left: 'left',
  right: 'right',
  select: 'select',   // 确认键 / OK
  back: 'back',
  menu: 'menu',
  playPause: 'playPause',
  rewind: 'rewind',
  fastForward: 'fastForward',
} as const

/**
 * TV 焦点高亮边框样式 — 叠加在 TouchableHighlight 上
 */
export const TV_FOCUS_STYLE = {
  borderWidth: 3,
  borderColor: '#ffffff',
  borderRadius: 8,
  elevation: 8,
} as const

/**
 * TV 焦点高亮颜色（TouchableHighlight underlayColor）
 */
export const TV_UNDERLAY_COLOR = 'rgba(255,255,255,0.18)'

/**
 * TV 按钮最小尺寸（dp）— Google Leanback 规范要求 ≥ 48dp，建议 64dp
 */
export const TV_BTN_MIN_SIZE = 64
