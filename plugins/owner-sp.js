import fs from 'fs'

let handler = async (m, { text, usedPrefix, command }) => {
    if (!text) await conn.sendMessage(m.chat,{
        text: `uhm.. nama pluginnya mana?\n\ncontoh:\n${usedPrefix + command} test\n(balas pesan berisi kode plugin)`
    }) 
    // if (!m.quoted?.text) 
    if (!m.quoted?.text) await conn.sendMessage(m.chat, {
        text: `balas pesan yang berisi kode plugin yang ingin disimpan!`
    }) 
    let path = `plugins/${text}.js`
    await fs.writeFileSync(path, m.quoted.text)
    conn.sendMessage(m.chat,{
        text: ` Plugin berhasil disimpan di: ${path}`
    })
    // m.reply(``)
}

handler.help = ['sp'].map(v => v + ' <nama_plugin>')
handler.tags = ['owner']
handler.command = /^sp$/i
handler.rowner = true

export default handler
