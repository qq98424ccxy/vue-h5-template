import axios from 'axios'
import qs from 'qs'
import { Notify } from 'vant'

const codeMessage = {
  400: '请求错误',
  401: '登录状态失效，请重新登录',
  403: '拒绝访问',
  404: '请求地址不存在',
  500: '服务器繁忙',
  502: '网关错误',
  503: '服务不可用，服务器暂时过载或维护',
  504: '网关超时'
}

const methods = [
  'put', 'post', 'patch'
]
const genEmptyPromise = () => new Promise(() => {})

const getErrorMsg = (action, error, errorMsg) => {
  let msg = ''
  if (errorMsg) {
    return errorMsg
  }
  // http 错误响应
  if (error.response) {
    const { status } = error.response
    return `${action} ${codeMessage[status]}`
  }
  // 超时或断网
  if (error.message.includes('timeout')) {
    msg = '请求超时！请检查网络是否正常'
  } else {
    msg = '网络错误，请检查网络是否已连接！'
  }
  return `${action}：${msg || '操作失败'}`
}
const requestStart = (config, loadingCb, showLoading, axiosCancel, cancelParams) => {
  loadingCb(true)
  if (axiosCancel) {
    removePending(config, cancelParams) // 在请求开始前，对之前的请求做检查取消操作
    addPending(config, cancelParams) // 添加本次请求到 pending 中
  }

  config.headers = config.headers || {}
  if (showLoading) {
    // Loading.open()
  }
}
const requestThenEnd = ({ action, response, loadingCb, axiosCancel, cancelParams, showLoading, showWarning, warningMsg, throwWarningError }) => {
  loadingCb(false)
  if (showLoading) {
    // Loading.close()
  }
  if (axiosCancel) {
    removePending(response.config, cancelParams) // 在请求结束后，移除本次请求
  }
  const responseData = response.data || {}
  if (responseData.success) { // success code
    return responseData
  }
  const isDownload = response.headers['content-disposition']
  if (isDownload) { // success code
    // download(responseData, isDownload.split('filename=')[1])
    return responseData
  }
  // not success code
  if (showWarning) {
    Notify.closeAll()
    const warText = `${action}：${warningMsg || responseData.errorMessage || '操作失败'}`
    const mess = Notify({
      showClose: true,
      duration: 2000,
      message: `${warText}`
    })
    if (responseData.errorMessage === '系统错误') {
      mess.type = 'error'
    } else {
      mess.type = 'warning'
    }

    return responseData
  }
  // 抛出业务错误
  if (throwWarningError) {
    const err = new Error(JSON.stringify(responseData, null, 2))
    err.name = 'warning'
    return Promise.reject(err)
  }
  return genEmptyPromise()
}
const requestCatchEnd = ({ action, error, loadingCb, showLoading, axiosCance, cancelParams, showError, errorMsg, throwHttpError }) => {
  loadingCb(false)
  if (showLoading) {
    // Loading.close()
  }
  if (axios.isCancel(error)) { // 取消请求的错误，直接跳过
    console.log('重复请求取消: ' + error.message)
    return genEmptyPromise()
  }
  if (error.name === 'warning') {
    return Promise.reject(error)
  }
  const msg = getErrorMsg(action, error, errorMsg)
  if (showError) {
    Notify.closeAll()
    Notify.error(msg)
  }
  if (error.response && axiosCance) {
    removePending(error.response.config, cancelParams) // 在请求结束后，移除本次请求
  }
  // 抛出http错误
  if (throwHttpError) {
    return Promise.reject(error)
  }
  return genEmptyPromise()
}
/**
 * 过滤空参数
 * @param {Object} params 参数对象
 */
// const paramsSerializer = params => {
//   const data = {}
//   for (const k in params) {
//     const value = params[k]
//     if (value !== '' && value !== null && value !== undefined) {
//       data[k] = value
//     }
//   }
//   return qs.stringify(data)
// }

/**
 * 拼接参数/判断重复请求不同参数不取消
 * @param {Object} config 参数对象
 * @param {Boolean} isJoin 是否拼接参数，区分同一请求不同参数
 */
function joinUrlParams(config, isJoin) {
  const urlArr = [config.method, config.url]
  if (isJoin) {
    urlArr.push(qs.stringify(config.params), qs.stringify(config.data))
  }
  return urlArr.join('&')
}

