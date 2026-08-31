Page({
  createGame() {
    wx.navigateTo({ url: '/pages/setup/setup?mode=create' })
  },
  joinGame() {
    wx.navigateTo({ url: '/pages/setup/setup?mode=view' })
  }
})