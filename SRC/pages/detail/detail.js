const { call } = require('../../utils/game')

Page({
  data: { gameId: '', transfers: [], pendingCount: 0 },
  onLoad(options) { this.setData({ gameId: options.gameId }); this.refresh() },
  async refresh() {
    try {
      const round = await call('getRound', { gameId: this.data.gameId })
      this.setData({ transfers: round.transfers, pendingCount: round.pendingCount })
    } catch (error) { wx.showToast({ title: error.message, icon: 'none' }) }
  }
})