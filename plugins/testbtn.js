import { sendInteractiveMessage } from "buttons-warpper";

let handler = async (m, { conn }) => {
  console.log("[TESTBTN] handler aktif oleh:", m.sender);

  // Pesan teks utama
  await conn.sendMessage(
    m.chat,
    { text: "🔰 Bot aktif, sedang uji tombol..." },
    { quoted: m }
  );

  // Definisi tombol interaktif
  const interactiveButtons = [
    {
      name: "quick_reply",
      buttonParamsJson: JSON.stringify({
        display_text: "📋 Menu",
        id: ".menu",
      }),
    },
    {
      name: "quick_reply",
      buttonParamsJson: JSON.stringify({
        display_text: "🏓 Ping",
        id: "ping",
      }),
    },
    {
      name: "cta_url",
      buttonParamsJson: JSON.stringify({
        display_text: "🌐 Kunjungi Situs",
        url: "https://afkhid.my.id",
      }),
    },
  ];

  // Kirim tombol dengan wrapper
  await sendInteractiveMessage(conn, m.chat, {
    text: "Test tombol berhasil ✅\nSilakan pilih aksi di bawah:",
    footer: "© afkhid-esm",
    interactiveButtons,
  });
};

handler.command = /^testbtn$/i;
export default handler;
