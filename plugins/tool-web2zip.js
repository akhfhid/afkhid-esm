// file: handler-web2zip-api.js
import axios from "axios";

let handler = async (m, { conn }) => {
  const args = m.text.trim().split(/\s+/);
  const target = args[1] || "";
  if (!/^https?:\/\//.test(target)) {
    return await conn.sendMessage(
      m.chat,
      {
        text: "Berikan URL yang valid.\nContoh: *.web2zip https://example.com*",
        footer: "© afkhid-esm",
        templateButtons: [{ type: "reply", id: ".web2zip", text: "Coba lagi" }],
      },
      { quoted: m }
    );
  }

  await conn.sendMessage(
    m.chat,
    { text: "🕒 Sedang memproses… (bisa 10-60 detik)" },
    { quoted: m }
  );

  try {
    const response = await axios.get(
      `https://api.nekolabs.web.id/tools/web2zip?url=${encodeURIComponent(
        target
      )}`
    );
    const data = response.data;

    if (!data.success) {
      throw new Error(data.message || "API gagal memproses");
    }

    const downloadUrl = data.result.downloadUrl;
    const domain = data.result.url;

    const caption = `✅ Proses selesai!\n🔗 Website: ${domain}\n📦 Download: ${downloadUrl}`;

    await conn.sendMessage(
      m.chat,
      {
        text: caption,
        footer: "© afkhid-esm",
        templateButtons: [
          {
            type: "url",
            url: downloadUrl,
            text: "🔗 Download",
          },
          {
            type: "reply",
            id: ".deploy",
            text: "🚀 Deploy",
          },
          {
            type: "reply",
            id: ".web2zip",
            text: "🔄 Coba lagi",
          },
        ],
      },
      { quoted: m }
    );
  } catch (e) {
    console.error(e);
    await conn.sendMessage(
      m.chat,
      {
        text: "❌ " + e.message,
        footer: "© afkhid-esm",
        templateButtons: [{ type: "reply", id: ".web2zip", text: "Coba lagi" }],
      },
      { quoted: m }
    );
  }
};

handler.help = ["web2zip"];
handler.tags = ["tools"];
handler.command = ["web2zip", "w2z"];

export default handler;
