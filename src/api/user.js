import api from './index'
// axios
import request from '@/utils/request'

const controller = '/LS-KK-backend'

// 登录
export function login(data) {
  return request({
    url: api.Login,
    method: 'post',
    data
  })
}

// 用户信息 post 方法
export function getUserInfo(data) {
  return request({
    url: api.UserInfo,
    method: 'post',
    data,
    hideloading: true
  })
}

// 用户名称 get 方法
export function getUserName(params) {
  return request({
    url: api.UserName,
    method: 'get',
    params,
    hideloading: true
  })
}
// 测试
export function getReport(params) {
  return request({
    // url: 'LS-KK-backend/reportList/getReportList.action',
    url: `${controller}/reportList/getReportList.action?param0=&param15=2021&projectFlag=kk`,
    method: 'get',
    params,
    hideloading: true
  })
}
