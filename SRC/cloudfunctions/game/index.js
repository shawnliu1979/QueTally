const cloud = require('wx-server-sdk')
const { MIN_MEMBERS_TO_START, START_COUNTDOWN_MS, TRANSFER_CONFIRMATION_TIMEOUT_MS } = require('./config')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const GAME = db.collection('games')
const PROFILE = db.collection('profiles')
const TRANSFER = db.collection('transfers')
const ACTIVE = ['preparing', 'starting', 'active']
const TONES = ['green', 'red', 'yellow', 'blue', 'green']

const fail = message => { throw new Error(message) }
const code = () => Math.random().toString(36).slice(2, 8).toUpperCase()
const profileFromEvent = profile => ({
  name: typeof profile?.name === 'string' && profile.name.trim() ? profile.name.trim().slice(0, 32) : '牌友',
  avatarUrl: typeof profile?.avatarUrl === 'string' ? profile.avatarUrl : ''
})
const getProfile = async openId => {
  try {
    const result = await PROFILE.doc(openId).get()
    return result.data
  } catch (error) {
    return null
  }
}
const hydrateMembers = async members => {
  const result = await PROFILE.where({ openId: _.in(members.map(member => member.openId)) }).get()
  const profiles = result.data.reduce((items, profile) => {
    items[profile.openId] = profile
    return items
  }, {})
  return members.map(member => {
    const profile = profiles[member.openId]
    return profile ? { ...member, name: profile.name, avatarUrl: profile.avatarUrl, glyph: profile.name.slice(0, 1) } : member
  })
}
const memberView = (member, game) => ({ ...member, isOwner: member.openId === game.ownerOpenId })
const assertMember = (game, openId) => { if (!game || !game.memberOpenIds.includes(openId)) fail('你不在这个局内') }
const getGame = async gameId => { const result = await GAME.doc(gameId).get(); return result.data }
const activateStartedGame = async game => {
  if (game && game.status === 'starting' && game.startsAt <= Date.now()) {
    await GAME.doc(game._id).update({ data: { status: 'active', updatedAt: Date.now() } })
    return { ...game, status: 'active' }
  }
  return game
}
const balance = (transfers, openId, initial) => transfers.filter(item => item.status === 'confirmed').reduce((total, item) => total + (item.toOpenId === openId ? item.amount : item.fromOpenId === openId ? -item.amount : 0), initial)
const expire = async transfers => Promise.all(transfers.filter(item => item.status === 'pending' && item.expiresAt <= Date.now()).map(item => TRANSFER.doc(item._id).update({ data: { status: 'expired', updatedAt: Date.now() } })))
const transfersFor = async gameId => { const result = await TRANSFER.where({ gameId }).orderBy('createdAt', 'desc').limit(100).get(); await expire(result.data); return (await TRANSFER.where({ gameId }).orderBy('createdAt', 'desc').limit(100).get()).data }
const publicRound = async (game, openId) => {
  const transfers = await transfersFor(game._id)
  const members = (await hydrateMembers(game.members)).map(item => memberView(item, game))
  const own = members.find(item => item.openId === openId)
  const relatedTransfers = transfers.filter(item => item.fromOpenId === openId || item.toOpenId === openId).map(item => {
    const beforeBalance = balance(transfers.filter(record => record.createdAt < item.createdAt), openId, game.initialScore)
    const delta = item.toOpenId === openId ? item.amount : -item.amount
    return { ...item, beforeBalance, afterBalance: beforeBalance + delta }
  })
  const confirmedBalance = balance(transfers, openId, game.initialScore)
  const lockedPoints = transfers.filter(item => item.fromOpenId === openId && item.status === 'pending').reduce((total, item) => total + item.amount, 0)
  return { game: { ...game, members, isOwner: game.ownerOpenId === openId }, myBalance: confirmedBalance - lockedPoints, confirmedBalance, others: members.filter(item => item.openId !== openId), transfers: relatedTransfers, pendingCount: transfers.filter(item => item.status === 'pending').length, me: own }
}

