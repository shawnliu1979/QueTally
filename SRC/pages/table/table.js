const { call, avatarDisplayUrl } = require('../../utils/game')
const { REFRESH_INTERVAL_MS } = require('../../config')
const { formatTransfers } = require('../../utils/round')

Page({
  data: { gameId: '', round: null, modal: '', selectedPlayer: null, amount: '', incoming: null, incomingTransferId: '' },

  onLoad(options) { this.setData({ gameId: options.gameId }); this.refresh() },
  onShow() { this.isPageVisible = true; this.isNavigating = false; if (this.data.gameId) this.refresh() },
  onHide() { this.isPageVisible = false; this.stopPolling() },
  onUnload() { this.isPageVisible = false; this.stopPolling() },

  stopPolling() {
    clearTimeout(this.timer)
    this.timer = null
  },

  async refresh() {
    if (!this.isPageVisible) return
    if (this.isRefreshing) {
      this.refreshRequested = true
      return
    }
    this.isRefreshing = true
    try {
      const round = await call('getRound', { gameId: this.data.gameId })
      if (round.game.status !== 'active') return wx.reLaunch({ url: '/pages/home/home' })
      if (!this.memberAvatarCache) this.memberAvatarCache = {}
      round.game.members = round.game.members.map(member => {
        if (!(member.openId in this.memberAvatarCache)) {
          this.memberAvatarCache[member.openId] = avatarDisplayUrl(member.avatarUrl)
        }
        return { ...member, avatarDisplayUrl: this.memberAvatarCache[member.openId] }
      })
      round.others = round.game.members.filter(member => member.openId !== round.me.openId)
      const transfers = formatTransfers(round.transfers, round.game.members, round.me.openId)
      const incoming = transfers.find(item => item.toMe && item.status === 'pending') || null
      round.transfers = transfers
      this.setData({ round, incoming, incomingTransferId: incoming ? String(incoming._id) : '' })
      this.scheduleNextRefresh(REFRESH_INTERVAL_MS)
      if (incoming && !this.data.modal) this.setData({ modal: 'incoming' })
    } catch (error) { this.stopPolling(); wx.reLaunch({ url: '/pages/home/home' }) }
    finally {
      this.isRefreshing = false
      if (this.refreshRequested) {
        this.refreshRequested = false
        this.stopPolling()
        this.refresh()
      }
    }
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
  fallbackAvatar(event) {
    const index = event.currentTarget.dataset.index
    const openId = event.currentTarget.dataset.openId
    this.memberAvatarCache[openId] = ''
    this.setData({ [`round.others[${index}].avatarDisplayUrl`]: '' })
  },
  closeModal() { this.setData({ modal: '' }) },
  stopModalTap() {},
  changeAmount(event) { this.setData({ amount: event.detail.value }) },

  async confirmPayment() {
    const amount = Number(this.data.amount)
    if (!Number.isInteger(amount) || amount <= 0) return wx.showToast({ title: '请输入正整数点数', icon: 'none' })
    try {
      await call('createTransfer', { gameId: this.data.gameId, toOpenId: this.data.selectedPlayer.openId, amount })
      this.closeModal()
      this.stopPolling()
      await this.refresh()
    } catch (error) { wx.showToast({ title: error.message, icon: 'none' }) }
  },

  async respondIncoming(event) {
    const transferId = this.data.incomingTransferId
    if (!transferId) return wx.showToast({ title: '这笔划转已失效，请刷新后重试', icon: 'none' })
    try {
      await call('respondTransfer', { gameId: this.data.gameId, transferId, accept: event.currentTarget.dataset.accept === true })
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