// 声明一个 Map 用于存储每个请求的标识 和 取消函数
const pending = new Map()
/**
 * 添加请求
 * @param {Object} config
 */
const addPending = (config, cancelParams) => {
  const url = joinUrlParams(config, cancelParams)
  config.cancelToken = config.cancelToken || new axios.CancelToken(cancel => {
    if (!pending.has(url)) { // 如果 pending 中不存在当前请求，则添加进去
      pending.set(url, cancel)
    }
  })
}
/**
 * 移除请求
 * @param {Object} config
 */
const removePending = (config, cancelParams) => {
  const url = joinUrlParams(config, cancelParams)
  if (pending.has(url)) { // 如果在 pending 中存在当前请求标识，需要取消当前请求，并且移除
    const cancel = pending.get(url)
    cancel(url)
    pending.delete(url)
  }
}
/**
 * 清空 pending 中的请求（在路由跳转时调用）
 * @param {Object} config
 */
export const clearPending = () => {
  for (const [url, cancel] of pending) {
    cancel(url)
  }
  pending.clear()
}
const instance = axios.create({
//   paramsSerializer
})

// 拦截器
instance.interceptors.response.use((res) => {
  if (res.data.errorCode === 401) {
    setTimeout(() => {
      const splitUrl = window.location.href.split('#')
      const url = splitUrl[0]
      const params = encodeURIComponent(splitUrl[1] || '')
      const goUrl = `${res.data.data.redirectUrl}&state=${params}&redirect_uri=${url}`
      console.log(goUrl)
      window.top.location.href = goUrl
    }, 200)
  }
  return res
}, (error) => {
  if (error.errorCode === 401) {
    window.top.location.href = error.data.redirectUrl
  }
  return Promise.reject(error)
})

/**
 * @param {Object} options 请求配置参数
 * @param {Boolean} [options.showWarning=true] 是否显示业务错误提示（请求成功，但业务状态码非成功状态）
 * @param {Boolean} [options.showError=true] 是否显示http错误提示（http请求失败）
 * @param {Boolean} [options.showLoading=true] 是否显示 loading
 * @param {Function} [options.loadingCb=()=>{}] loading 状态回调
 * @param {Boolean} [options.throwWarningError=false] 是否抛出业务逻辑错误（请求成功，但业务状态码非成功状态）
 * @param {Boolean} [options.throwHttpError=false] 是否显示http错误（http请求失败）
 * @param {String} [options.warningMsg=''] 业务错误提示
 * @param {String} [options.timeout=60000] 超时时间设置
 * @param {String} [options.errorMsg=''] http错误提示
 * @param {Boolean} [axiosCancel=false] 是否启动重复请求取消 默认不启动
 * @param {Boolean} [cancelParams=false] 是否启动重复请求，不同参数取消 默认不启动
 * @return {Promise} Promise
 */
// 判断是主体类或get的拼接url参数
const isParams = (options) => {
  if (methods.includes(options.method.toLocaleLowerCase())) {
    options.data = options.params
    delete options.params
  }
  return options
}
const request = (
  {
    action = '请求接口',
    showWarning = true,
    showError = true,
    timeout = 60000,
    showLoading = true,
    loadingCb = () => {},
    throwWarningError = false,
    throwHttpError = false,
    warningMsg = '',
    errorMsg = '',
    arrayFormat = '',
    axiosCancel = false,
    cancelParams = false,
    ...options
  } = {}
) => {
  options = isParams(options)
  requestStart(options, loadingCb, showLoading, axiosCancel, cancelParams)
  instance.defaults.timeout = timeout
  return instance(options)
    .then(response => {
      return requestThenEnd({ action, response, loadingCb, axiosCancel, cancelParams, showLoading, showWarning, warningMsg, throwWarningError })
    })
    .catch(error => {
      return requestCatchEnd({ action, error, loadingCb, showLoading, axiosCancel, cancelParams, showError, errorMsg, throwHttpError })
    })
}
export default request
// request-demo
export const getData = (params) => {
  return ({
    action: 'xxxx',
    method: 'get/post/put/xxx',
    url: 'xxxx',
    params,
    axiosCancel: true, // true为重复请求取消
    cancelParams: true, // true为重复请求，不同参数取消
    timeout: 30000 // 超时时间30秒
  })
}
