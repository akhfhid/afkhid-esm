import fs from 'fs';

let handler = async (m, { conn }) => {
    const totalf = Object.values(global.plugins).filter(v => v.help && v.tags).length;

    const bottime = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const sig = global.sig || 'https://s.id/esm';      
    const thumb = './thumbnail.jpg';                   
    const replyMessage = `Total Fitur Bot Saat ini: ${totalf}`;

    await conn.sendMessage(m.chat, {
        text: replyMessage,
        contextInfo: {                                   
            externalAdReply: {
                showAdAttribution: true,
                title: bottime,
                body: 'Total Cintaku Padamu',
                mediaType: 1,                                
                thumbnail: fs.readFileSync(thumb),
                sourceUrl: sig,
                mediaUrl: ''                                 
            }
        }
    }, { quoted: m });
};

handler.help = ['totalfitur'];
handler.tags = ['info'];
handler.command = ['totalfitur'];
export default handler;