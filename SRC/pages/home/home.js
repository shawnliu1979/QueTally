const { call, getStoredProfile, saveProfile, uploadAvatar } = require('../../utils/game')
const { ACTIVE_GAME_REDIRECT_DELAY_MS, REFRESH_INTERVAL_MS, DEBUG_MODE, APL_VERSION } = require('../../config')

Page({
  data: { tagline: '', inviteCode: '', activeGameId: '', profileAction: '', profileName: '', profileAvatarUrl: '', pendingInviteCode: '', aplVersion: APL_VERSION },

  debugModal(title, detail) {
    if (!DEBUG_MODE) return
    wx.showModal({
      title,
      content: typeof detail === 'string' ? detail : JSON.stringify(detail),
      showCancel: false
    })
  },

  onLoad(options) {
    this.debugModal('首页 onLoad', {
      options,
      invite: options && options.invite,
      scene: options && options.scene
    })
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
    const app = getApp()
    this.debugModal('首页 onShow', {
      inviteCode: this.data.inviteCode,
      pendingInviteCode: this.data.pendingInviteCode,
      appPendingInviteCode: app.globalData.pendingInviteCode
    })
    const pendingInviteCode = app.globalData.pendingInviteCode
    if (pendingInviteCode && pendingInviteCode !== this.data.pendingInviteCode) {
      app.globalData.pendingInviteCode = ''
      this.setData({ inviteCode: pendingInviteCode, pendingInviteCode })
      if (this.isProfileReady && this.profile && this.profile.avatarUrl) {
        this.joinWithProfile(pendingInviteCode)
        return
      }
      this.setData({ profileAction: 'profile' })
      return
    }
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
    this.debugModal('准备进入对局', game)
    if (!game || !game._id) {
      this.debugModal('进入失败', '加入成功但缺少对局编号')
      wx.showToast({ title: '加入成功但缺少对局编号', icon: 'none' })
      return
    }
    const page = game.status === 'preparing' || game.status === 'starting' ? 'setup/setup' : 'table/table'
    this.stopResumeTimers()
    wx.reLaunch({
      url: `/pages/${page}?gameId=${game._id}`,
      success: () => this.debugModal('跳转成功', `/pages/${page}?gameId=${game._id}`),
      fail: () => {
        this.debugModal('跳转失败', `/pages/${page}?gameId=${game._id}`)
        this.isRedirecting = false
        this.scheduleNextCheck(REFRESH_INTERVAL_MS)
        wx.showToast({ title: '进入对局失败，请重试', icon: 'none' })
      }
    })
  },

  async loadProfile() {
    this.debugModal('loadProfile', {
      pendingInviteCode: this.data.pendingInviteCode,
      inviteCode: this.data.inviteCode
    })
    try {
      const [profile, activeGame] = await Promise.all([call('getMyProfile'), call('myActiveGame')])
      this.isProfileReady = true
      const cachedProfile = getStoredProfile()
      const currentProfile = profile || cachedProfile
      if (currentProfile) {
        saveProfile(currentProfile)
        this.profile = currentProfile
      }
      if (activeGame && activeGame._id) {
        this.setData({ profileAction: '', profileName: currentProfile ? currentProfile.name : '', profileAvatarUrl: currentProfile ? currentProfile.avatarUrl : '' })
        if (this.isPageVisible) this.resumeGame()
        return
      }

      if (currentProfile && currentProfile.avatarUrl) {
        this.setData({ profileAction: '', profileName: currentProfile.name, profileAvatarUrl: currentProfile.avatarUrl })
        if (this.data.pendingInviteCode) return this.joinWithProfile(this.data.pendingInviteCode)
        if (this.isPageVisible) this.resumeGame()
        return
      }

      this.setData({
        profileAction: 'profile',
        profileName: currentProfile ? currentProfile.name : '',
        profileAvatarUrl: currentProfile ? currentProfile.avatarUrl : ''
      })
    } catch (error) {
      wx.showToast({ title: '无法读取个人资料，请检查网络', icon: 'none' })
    }
  },

  chooseAvatar(event) { this.setData({ profileAvatarUrl: event.detail.avatarUrl }) },
  changeProfileName(event) {
    const value = event.detail.value || event.detail.nickname || ''
    this.profileNameInput = value
    this.setData({ profileName: value })
  },

  enterAsGuest() {
    const guestName = `游客${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
    this.submitProfile(true, guestName)
  },

  confirmProfile() {
    this.submitProfile(false)
  },

  async submitProfile(isGuest = false, guestName = '') {
    const { profileName, profileAvatarUrl, pendingInviteCode } = this.data
    const name = isGuest ? guestName.trim() : String(this.profileNameInput || profileName || '').trim()
    if (!name) return wx.showToast({ title: '请输入昵称', icon: 'none' })
    if (!isGuest && !profileAvatarUrl) return wx.showToast({ title: '请选择头像，或以游客身份进入', icon: 'none' })
    try {
      wx.showLoading({ title: '保存资料' })
      const profile = { name, avatarUrl: isGuest ? '' : await uploadAvatar(profileAvatarUrl) }
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
    this.debugModal('开始加入', `邀请码：${inviteCode}`)
    try {
      wx.showLoading({ title: '加入中' })
      const game = await call('joinGame', { inviteCode })
      this.debugModal('加入返回', game)
      this.enterGame({ ...game, status: 'preparing' })
    } catch (error) {
      this.debugModal('加入失败', error.message || String(error))
      this.isManualEntry = false
      wx.showToast({ title: error.message, icon: 'none' })
      this.scheduleNextCheck(REFRESH_INTERVAL_MS)
    } finally { wx.hideLoading() }
  }
})