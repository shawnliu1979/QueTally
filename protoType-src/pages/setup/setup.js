Page({
  data: {
    isViewer: false,
    score: '550',
    players: [
      { name: '林深', mark: '发起人', glyph: '林', tone: 'green' },
      { name: '阿雯', mark: '已加入', glyph: '雯', tone: 'red' },
      { name: '陈一', mark: '已加入', glyph: '陈', tone: 'yellow' },
      { name: '小北', mark: '已加入', glyph: '北', tone: 'blue' }
    ]
  },
  onLoad(options) {
    this.setData({ isViewer: options.mode === 'view' })
  },
  changeScore(event) {
    this.setData({ score: event.detail.value })
  },
  startGame() {
    if (!this.data.isViewer) {
      wx.navigateTo({ url: '/pages/table/table' })
    }
  },
  cancel() {
    wx.navigateBack()
  }
})