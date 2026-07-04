import { useRef } from 'react'
// import { View } from 'react-native'

import Menu, { type MenuType, type MenuProps, type Menus } from './Menu'
import TVButton, { type TVButtonType as BtnType } from './TVButton'
import { type ViewProps as BtnProps } from 'react-native'
// import { useLayout } from '@/utils/hooks'

export interface DorpDownMenuProps<T extends Menus> extends Omit<MenuProps<T>, 'width'> {
  children: React.ReactNode
  btnStyle?: BtnProps['style']
}

export default <T extends Menus>({
  menus,
  onPress,
  height,
  fontSize,
  center,
  children,
  activeId,
  btnStyle,
}: DorpDownMenuProps<T>) => {
  const buttonRef = useRef<BtnType>(null)
  const menuRef = useRef<MenuType>(null)

  const showMenu = () => {
    buttonRef.current?.measure((fx, fy, width, height, px, py) => {
      // console.log(fx, fy, width, height, px, py)
      menuRef.current?.show({ x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) }, {
        width,
        height,
      })
    })
  }

  return (
    <TVButton style={btnStyle} ref={buttonRef as any} onPress={showMenu}>
      {children}
      <Menu
        ref={menuRef}
        menus={menus}
        center={center}
        onPress={onPress}
        fontSize={fontSize}
        height={height}
        activeId={activeId}
      />
    </TVButton>
  )
}
