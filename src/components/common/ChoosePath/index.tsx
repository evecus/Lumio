import { useRef, forwardRef, useImperativeHandle } from 'react'
import List, { type ListType } from './List'
import { toast, TEMP_FILE_PATH, checkStoragePermissions, requestStoragePermission, confirmDialog } from '@/utils/tools'
import { useI18n } from '@/lang'
import { selectFile, unlink } from '@/utils/fs'
import { useUnmounted } from '@/utils/hooks'
import settingState from '@/store/setting/state'
import { log } from '@/utils/log'
import { updateSetting } from '@/core/common'

export interface ReadOptions {
  title: string
  isPersist?: boolean
  dirOnly?: boolean
  filter?: string[]
}
const initReadOptions = {}

interface ChoosePathProps {
  onConfirm: (path: string) => void
}

export interface ChoosePathType {
  show: (options: ReadOptions) => void
}

export default forwardRef<ChoosePathType, ChoosePathProps>(({
  onConfirm = () => {},
}: ChoosePathProps, ref) => {
  const t = useI18n()
  const listRef = useRef<ListType>(null)
  const readOptions = useRef<ReadOptions>(initReadOptions as ReadOptions)
  const isUnmounted = useUnmounted()

  const handleOpenExternalStorage = async(options: ReadOptions) => {
    return checkStoragePermissions().then(isGranted => {
      readOptions.current = options
      if (isGranted) {
        listRef.current?.show(options.title, '', options.dirOnly, options.filter)
      } else {
        // 直接请求权限，跳过确认弹窗
        void requestStoragePermission().then(result => {
          if (result) {
            listRef.current?.show(options.title, '', options.dirOnly, options.filter)
          } else {
            toast(t('storage_permission_tip_disagree'), 'long')
          }
        })
      }
    })
  }

  useImperativeHandle(ref, () => ({
    show(options) {
      if (!settingState.setting['common.useSystemFileSelector'] || options.dirOnly) {
        void handleOpenExternalStorage(options)
      } else {
        void selectFile({
          extTypes: options.filter,
          toPath: TEMP_FILE_PATH,
        }).then((file) => {
          if (!file || isUnmounted.current) return
          if (options.filter && !options.filter.some(ext => file.data.toLowerCase().endsWith('.' + ext))) {
            toast(t('storage_file_no_match'), 'long')
            void unlink(file.data)
            return
          }
          onConfirm(file.data)
        }).catch(err => {
          if (isUnmounted.current) return
          log.warn('open document failed: ' + err.message)
          void confirmDialog({
            message: t('storage_file_no_select_file_failed_tip'),
            bgClose: false,
          }).then((confirm) => {
            if (!confirm) {
              toast(t('disagree_tip'), 'long')
              return
            }
            updateSetting({ 'common.useSystemFileSelector': false })
            void handleOpenExternalStorage(options)
          })
        })
      }
    },
  }))

  const onPathConfirm = (path: string) => {
    listRef.current?.hide()
    onConfirm(path)
  }

  return <List ref={listRef} onConfirm={onPathConfirm} />
})
