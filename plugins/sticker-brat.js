import fetch from 'node-fetch'

let handler = async (m, { conn, command, text }) => {
  // if (!text || !text.trim()) throw 'Masukkan teks yang valid!'
  if (!text || !text.trim()) {
    await conn.sendMessage(m.chat, {
      text: "Masukan text yang valid.\n*Example Sticker :* .brat affan ganteng\n*Example Sticker Vid :* .bratvid affan ganteng banget plish"
    })
    return
  }

  try {
    let end = '/api/image/brat?text='
    if (/vid|video/i.test(command)) {
      end = '/api/image/brat/animated?text='
    }
    let url = APIs.ryzumi + end + encodeURIComponent(text.trim())
    conn.sendSticker(m.chat, url, m)
  } catch (err) {
    console.error('Error:', err)
    await conn.sendMessage(m.chat, {
      text: `Error : ${err.message || 'Gagal mengambil gambar'}`

    })
    await m.reply(`Error: ${err.message || 'Gagal mengambil gambar.'}`)
  }
}

handler.help = ['brat', 'bratvid']
handler.tags = ['sticker']
handler.command = /^(brat|brat(vid|video))$/i
// handler.register = true

export default handler
