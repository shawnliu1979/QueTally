const { call } = require('../../utils/game')

Page({
  data: { gameId: '', summary: null, isOwner: false },
  onLoad(options) { this.setData({ gameId: options.gameId }); this.refresh() },
  async refresh() {
    try {
      const summary = await call('getSettlement', { gameId: this.data.gameId })
      const game = await call('getGame', { gameId: this.data.gameId })
      this.setData({ summary, isOwner: game.isOwner })
    }
    catch (error) { wx.showToast({ title: error.message, icon: 'none' }) }
  },
  async finish() {
    if (!this.data.isOwner) return
    if (this.data.summary.pendingCount) return wx.showToast({ title: '请先处理待确认记录', icon: 'none' })
    try { await call('settleGame', { gameId: this.data.gameId }); wx.showToast({ title: '本局已结算', icon: 'none' }); this.refresh() }
    catch (error) { wx.showToast({ title: error.message, icon: 'none' }) }
  }
})