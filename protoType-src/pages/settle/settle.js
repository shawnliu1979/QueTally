Page({
  data: { initial: 550, current: 550, surplus: 0 },
  finish() { wx.showToast({ title: '本局已结算', icon: 'none' }) }
})