/* ---------- SaveWeb2ZIP – kloning situs ke ZIP ---------- */
import axios from "axios";

const handler = async (m, { conn, usedPrefix, text }) => {
  const url = text?.trim();
  if (!url) {
    return conn.sendMessage(
      m.chat,
      { text: `*Contoh:*\n${usedPrefix}clone https://bprcianjur.co.id` },
      { quoted: m }
    );
  }

  await conn.sendMessage(
    m.chat,
    { text: "⏳ Mengkloning situs…" },
    { quoted: m }
  );

  try {
    const { data } = await axios.get(
      "https://api.nekolabs.my.id/discovery/saveweb2zip",
      { params: { url }, timeout: 60_000 }
    );

    if (!data.success || !data.result?.downloadUrl)
      throw new Error(data.result?.error?.text || "Gagal mengkloning situs.");

    const { downloadUrl, copiedFilesAmount } = data.result;

    await conn.sendMessage(
      m.chat,
      {
        document: { url: downloadUrl },
        fileName: `clone_${Date.now()}.zip`,
        mimetype: "application/zip",
        caption:
          `✅ *Kloning selesai*\n` +
          `📂 File dikloning: ${copiedFilesAmount}\n` +
          `📥 Unduhan: ${downloadUrl}\n\n` +
          `© afkhid-esm`,
      },
      { quoted: m }
    );
  } catch (e) {
    await conn.sendMessage(
      m.chat,
      { text: `❌ ${e.message || "Gagal memproses permintaan."}` },
      { quoted: m }
    );
  }
};

handler.help = ["web2zip <url>"];
handler.tags = ["tools"];
handler.command = /^web2zip$/i;


export default handler;
