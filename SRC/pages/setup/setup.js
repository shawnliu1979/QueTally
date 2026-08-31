const { call } = require('../../utils/game')

Page({
  data: { gameId: '', game: null, players: [], score: '550', isOwner: false, countdown: 0, isStarting: false, isJoinerCountdown: false },

  onLoad(options) { this.setData({ gameId: options.gameId }); this.refresh() },
  onShow() { this.isPageVisible = true; if (this.data.gameId) this.refresh() },
  onHide() { this.isPageVisible = false; this.stopTimers() },
  onUnload() { this.isPageVisible = false; this.stopTimers() },

  stopTimers() {
    clearTimeout(this.timer)
    clearInterval(this.countdownTimer)
    this.timer = null
    this.countdownTimer = null
  },

  async refresh() {
    if (!this.isPageVisible || this.isRefreshing) return
    this.isRefreshing = true
    try {
      const game = await call('getGame', { gameId: this.data.gameId })
      this.setData({ game, players: game.members, score: String(game.initialScore), isOwner: game.isOwner })
      if (game.status === 'starting') return this.startCountdown(Math.max(0, game.startsAt - Date.now()), false)
      if (game.status === 'active') {
        if (game.isOwner) return wx.redirectTo({ url: `/pages/table/table?gameId=${game._id}` })
        return this.startCountdown(game.timing.joinerStartCountdownMs, true)
      }
      this.setData({ isStarting: false, isJoinerCountdown: false, countdown: 0 })
      this.scheduleNextRefresh(game.timing.refreshIntervalMs)
    } catch (error) { this.stopTimers(); wx.reLaunch({ url: '/pages/home/home' }) }
    finally { this.isRefreshing = false }
  },

  scheduleNextRefresh(interval) {
    if (!this.isPageVisible) return
    clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      this.refresh()
    }, interval)
  },

  startCountdown(milliseconds, isJoinerCountdown) {
    if (this.countdownTimer) return
    clearTimeout(this.timer)
    this.timer = null
    const endsAt = Date.now() + milliseconds
    const update = () => {
      const countdown = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      this.setData({ countdown, isStarting: !isJoinerCountdown, isJoinerCountdown })
      if (!countdown) {
        clearInterval(this.countdownTimer)
        this.countdownTimer = null
        if (isJoinerCountdown) wx.redirectTo({ url: `/pages/table/table?gameId=${this.data.gameId}` })
        else setTimeout(() => this.refresh(), 0)
      }
    }
    this.countdownTimer = setInterval(update, 250)
    update()
  },

  changeScore(event) { this.setData({ score: event.detail.value }) },

  async startGame() {
    if (!this.data.isOwner) return
    try {
      const game = await call('startGame', { gameId: this.data.gameId, initialScore: this.data.score })
      this.setData({ game: { ...this.data.game, ...game, status: 'starting' } })
      this.refresh()
    } catch (error) { wx.showToast({ title: error.message, icon: 'none' }) }
  },

  shareGame() {
    wx.showShareMenu({ withShareTicket: false })
    wx.showToast({ title: `邀请码：${this.data.game.inviteCode}`, icon: 'none', duration: 2500 })
  },

  onShareAppMessage() {
    const { game } = this.data
    return { title: '邀你加入一局雀帐', path: `/pages/home/home?invite=${game.inviteCode}` }
  },

  async cancel() {
    try { await call('leaveGame', { gameId: this.data.gameId }); wx.reLaunch({ url: '/pages/home/home' }) }
    catch (error) { wx.showToast({ title: error.message, icon: 'none' }) }
  }
})