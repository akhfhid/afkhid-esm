import fs from "fs";

let handler = async (m, { conn }) => {
  const totalf = Object.values(global.plugins).filter(
    (v) => v.help && v.tags
  ).length;

  const bottime = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
  });

  const replyMessage = `
 *Total Fitur afkhid-esm* 
────────────────────────
📊 Total Fitur : *${totalf}*
⏰ Waktu Bot   : ${bottime}
🌐 Source      : https://s.id/esm
────────────────────────
💡 Gunakan *.help/.menu* untuk melihat daftar fitur lengkap
`;

  try {
    await conn.sendMessage(m.chat, {
      text: replyMessage,
    });
    console.log(`Pesan berhasil dikirim ke ${m.chat}`);
  } catch (err) {
    console.error(`Gagal mengirim pesan ke ${m.chat}:`, err);
  }
};

handler.help = ["totalfitur"];
handler.tags = ["info"];
handler.command = ["totalfitur"];
export default handler;
