const { call, getStoredProfile, saveProfile, uploadAvatar } = require('../../utils/game')
const { ACTIVE_GAME_REDIRECT_DELAY_MS, REFRESH_INTERVAL_MS } = require('../../config')

Page({
  data: { tagline: '', inviteCode: '', activeGameId: '', profileAction: '', profileName: '', profileAvatarUrl: '', pendingInviteCode: '' },

  onLoad(options) {
    const taglines = ['一局有终，心中有数。', '牌有起落，心有分寸。', '输赢一时，情谊一局。', '一桌相逢，尽兴便好。', '点数归零，笑意长留。', '落子有声，来去从容。']
    this.setData({
      tagline: taglines[Math.floor(Math.random() * taglines.length)],
      inviteCode: options.invite || '',
      pendingInviteCode: options.invite || ''
    })
    this.loadProfile()
  },

  onShow() {
    this.isPageVisible = true
    if (this.isProfileReady && !this.data.profileAction && !this.data.inviteCode) this.resumeGame()
  },

  onHide() { this.isPageVisible = false; this.stopResumeTimers() },
  onUnload() { this.isPageVisible = false; this.stopResumeTimers() },

  stopResumeTimers() {
    clearTimeout(this.pollTimer)
    clearTimeout(this.redirectTimer)
    this.pollTimer = null
    this.redirectTimer = null
  },

  async resumeGame() {
    if (!this.isPageVisible || this.isManualEntry || this.isRedirecting || this.isCheckingGame) return
    this.isCheckingGame = true
    try {
      const result = await call('myActiveGame')
      if (this.isManualEntry) return
      const game = result.game || result
      if (!game || !game._id) return this.scheduleNextCheck(REFRESH_INTERVAL_MS)
      this.isRedirecting = true
      this.setData({ activeGameId: game._id })
      this.stopResumeTimers()
      const delay = Math.ceil(ACTIVE_GAME_REDIRECT_DELAY_MS / 1000)
      wx.showToast({ title: `你已经在一个对局里了，${delay} 秒后跳转`, icon: 'none', duration: ACTIVE_GAME_REDIRECT_DELAY_MS })
      this.redirectTimer = setTimeout(() => {
        this.enterGame(game)
      }, ACTIVE_GAME_REDIRECT_DELAY_MS)
    } catch (error) {
      this.scheduleNextCheck(REFRESH_INTERVAL_MS)
    } finally {
      this.isCheckingGame = false
    }
  },

  scheduleNextCheck(interval) {
    if (!this.isPageVisible || this.isRedirecting) return
    clearTimeout(this.pollTimer)
    this.pollTimer = setTimeout(() => {
      this.pollTimer = null
      this.resumeGame()
    }, interval)
  },

  enterGame(game) {
    const page = game.status === 'preparing' || game.status === 'starting' ? 'setup/setup' : 'table/table'
    this.stopResumeTimers()
    wx.reLaunch({
      url: `/pages/${page}?gameId=${game._id}`,
      fail: () => {
        this.isRedirecting = false
        this.scheduleNextCheck(REFRESH_INTERVAL_MS)
        wx.showToast({ title: '进入对局失败，请重试', icon: 'none' })
      }
    })
  },

  async loadProfile() {
    try {
      const profile = await call('getMyProfile')
      this.isProfileReady = true
      if (profile) {
        saveProfile(profile)
        this.profile = profile
        this.setData({ profileAction: '', profileName: profile.name, profileAvatarUrl: profile.avatarUrl })
        if (this.data.pendingInviteCode) return this.joinWithProfile(this.data.pendingInviteCode)
        if (this.isPageVisible) this.resumeGame()
        return
      }
      const cachedProfile = getStoredProfile()
      this.setData({
        profileAction: 'profile',
        profileName: cachedProfile ? cachedProfile.name : '',
        profileAvatarUrl: cachedProfile ? cachedProfile.avatarUrl : ''
      })
    } catch (error) {
      wx.showToast({ title: '无法读取个人资料，请检查网络', icon: 'none' })
    }
  },

  chooseAvatar(event) { this.setData({ profileAvatarUrl: event.detail.avatarUrl }) },
  changeProfileName(event) { this.setData({ profileName: event.detail.value }) },

  async submitProfile() {
    const { profileName, profileAvatarUrl, pendingInviteCode } = this.data
    const name = profileName.trim()
    if (!profileAvatarUrl) return wx.showToast({ title: '请选择头像', icon: 'none' })
    if (!name) return wx.showToast({ title: '请输入昵称', icon: 'none' })
    try {
      wx.showLoading({ title: '保存资料' })
      const profile = { name, avatarUrl: await uploadAvatar(profileAvatarUrl) }
      await call('saveMyProfile', { profile })
      saveProfile(profile)
      this.profile = profile
      this.isProfileReady = true
      this.setData({ profileAction: '', profileAvatarUrl: profile.avatarUrl })
      if (pendingInviteCode) return this.joinWithProfile(pendingInviteCode)
      this.resumeGame()
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' })
    } finally { wx.hideLoading() }
  },

  createGame() {
    if (!this.isProfileReady || !this.profile) return
    this.createWithProfile()
  },

  async createWithProfile() {
    if (this.isManualEntry) return
    this.isManualEntry = true
    this.stopResumeTimers()
    try {
      wx.showLoading({ title: '创建中' })
      const game = await call('createGame')
      this.enterGame({ ...game, status: 'preparing' })
    } catch (error) {
      this.isManualEntry = false
      wx.showToast({ title: error.message, icon: 'none' })
      this.scheduleNextCheck(REFRESH_INTERVAL_MS)
    } finally { wx.hideLoading() }
  },

  joinGame() {
    if (this.data.inviteCode) return this.joinByCode(this.data.inviteCode)
    wx.showModal({
      title: '加入别人的局',
      editable: true,
      placeholderText: '输入好友的邀请码',
      success: result => { if (result.confirm) this.joinByCode(result.content.trim().toUpperCase()) }
    })
  },

  joinByCode(inviteCode) {
    if (!inviteCode) return wx.showToast({ title: '请输入邀请码', icon: 'none' })
    if (!this.isProfileReady || !this.profile) return this.setData({ profileAction: 'profile', pendingInviteCode: inviteCode })
    this.joinWithProfile(inviteCode)
  },

  async joinWithProfile(inviteCode) {
    if (this.isManualEntry) return
    this.isManualEntry = true
    this.stopResumeTimers()
    try {
      wx.showLoading({ title: '加入中' })
      const game = await call('joinGame', { inviteCode })
      this.enterGame({ ...game, status: 'preparing' })
    } catch (error) {
      this.isManualEntry = false
      wx.showToast({ title: error.message, icon: 'none' })
      this.scheduleNextCheck(REFRESH_INTERVAL_MS)
    } finally { wx.hideLoading() }
  }
})