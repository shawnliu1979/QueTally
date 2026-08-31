const READ_ACTIONS = ['getMyProfile', 'myActiveGame', 'getGame', 'getRound', 'getSettlement']
const pendingCalls = new Map()

const requestKey = (action, data) => `${action}:${JSON.stringify(data)}`

const call = (action, data = {}) => {
  const isRead = READ_ACTIONS.includes(action)
  const key = requestKey(action, data)

  if (isRead && pendingCalls.has(key)) return pendingCalls.get(key)

  const request = wx.cloud.callFunction({
    name: 'game',
    data: { action, ...data }
  }).then(({ result }) => {
    if (!result || !result.ok) throw new Error((result && result.message) || '请求失败，请稍后重试')
    return result.data
  }).finally(() => pendingCalls.delete(key))

  if (isRead) pendingCalls.set(key, request)
  return request
}

const PROFILE_STORAGE_KEY = 'quetally-profile'

const getStoredProfile = () => wx.getStorageSync(PROFILE_STORAGE_KEY) || null
const saveProfile = profile => wx.setStorageSync(PROFILE_STORAGE_KEY, profile)

const uploadAvatar = async filePath => {
  if (filePath.startsWith('cloud://')) return filePath
  const extension = (filePath.match(/\.[a-zA-Z0-9]+$/) || ['.png'])[0]
  const result = await wx.cloud.uploadFile({
    cloudPath: `avatars/${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`,
    filePath
  })
  return result.fileID
}

const avatarDisplayUrl = avatarUrl => avatarUrl || ''

module.exports = { call, getStoredProfile, saveProfile, uploadAvatar, avatarDisplayUrl }