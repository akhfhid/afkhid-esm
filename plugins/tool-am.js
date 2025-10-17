import axios from "axios";

let handler = async (m, { text, usedPrefix, command, conn }) => {
  if (!text)
    return m.reply(
      `Contoh:\n${
        usedPrefix + command
      } https://alightcreative.com/am/share/u/tY7cDfOiDthNr30S4gNzpIarQSJ2/p/MKMSZ9lysn-4a8cee46ca276e0d`
    );

  const regex =
    /https:\/\/alightcreative\.com\/am\/share\/u\/([\w-]+)\/p\/([\w-]+)/;
  const match = text.match(regex);

    if (!match)
        return await conn.sendMessage(m.chat, {
          text: "URL tidak valid! Pastikan itu adalah link Alight Motion yang benar.",
        });
  try {
    const { data } = await axios.post(
      "https://us-central1-alight-creative.cloudfunctions.net/getProjectMetadata",
      {
        data: {
          uid: match[1],
          pid: match[2],
          platform: "android",
          appBuild: 1002592,
          acctTestMode: "normal",
        },
      },
      { headers: { "content-type": "application/json; charset=utf-8" } }
    );

    const info = data.result.info;  await conn.sendMessage(
      m.chat,
      { text: "Sedang mencari data preset)" },
    );
    const caption = `
🎬 *${info.title || "Tanpa Judul"}*
👤 *Pembuat:* ${info.authorName || "-"}
📦 *Ukuran:* ${(info.size / 1024 / 1024).toFixed(2)} MB
📅 *Tanggal Share:* ${new Date(info.shareDate._seconds * 1000).toLocaleString(
      "id-ID"
    )}
📱 *Platform:* ${info.amPlatform}
💾 *Versi:* ${info.amVersionString}
📥 *Downloads:* ${info.downloads?.toLocaleString() ?? 0}
❤️ *Likes:* ${info.likes ?? 0}
🎞️ *Durasi Video:* ${info.mediaFiles?.[0]?.video?.duration ?? "-"} detik
🧩 *Efek Digunakan:* ${info.requiredEffects?.length ?? 0}
🔗 *Link:* ${text}
    `.trim();
    if (info.previewUrl) {
      await conn.sendMessage(m.chat, {
        video: { url: info.previewUrl },
        caption,
      });
    } else {
      await conn.sendMessage(m.chat, {
        image: { url: info.largeThumbUrl },
        caption,
      });
    }
  } catch (e) {
    console.error(e);
    m.reply("❌ Gagal mengambil data dari link Alight Motion.");
  }
};

handler.help = ["amdata <url>"];
handler.tags = ["tools"];
handler.command = /^amdata$/i;
export default handler;
