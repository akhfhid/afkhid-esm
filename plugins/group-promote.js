import { areJidsSameUser } from '@whiskeysockets/baileys'
let handler = async (m, { conn, participants }) => {
    let who = m.quoted ? m.quoted.sender : m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : text ? (text.replace(/\D/g, '') + '@s.whatsapp.net') : ''
    if (!who || who == m.sender) throw conn.sendMessage(m.chat,{
        text : "Reply / tag yang ingin di promote"
    })
    conn.groupParticipantsUpdate(m.chat, [who], 'promote')
    .then(async _ => await conn.sendMessage(m.chat,{
        text: "Success"
    }) )

}
handler.help = ['promote @tag']
handler.tags = ['group']
handler.command = /^(promote)$/i
handler.admin = true
handler.group = true
handler.botAdmin = true

export default handler