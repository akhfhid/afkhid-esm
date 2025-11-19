import os, { cpus as _cpus, totalmem, freemem } from 'os'
import { performance } from 'perf_hooks'
import { sizeFormatter } from 'human-readable'

let format = sizeFormatter({
  std: 'JEDEC',
  decimalPlaces: 2,
  keepTrailingZeroes: false,
  render: (literal, symbol) => `${literal} ${symbol}B`,
})
let handler = async (m, { conn }) => {
  let _muptime = process.uptime() * 1000
  let muptime = clockString(_muptime)
  const cpuList = _cpus()
  const cpu = cpuList[0]
  const avgSpeed = cpuList.reduce((a, c) => a + c.speed, 0) / cpuList.length

  let old = performance.now()
  await m.reply('⏳ Menghitung ping…')
  let neww = performance.now()
  let speed = neww - old
  const usedMem = totalmem() - freemem()

  let reply = `
🔥 *SERVER STATUS* 🔥

⏱️ Uptime       : ${muptime}
⚡ Ping         : ${Math.round(speed)} ms
🖥 CPU          : ${cpu.model.trim()} (${cpuList.length} Core, ${avgSpeed.toFixed(2)} MHz)
💾 Memory       : ${format(usedMem)} / ${format(totalmem())}
🖧 OS / Host    : ${os.platform()} / ${os.hostname()}
`;

  await conn.sendMessage(m.chat, { text: reply })
}

handler.help = ['ping']
handler.tags = ['info']
handler.command = /^(ping)$/i
export default handler

function clockString(ms) {
  let d = Math.floor(ms / 86400000)
  let h = Math.floor(ms / 3600000) % 24
}
