const { call } = require('../../utils/game')

Page({
  data: { gameId: '', round: null, modal: '', selectedPlayer: null, amount: '', incoming: null },

  onLoad(options) { this.setData({ gameId: options.gameId }); this.refresh() },
  onShow() { this.isPageVisible = true; if (this.data.gameId) this.refresh() },
  onHide() { this.isPageVisible = false; this.stopPolling() },
  onUnload() { this.isPageVisible = false; this.stopPolling() },

  stopPolling() {
    clearTimeout(this.timer)
    this.timer = null
  },

  async refresh() {
    if (!this.isPageVisible || this.isRefreshing) return
    this.isRefreshing = true
    try {
      const round = await call('getRound', { gameId: this.data.gameId })
      if (round.game.status !== 'active') return wx.reLaunch({ url: '/pages/home/home' })
      const incoming = round.transfers.find(item => item.toMe && item.status === 'pending') || null
      this.setData({ round, incoming })
      this.scheduleNextRefresh(round.game.timing.refreshIntervalMs)
      if (incoming && !this.data.modal) this.setData({ modal: 'incoming' })
    } catch (error) { this.stopPolling(); wx.reLaunch({ url: '/pages/home/home' }) }
    finally { this.isRefreshing = false }
  },

  scheduleNextRefresh(interval) {
    if (!this.isPageVisible) return
    this.stopPolling()
    this.timer = setTimeout(() => {
      this.timer = null
      this.refresh()
    }, interval)
  },

  openPayment(event) { this.setData({ modal: 'payment', selectedPlayer: event.currentTarget.dataset.player, amount: '' }) },
  openIncoming() { if (this.data.incoming) this.setData({ modal: 'incoming' }) },
  openDetail() { this.navigateTo(`/pages/detail/detail?gameId=${this.data.gameId}`) },
  closeModal() { this.setData({ modal: '' }) },
  stopModalTap() {},
  changeAmount(event) { this.setData({ amount: event.detail.value }) },

  async confirmPayment() {
    const amount = Number(this.data.amount)
    if (!Number.isInteger(amount) || amount <= 0) return wx.showToast({ title: '请输入正整数点数', icon: 'none' })
    try {
      await call('createTransfer', { gameId: this.data.gameId, toOpenId: this.data.selectedPlayer.openId, amount })
      this.closeModal(); this.refresh()
    } catch (error) { wx.showToast({ title: error.message, icon: 'none' }) }
  },

  async respondIncoming(event) {
    try {
      await call('respondTransfer', { transferId: this.data.incoming._id, accept: event.currentTarget.dataset.accept })
      this.closeModal(); this.refresh()
    } catch (error) { wx.showToast({ title: error.message, icon: 'none' }) }
  },

  goSettle() { this.navigateTo(`/pages/settle/settle?gameId=${this.data.gameId}`) },

  navigateTo(url) {
    if (this.isNavigating) return
    this.isNavigating = true
    wx.navigateTo({
      url,
      fail: () => {
        this.isNavigating = false
        wx.showToast({ title: '页面打开失败，请重试', icon: 'none' })
      }
    })
  }
})