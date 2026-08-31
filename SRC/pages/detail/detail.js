const { call } = require('../../utils/game')
const { formatTransfers } = require('../../utils/round')

Page({
  data: { gameId: '', transfers: [], pendingCount: 0 },
  onLoad(options) { this.setData({ gameId: options.gameId }); this.refresh() },
  async refresh() {
    try {
      const round = await call('getRound', { gameId: this.data.gameId })
      this.setData({ transfers: formatTransfers(round.transfers, round.game.members, round.me.openId), pendingCount: round.pendingCount })
    } catch (error) { wx.showToast({ title: error.message, icon: 'none' }) }
  }
})