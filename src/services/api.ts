import Taro from '@tarojs/taro'
import type { FileInfo } from '../types'

const API_BASE = (process.env.TARO_APP_API_BASE || '').replace(/\/$/, '')
if (!API_BASE) throw new Error('TARO_APP_API_BASE 未配置')
const DEV_LOGIN = process.env.TARO_APP_DEV_LOGIN === 'true'
const TOKEN_KEY = 'fitness-session-token'

interface Envelope<T> {
  code: number
  data: T
  msg: string
}

export class APIError extends Error {
  code: number
  constructor(code: number, message: string) {
    super(message || '请求失败，请稍后重试')
    this.code = code
  }
}

let loginPromise: Promise<string> | null = null

async function wechatLogin(): Promise<string> {
  if (loginPromise) return loginPromise
  loginPromise = (async () => {
    let code = 'local-development'
    if (!DEV_LOGIN) {
      const loginResult = await Taro.login()
      if (!loginResult.code) throw new APIError(102001, '微信登录凭证获取失败')
      code = loginResult.code
    }
    const response = await Taro.request<Envelope<{ token: string }>>({
      url: `${API_BASE}/auth/login`,
      method: 'POST',
      data: { code },
      header: { 'Content-Type': 'application/json' }
    })
    if (response.data.code !== 0) throw new APIError(response.data.code, response.data.msg || '微信登录失败')
    Taro.setStorageSync(TOKEN_KEY, response.data.data.token)
    return response.data.data.token
  })()
  try {
    return await loginPromise
  } finally {
    loginPromise = null
  }
}

export async function request<T>(
  path: string,
  options: Omit<Taro.request.Option, 'url'> = {},
  retried = false
): Promise<T> {
  let token = Taro.getStorageSync(TOKEN_KEY) as string
  if (!token && path !== '/auth/login') token = await wechatLogin()
  const response = await Taro.request<Envelope<T>>({
    ...options,
    url: `${API_BASE}${path}`,
    header: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.header || {})
    }
  })
  if (response.data.code === 102002 && !retried) {
    Taro.removeStorageSync(TOKEN_KEY)
    await wechatLogin()
    return request<T>(path, options, true)
  }
  if (response.data.code !== 0) throw new APIError(response.data.code, response.data.msg)
  return response.data.data
}

export async function uploadImage(
  filePath: string,
  purpose: 'avatar' | 'checkin',
  retried = false
) {
  let token = Taro.getStorageSync(TOKEN_KEY) as string
  if (!token) token = await wechatLogin()
  const response = await Taro.uploadFile({
    url: `${API_BASE}/files/images`,
    filePath,
    name: 'file',
    formData: { purpose },
    header: { Authorization: `Bearer ${token}` }
  })
  const data = JSON.parse(response.data) as Envelope<FileInfo>
  if (data.code === 102002 && !retried) {
    Taro.removeStorageSync(TOKEN_KEY)
    await wechatLogin()
    return uploadImage(filePath, purpose, true)
  }
  if (data.code !== 0) throw new APIError(data.code, data.msg)
  if (purpose !== 'checkin' && data.data.auditStatus === 'pending') {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 750))
      const status = await request<{ auditStatus: string; file?: FileInfo }>(`/files/${data.data.id}/status`)
      if (status.auditStatus === 'approved' && status.file) return status.file
      if (status.auditStatus === 'rejected') throw new APIError(102003, '图片未通过内容安全审核')
    }
    throw new APIError(102001, '图片审核仍在进行，请稍后再试')
  }
  return data.data
}

export function showError(error: unknown) {
  const message = error instanceof Error ? error.message : '操作失败，请稍后重试'
  Taro.showToast({ title: message, icon: 'none', duration: 2500 })
}
