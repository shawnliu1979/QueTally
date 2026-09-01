const { cloudEnvId } = require('./config.private')

App({
  globalData: {
    cloudReady: false
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
  }
})