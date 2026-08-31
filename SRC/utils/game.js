const { REFRESH_INTERVAL_MS } = require('../config')

const READ_ACTIONS = ['myActiveGame', 'getGame', 'getRound', 'getSettlement']
const responseCache = new Map()
const pendingCalls = new Map()

const requestKey = (action, data) => `${action}:${JSON.stringify(data)}`
const clearReadCache = () => {
  responseCache.clear()
  pendingCalls.clear()
}

const call = (action, data = {}) => {
  const isRead = READ_ACTIONS.includes(action)
  const key = requestKey(action, data)
  const cached = responseCache.get(key)

  if (isRead && cached && Date.now() - cached.createdAt < REFRESH_INTERVAL_MS) {
    return Promise.resolve(cached.data)
  }
  if (isRead && pendingCalls.has(key)) return pendingCalls.get(key)

  const request = wx.cloud.callFunction({
    name: 'game',
    data: { action, ...data }
  }).then(({ result }) => {
    if (!result || !result.ok) throw new Error((result && result.message) || '请求失败，请稍后重试')
    if (isRead) responseCache.set(key, { data: result.data, createdAt: Date.now() })
    else clearReadCache()
    return result.data
  }).finally(() => pendingCalls.delete(key))

  if (isRead) pendingCalls.set(key, request)
  return request
}

const getProfile = () => new Promise(resolve => {
  wx.getUserProfile({
    desc: '用于在本局中展示你的称呼',
    success: result => resolve(result.userInfo.nickName || '牌友'),
    fail: () => resolve('牌友')
  })
})

module.exports = { call, getProfile }