exports.main = async event => {
  const { OPENID: openId } = cloud.getWXContext()
  try {
    if (event.action === 'getMyProfile') return { ok: true, data: await getProfile(openId) }
    if (event.action === 'saveMyProfile') {
      const profile = profileFromEvent(event.profile)
      if (!profile.avatarUrl) fail('请选择头像')
      await PROFILE.doc(openId).set({ data: { openId, ...profile, updatedAt: Date.now() } })
      return { ok: true, data: profile }
    }
    if (event.action === 'myActiveGame') {
      const result = await GAME.where({ memberOpenIds: _.all([openId]), status: _.in(ACTIVE) }).limit(1).get()
      const game = await activateStartedGame(result.data[0])
      return { ok: true, data: game || null }
    }
    if (event.action === 'createGame') {
      const existing = await GAME.where({ memberOpenIds: _.all([openId]), status: _.in(ACTIVE) }).limit(1).get()
      if (existing.data.length) fail('你还在一个未结束的局里')
      const profile = await getProfile(openId)
      if (!profile) fail('请先完成个人资料设置')
      const member = { openId, ...profile, glyph: profile.name.slice(0, 1), tone: TONES[0] }
      const result = await GAME.add({ data: { title: '春风一局', roundNo: 1, ownerOpenId: openId, memberOpenIds: [openId], members: [member], initialScore: 550, inviteCode: code(), status: 'preparing', createdAt: Date.now(), updatedAt: Date.now() } })
      return { ok: true, data: { _id: result._id } }
    }
    if (event.action === 'joinGame') {
      const existing = await GAME.where({ memberOpenIds: _.all([openId]), status: _.in(ACTIVE) }).limit(1).get()
      if (existing.data.length) fail('你还在一个未结束的局里')
      const result = await GAME.where({ inviteCode: event.inviteCode, status: 'preparing' }).limit(1).get()
      const game = result.data[0]
      if (!game) fail('该邀请码没有待开始的局')
      if (game.members.length >= 5) fail('本局人数已满')
      const profile = await getProfile(openId)
      if (!profile) fail('请先完成个人资料设置')
      const member = { openId, ...profile, glyph: profile.name.slice(0, 1), tone: TONES[game.members.length] }
      await GAME.doc(game._id).update({ data: { members: [...game.members, member], memberOpenIds: [...game.memberOpenIds, openId], updatedAt: Date.now() } })
      return { ok: true, data: { _id: game._id } }
    }
    if (typeof event.gameId !== 'string' || !event.gameId) fail('对局参数无效，请返回首页后重试')
    const game = await activateStartedGame(await getGame(event.gameId))
    assertMember(game, openId)
    if (event.action === 'getGame') return { ok: true, data: { ...game, members: (await hydrateMembers(game.members)).map(item => memberView(item, game)), isOwner: game.ownerOpenId === openId } }
    if (event.action === 'getRound') return { ok: true, data: await publicRound(game, openId) }
    if (event.action === 'startGame') {
      if (game.ownerOpenId !== openId) fail('只有发起人可以开始')
      const initialScore = Number(event.initialScore)
      if (!Number.isInteger(initialScore) || initialScore <= 0) fail('初始点数必须为正整数')
      if (game.members.length < MIN_MEMBERS_TO_START) fail(`请至少邀请 ${MIN_MEMBERS_TO_START - 1} 位好友`)
      const startsAt = Date.now() + START_COUNTDOWN_MS
      await GAME.doc(game._id).update({ data: { status: 'starting', initialScore, startsAt, updatedAt: Date.now() } })
      return { ok: true, data: { _id: game._id, startsAt } }
    }
    if (event.action === 'leaveGame') {
      if (game.status !== 'preparing') fail('开局后不能退出本局')
      if (game.ownerOpenId === openId) await GAME.doc(game._id).update({ data: { status: 'cancelled', updatedAt: Date.now() } })
      else await GAME.doc(game._id).update({ data: { members: game.members.filter(item => item.openId !== openId), memberOpenIds: game.memberOpenIds.filter(item => item !== openId), updatedAt: Date.now() } })
      return { ok: true, data: null }
    }
    if (event.action === 'createTransfer') {
      if (game.status !== 'active') fail('本局尚未开始或已经结束')
      if (!game.memberOpenIds.includes(event.toOpenId) || event.toOpenId === openId) fail('请选择局内其他成员')
      const amount = Number(event.amount)
      if (!Number.isInteger(amount) || amount <= 0 || amount > 100000) fail('点数必须是 1 到 100000 的整数')
      const result = await TRANSFER.add({ data: { gameId: game._id, fromOpenId: openId, toOpenId: event.toOpenId, amount, status: 'pending', createdAt: Date.now(), updatedAt: Date.now(), expiresAt: Date.now() + TRANSFER_CONFIRMATION_TIMEOUT_MS } })
      return { ok: true, data: { _id: result._id } }
    }
    if (event.action === 'respondTransfer') {
      if (typeof event.transferId !== 'string' || !event.transferId) fail('划转记录无效，请刷新后重试')
      const result = await TRANSFER.doc(event.transferId).get(); const transfer = result.data
      if (!transfer || transfer.gameId !== game._id || transfer.toOpenId !== openId) fail('没有可处理的划转')
      if (transfer.status !== 'pending' || transfer.expiresAt <= Date.now()) { if (transfer.status === 'pending') await TRANSFER.doc(transfer._id).update({ data: { status: 'expired', updatedAt: Date.now() } }); fail('该划转已超时') }
      await TRANSFER.doc(transfer._id).update({ data: { status: event.accept ? 'confirmed' : 'rejected', updatedAt: Date.now() } })
      return { ok: true, data: null }
    }
    if (event.action === 'getSettlement') { const round = await publicRound(game, openId); return { ok: true, data: { initial: game.initialScore, current: round.confirmedBalance, surplus: round.confirmedBalance - game.initialScore, pendingCount: round.pendingCount } } }
    if (event.action === 'settleGame') {
      if (game.ownerOpenId !== openId) fail('只有开局者可以结算本局')
      if (game.status === 'settled') return { ok: true, data: null }
      const transfers = await transfersFor(game._id)
      if (transfers.some(item => item.status === 'pending')) fail('请先处理待确认记录')
      await GAME.doc(game._id).update({ data: { status: 'settled', settledAt: Date.now(), updatedAt: Date.now() } })
      return { ok: true, data: null }
    }
    fail('未知操作')
  } catch (error) { return { ok: false, message: error.message || '操作失败' } }
}