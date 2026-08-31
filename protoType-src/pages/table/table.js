Page({
  data: {
    modal: '',
    selectedPlayer: '',
    amount: '',
    score: 550,
    players: [
      { name: '阿雯', glyph: '雯', tone: 'red' },
      { name: '陈一', glyph: '陈', tone: 'yellow' },
      { name: '小北', glyph: '北', tone: 'blue' }
    ],
    records: [
      { direction: '阿雯 → 我', time: '刚刚', amount: '+ 60', before: '550', after: '610', status: '已确认', type: 'in' },
      { direction: '我 → 陈一', time: '18:24', amount: '- 40', before: '470', after: '430', status: '确认中', type: 'out' },
      { direction: '小北 → 我', time: '18:06', amount: '+ 50', before: '510', after: '560', status: '已确认', type: 'in' }
    ]
  },
  openPayment(event) {
    this.setData({ modal: 'payment', selectedPlayer: event.currentTarget.dataset.name, amount: '' })
  },
  openIncoming() { this.setData({ modal: 'incoming' }) },
  openDetail() { this.setData({ modal: 'detail' }) },
  closeModal() { this.setData({ modal: '' }) },
  stopModalTap() {},
  changeAmount(event) { this.setData({ amount: event.detail.value }) },
  confirmPayment() { this.setData({ modal: '' }) },
  acceptIncoming() { this.setData({ modal: '' }) },
  rejectIncoming() { this.setData({ modal: '' }) },
  goSettle() { wx.navigateTo({ url: '/pages/settle/settle' }) }
})