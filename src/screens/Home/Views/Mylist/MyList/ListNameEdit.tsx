import { useRef, useImperativeHandle, forwardRef, useState } from 'react'
import ConfirmAlert, { type ConfirmAlertType } from '@/components/common/ConfirmAlert'
import Text from '@/components/common/Text'
import { View } from 'react-native'
import TVInputItem, { type TVInputItemType } from '@/components/common/TVInputItem'
import { createUserList, updateUserList } from '@/core/list'
import { confirmDialog, createStyle } from '@/utils/tools'
import listState from '@/store/list/state'

export interface ListNameEditType {
  showCreate: (position: number) => void
  show: (listInfo: LX.List.UserListInfo) => void
}
const initSelectInfo = {}

export default forwardRef<ListNameEditType, { onHide?: () => void }>(({ onHide }, ref) => {
  const alertRef = useRef<ConfirmAlertType>(null)
  const inputRef = useRef<TVInputItemType>(null)
  const [position, setPosition] = useState(0)
  const selectedListInfo = useRef<LX.List.UserListInfo>(initSelectInfo as LX.List.UserListInfo)
  const [visible, setVisible] = useState(false)
  const [text, setText] = useState('')
  const [placeholder, setPlaceholder] = useState('')

  const handleShow = (pos: number) => {
    alertRef.current?.setVisible(true)
    const name = pos === -1 ? '' : (selectedListInfo.current.name ?? '')
    requestAnimationFrame(() => {
      setText(name)
      setPlaceholder(name || global.i18n.t('list_create_input_placeholder'))
    })
  }

  useImperativeHandle(ref, () => ({
    showCreate(pos) {
      setPosition(pos)
      if (visible) handleShow(pos)
      else {
        setVisible(true)
        requestAnimationFrame(() => { handleShow(pos) })
      }
    },
    show(listInfo) {
      setPosition(-1)
      selectedListInfo.current = listInfo
      if (visible) handleShow(-1)
      else {
        setVisible(true)
        requestAnimationFrame(() => { handleShow(-1) })
      }
    },
  }))

  const handleRename = () => {
    let name = text.trim()
    if (!name.length) return
    if (name.length > 100) name = name.substring(0, 100)
    if (position === -1) {
      void updateUserList([{ ...selectedListInfo.current, name }])
    } else {
      void (listState.userList.some(l => l.name === name) ? confirmDialog({
        message: global.i18n.t('list_duplicate_tip'),
      }) : Promise.resolve(true)).then(confirmed => {
        if (!confirmed) return
        const now = Date.now()
        void createUserList(position, [{ id: `userlist_${now}`, name, locationUpdateTime: now }])
      })
    }
    alertRef.current?.setVisible(false)
  }

  return (
    visible
      ? <ConfirmAlert
          ref={alertRef}
          onConfirm={handleRename}
          onHide={onHide}
          closeBtn={false}
        >
          <View style={styles.renameContent}>
            <Text style={{ marginBottom: 5 }}>
              {position === -1 ? global.i18n.t('list_rename_title') : global.i18n.t('list_create')}
            </Text>
            <TVInputItem
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder={placeholder}
              wrapStyle={styles.inputWrap}
              inputStyle={styles.input}
              hasTVPreferredFocus
            />
          </View>
        </ConfirmAlert>
      : null
  )
})

const styles = createStyle({
  renameContent: {
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'column',
  },
  inputWrap: {
    flexGrow: 1,
    flexShrink: 1,
  },
  input: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 290,
  },
})
