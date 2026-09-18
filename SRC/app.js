const { cloudEnvId } = require('./config.private')
const { DEBUG_MODE } = require('./config')

const debugModal = (title, detail) => {
  if (!DEBUG_MODE) return
  wx.showModal({
    title,
    content: typeof detail === 'string' ? detail : JSON.stringify(detail),
    showCancel: false
  })
}

App({
  globalData: {
    cloudReady: false,
    pendingInviteCode: ''
  },

  onLaunch() {
    if (!wx.cloud) {
      wx.showModal({
        title: '基础库版本过低',
        content: '请使用支持云开发的微信版本后重试。',
        showCancel: false
      })
      return
    }

    wx.cloud.init({
      env: cloudEnvId,
      traceUser: true
    })
    this.globalData.cloudReady = true
  },

  onShow(options) {
    debugModal('App.onShow', {
        path: options && options.path,
        query: options && options.query,
        scene: options && options.scene
    })
    const invite = options && options.query && options.query.invite
    if (invite) this.globalData.pendingInviteCode = invite
  }
})