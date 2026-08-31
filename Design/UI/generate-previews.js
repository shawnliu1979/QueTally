const { execFileSync } = require('child_process')
const { mkdirSync, writeFileSync, renameSync } = require('fs')
const { join } = require('path')

const outputDirectory = __dirname
const paper = '#f7f3e9'
const card = '#fffdf6'
const ink = '#1d302a'
const green = '#1d4b3e'
const red = '#a13e2e'
const line = '#d8d0bd'
const font = '/System/Library/Fonts/Hiragino Sans GB.ttc'
const serif = '/System/Library/Fonts/Hiragino Sans GB.ttc'

function text(value, x, y, size, color = ink, weight = 400, family = font, anchor = 'start') {
  return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}">${value}</text>`
}

function rect(x, y, width, height, fill, stroke = 'none', radius = 0) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
}

function shell(title, eyebrow, content, overlay = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1334" height="1334" viewBox="0 0 750 1334" preserveAspectRatio="xMidYMid meet">
  ${rect(0, 0, 750, 1334, '#e7e0cf')}
  ${rect(60, 34, 630, 1266, '#26352f', 'none', 48)}
  ${rect(74, 48, 602, 1238, paper, 'none', 34)}
  ${rect(293, 48, 164, 26, '#26352f', 'none', 0)}
  ${text(eyebrow, 118, 132, 17, red, 700)}
  ${text(title, 118, 178, 43, ink, 700, serif)}
  ${rect(118, 201, 55, 5, red)}
  ${content}
  ${overlay}
  </svg>`
}

function button(label, x, y, width, primary = true) {
  return `${rect(x, y, width, 74, primary ? green : card, primary ? 'none' : green, 0)}${text(label, x + width / 2, y + 48, 26, primary ? card : green, 700, font, 'middle')}`
}

function avatar(label, x, y, color) {
  return `${rect(x, y, 54, 54, color, 'none', 27)}${text(label, x + 27, y + 36, 23, card, 700, font, 'middle')}`
}

function tableContent() {
  return `${text('ROUND 01', 118, 132, 17, red, 700)}${text('春风一局', 118, 178, 43, ink, 700, serif)}
  ${rect(520, 118, 102, 34, card, '#719080')}${text('待确认 1', 571, 141, 17, green, 600, font, 'middle')}
  ${rect(118, 240, 514, 164, card, line, 0)}${text('我的当前点数', 375, 292, 21, '#6d7a71', 400, font, 'middle')}${text('550', 375, 360, 72, green, 700, serif, 'middle')}${text('点', 468, 360, 20, '#6d7a71')}
  ${text('选择一位成员，记下一笔点数', 118, 460, 20, '#657269')}
  ${rect(118, 494, 156, 152, card, line)}${avatar('雯', 169, 523, '#aa5547')}${text('阿雯', 196, 615, 26, ink, 600, font, 'middle')}
  ${rect(297, 494, 156, 152, card, line)}${avatar('陈', 348, 523, '#b78938')}${text('陈一', 375, 615, 26, ink, 600, font, 'middle')}
  ${rect(476, 494, 156, 152, card, line)}${avatar('北', 527, 523, '#4c7482')}${text('小北', 554, 615, 26, ink, 600, font, 'middle')}
  ${text('局内明细', 118, 1162, 25, green, 500)}${text('结算本局', 632, 1162, 25, red, 500, font, 'end')}`
}

function modal(body) {
  return `${rect(74, 48, 602, 1238, 'rgba(22,34,29,.42)', 'none', 34)}${rect(74, 722, 602, 564, card, 'none', 30)}${body}`
}

const pages = [
  ['QueTally_UI_01_Home.png', shell('雀帐', 'QUE TALLY', `${rect(118, 276, 74, 74, card, red, 0)}${text('雀', 155, 330, 46, red, 700, serif, 'middle')}${text('一局牌，一本清楚的帐。', 118, 471, 27, '#4a5d54', 400, serif)}${button('组一个局', 118, 914, 514)}${button('加入别人', 118, 1010, 514, false)}${text('仅作娱乐记分使用', 375, 1158, 18, '#8c918a', 400, font, 'middle')}`)],
  ['QueTally_UI_02_Setup.png', shell('确认本局', 'ROUND SETTINGS', `${text('本局成员', 118, 264, 20, '#657269')}${rect(118, 284, 514, 288, card, line)}${avatar('林', 144, 310, '#315e4c')}${text('林深', 218, 346, 26, ink, 600)}${text('发起人', 590, 346, 18, '#8a9189', 400, font, 'end')}${avatar('雯', 144, 378, '#aa5547')}${text('阿雯', 218, 414, 26, ink, 600)}${text('已加入', 590, 414, 18, '#8a9189', 400, font, 'end')}${avatar('陈', 144, 446, '#b78938')}${text('陈一', 218, 482, 26, ink, 600)}${text('已加入', 590, 482, 18, '#8a9189', 400, font, 'end')}${avatar('北', 144, 514, '#4c7482')}${text('小北', 218, 550, 26, ink, 600)}${text('已加入', 590, 550, 18, '#8a9189', 400, font, 'end')}${text('初始点数', 118, 632, 20, '#657269')}${rect(118, 653, 514, 88, card, line)}${text('550', 148, 714, 45, green, 700, serif)}${text('点 / 人', 602, 709, 19, '#788078', 400, font, 'end')}${button('开始', 118, 841, 514)}${button('取消', 118, 938, 514, false)}`)],
  ['QueTally_UI_03_Table.png', shell('春风一局', 'ROUND 01', tableContent())],
  ['QueTally_UI_04_Payment.png', shell('春风一局', 'ROUND 01', tableContent(), modal(`${text('给付点数给', 118, 788, 20, '#788078')}${text('阿雯', 118, 843, 45, ink, 700, serif)}${text('输入点数', 118, 928, 26, '#8c918a')}${text('点', 602, 928, 22, '#657269', 400, font, 'end')}${rect(118, 946, 514, 2, green)}${text('确认后等待对方核对', 118, 982, 18, '#8c918a')}${button('返回', 118, 1086, 244, false)}${button('确认', 388, 1086, 244)}`))],
  ['QueTally_UI_05_Incoming.png', shell('春风一局', 'ROUND 01', tableContent(), modal(`${text('收到一笔划转', 118, 788, 20, '#788078')}${text('阿雯 → 我', 118, 843, 45, ink, 700, serif)}${text('+ 60 点', 118, 930, 58, '#1d7556', 700, serif)}${text('点数小记：550 点 → 610 点', 118, 974, 18, '#657269')}${button('拒绝', 118, 1086, 244, false)}${button('确认', 388, 1086, 244)}`))],
  ['QueTally_UI_06_Detail.png', shell('春风一局', 'ROUND 01', tableContent(), `${rect(74, 48, 602, 1238, 'rgba(22,34,29,.42)', 'none', 34)}${rect(74, 326, 602, 960, card, 'none', 30)}${text('ROUND 01 / RECORDS', 118, 397, 17, red, 700)}${text('局内明细', 118, 444, 42, ink, 700, serif)}${text('返回', 626, 432, 22, green, 500, font, 'end')}${rect(118, 478, 514, 60, '#f5f0e4')}${text('共 3 笔记录', 140, 516, 17, '#657269')}${text('含 1 笔确认中', 610, 516, 17, '#657269', 400, font, 'end')}${text('阿雯 → 我', 118, 587, 25, ink, 600)}${text('+ 60', 632, 587, 30, '#1d7556', 700, serif, 'end')}${text('刚刚   已确认', 118, 618, 17, '#858c84')}${text('点数小记：550 点 → 610 点', 118, 653, 18, '#657269')}${rect(118, 680, 514, 1, line)}${text('我 → 陈一', 118, 733, 25, ink, 600)}${text('- 40', 632, 733, 30, red, 700, serif, 'end')}${text('18:24   确认中', 118, 764, 17, '#858c84')}${text('点数小记：470 点 → 430 点', 118, 799, 18, '#657269')}`)],
  ['QueTally_UI_07_Settlement.png', shell('本局结算', 'ROUND 01 / SETTLEMENT', `${rect(118, 266, 514, 306, card, line)}${text('初始点数', 148, 337, 25, '#657269')}${text('550', 570, 344, 45, green, 700, serif, 'end')}${text('当前点数', 148, 432, 25, '#657269')}${text('550', 570, 439, 45, green, 700, serif, 'end')}${text('本局结余', 148, 527, 25, '#657269')}${text('0', 570, 534, 45, red, 700, serif, 'end')}${text('本局所有记录均已核对', 375, 624, 19, '#6d7a71', 400, font, 'middle')}${button('确认结算', 118, 720, 514)}`)]
]

mkdirSync(join(outputDirectory, '.preview-tmp'), { recursive: true })
for (const [filename, svg] of pages) {
  const source = join(outputDirectory, '.preview-tmp', filename.replace('.png', '.svg'))
  writeFileSync(source, svg)
  execFileSync('qlmanage', ['-t', '-s', '1334', '-o', join(outputDirectory, '.preview-tmp'), source], { stdio: 'ignore' })
  execFileSync('convert', [`${source}.png`, '-crop', '750x1334+292+0', '+repage', join(outputDirectory, filename)], { stdio: 'ignore' })
  renameSync(`${source}.png`, `${source}.rendered.png`)
}