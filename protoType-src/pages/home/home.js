Page({
  data: {
    taglines: [
      '一局有终，心中有数。',
      '牌有起落，心有分寸。',
      '输赢一时，情谊一局。',
      '一桌相逢，尽兴便好。',
      '点数归零，笑意长留。',
      '落子有声，来去从容。'
    ],
    tagline: ''
  },
  onLoad() {
    const { taglines } = this.data
    const index = Math.floor(Math.random() * taglines.length)
    this.setData({ tagline: taglines[index] })
  },
  createGame() {
    wx.navigateTo({ url: '/pages/setup/setup?mode=create' })
  },
  joinGame() {
    wx.navigateTo({ url: '/pages/setup/setup?mode=view' })
  }
})