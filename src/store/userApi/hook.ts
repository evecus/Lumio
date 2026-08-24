import { useEffect, useState } from 'react'
import { state } from './state'
import { event } from './event'

export const useStatus = () => {
  const [value, update] = useState(state.status)

  useEffect(() => {
    event.on('status_changed', update)
    return () => {
      event.off('status_changed', update)
    }
  }, [])

  return value
}

export const useUserApiList = () => {
  const [value, update] = useState(state.list)

  useEffect(() => {
    event.on('list_changed', update)
    return () => {
      event.off('list_changed', update)
    }
  }, [])

  return value
}

export const useUserApiGroupList = () => {
  const [value, update] = useState(state.groupList)

  useEffect(() => {
    event.on('group_list_changed', update)
    return () => {
      event.off('group_list_changed', update)
    }
  }, [])

  return value
}
