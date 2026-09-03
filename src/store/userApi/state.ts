
interface InitState {
  list: LX.UserApi.UserApiInfo[]
  groupList: LX.UserApi.UserApiGroupInfo[]
  status: {
    status: boolean
    message?: string
  }
  apis: Partial<LX.UserApi.UserApiSources>
}
const state: InitState = {
  list: [],
  groupList: [],
  status: {
    status: false,
    message: 'initing',
  },
  apis: {},
}


export {
  state,
}
