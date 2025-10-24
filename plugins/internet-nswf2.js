import axios from "axios";

const handler = async (m, { conn, usedPrefix, command }) => {
  try {
    // ambil gambar dari API
    const { data } = await axios.get(
      "https://api.nekolabs.my.id/random/nsfwhub/pussy",
      {
        responseType: "arraybuffer",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36",
        },
      }
    );

    // kirim ke chat
    await conn.sendFile(
      m.chat,
      Buffer.from(data),
      "nsfw.jpg",
      "_Random NSFW Hub_",
      m
    );
  } catch (e) {
    m.reply(`Gagal mengambil gambar: ${e.message}`);
  }
};

// handler.help = ["nsfwhub"];
// handler.tags = ["nsfw"];
handler.command = /^(pussy)$/i;
handler.nsfw = true;
handler.register = true;

export default handler;
