const STATUS_TEXT = {
  pending: '确认中',
  confirmed: '已确认',
  rejected: '已拒绝',
  expired: '已超时'
}

const formatTransfers = (transfers, members, myOpenId) => {
  const memberNames = members.reduce((names, member) => {
    names[member.openId] = member.name
    return names
  }, {})

  return transfers.map(transfer => {
    const toMe = transfer.toOpenId === myOpenId
    const otherOpenId = toMe ? transfer.fromOpenId : transfer.toOpenId
    return {
      ...transfer,
      toMe,
      fromName: memberNames[transfer.fromOpenId],
      direction: `${toMe ? memberNames[otherOpenId] : '我'} → ${toMe ? '我' : memberNames[otherOpenId]}`,
      signedAmount: `${toMe ? '+' : '-'} ${transfer.amount}`,
      type: toMe ? 'in' : 'out',
      before: transfer.beforeBalance,
      after: transfer.afterBalance,
      time: new Date(transfer.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      statusText: STATUS_TEXT[transfer.status]
    }
  })
}

module.exports = { formatTransfers }