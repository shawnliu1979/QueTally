const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const GAME = db.collection('games')
const PROFILE = db.collection('profiles')
const TRANSFER = db.collection('transfers')
const GAME_STATUSES_TO_DELETE = ['cancelled', 'settled']
const GAME_RETENTION_LIMIT = 100
const PROFILE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000
const ACTIVE_GAME_STATUSES = ['preparing', 'starting', 'active']

const removeOldGames = async () => {
  const result = await GAME.where({ status: _.in(GAME_STATUSES_TO_DELETE) })
    .orderBy('updatedAt', 'asc')
    .limit(GAME_RETENTION_LIMIT + 1)
    .get()

  if (result.data.length <= GAME_RETENTION_LIMIT) return { games: 0, transfers: 0 }

  const gamesToDelete = result.data.slice(0, GAME_RETENTION_LIMIT)
  const gameIds = gamesToDelete.map(game => game._id)

  const transferResult = await TRANSFER.where({ gameId: _.in(gameIds) }).remove()
  await Promise.all(gameIds.map(gameId => GAME.doc(gameId).remove()))

  return { games: gameIds.length, transfers: transferResult.stats.removed }
}

const removeOldProfiles = async () => {
  const expiresAt = Date.now() - PROFILE_RETENTION_MS
  const result = await PROFILE.where({ updatedAt: _.lt(expiresAt) }).limit(100).get()
  const removableProfiles = []
  for (const profile of result.data) {
    const activeGame = await GAME.where({
      memberOpenIds: _.all([profile.openId]),
      status: _.in(ACTIVE_GAME_STATUSES)
    }).limit(1).get()
    if (!activeGame.data.length) removableProfiles.push(profile)
  }
  await Promise.all(removableProfiles.map(profile => PROFILE.doc(profile._id).remove()))
  return removableProfiles.length
}

exports.main = async () => {
  const [games, profiles] = await Promise.all([removeOldGames(), removeOldProfiles()])
  return { gamesDeleted: games.games, transfersDeleted: games.transfers, profilesDeleted: profiles }
}