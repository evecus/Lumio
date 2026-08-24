declare namespace LX {
  namespace UserApi {
    type UserApiSourceInfoType = 'music'
    type UserApiSourceInfoActions = 'musicUrl' | 'lyric' | 'pic'

    interface UserApiSourceInfo {
      name: string
      type: UserApiSourceInfoType
      actions: UserApiSourceInfoActions[]
      qualitys: LX.Quality[]
    }

    type UserApiSources = Record<LX.Source, UserApiSourceInfo>


    interface UserApiInfo {
      id: string
      name: string
      description: string
      // script: string
      allowShowUpdateAlert: boolean
      author: string
      homepage: string
      version: string
      sources?: UserApiSources
      groupId?: string // 若该源来自"聚合导入"，记录所属分组 id；单独导入的源没有该字段
    }

    // 聚合源清单 JSON 的结构（远端 url 返回的内容）
    interface UserApiGroupManifest {
      version: string // 必填，聚合清单整体版本号，仅做字符串相等比较，用于判断是否需要更新
      name?: string
      sources: Array<{
        url: string // 必填，子源脚本的下载链接
        name?: string // 可选，兜底展示名（优先使用脚本注释头解析出的 name）
      }>
    }

    // 聚合源分组在本地的记录
    interface UserApiGroupInfo {
      id: string
      name: string
      url: string // 清单 JSON 的链接，用于后续检查更新
      version: string // 当前已导入的清单版本号
      apiIds: string[] // 当前分组下属的 UserApiInfo.id 列表
      lastCheckTime: number // 上次检查更新的时间戳（ms），用于 24 小时节流
    }

    interface UserApiStatus {
      status: boolean
      message?: string
      apiInfo?: UserApiInfo
    }

    interface UserApiUpdateInfo {
      name: string
      description: string
      log: string
      updateUrl?: string
    }

    interface UserApiRequestParams {
      requestKey: string
      data: any
    }
    interface UserApiRequestParams {
      requestKey: string
      data: any
    }
    type UserApiRequestCancelParams = string
    type UserApiSetApiParams = string

    interface UserApiSetAllowUpdateAlertParams {
      id: string
      enable: boolean
    }

    interface ImportUserApi {
      apiInfo: UserApiInfo
      apiList: UserApiInfo[]
    }

  }
}
