let handler = async (m, { conn, text }) => {
    if (!text) return await conn.sendMessage(m.chat, { text: 'Use example: \n.qrcode Anjayy slebew' }, { quoted: m })
    conn.sendFile(m.chat, `https://quickchart.io/qr?size=300&margin=2&text=${encodeURIComponent(text)}`, 'qrcode.png', 'QR Code by Afkhidbot', m)
}

handler.help = ['qrcode <teks>']
handler.tags = ['tools']
handler.command = /^qr(code)?$/i

export default handler