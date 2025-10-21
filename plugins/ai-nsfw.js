import axios from "axios";
import { Buffer } from "buffer";

const waiNsfw = async (prompt, ratio = "1:1") => {
  const ep = "https://api.nekolabs.my.id/ai/wai-nsfw-illustrous/v11";
  const { data } = await axios.get(ep, {
    params: { prompt, ratio },
    timeout: 120_000, 
  });
  if (!data.success) throw new Error(data.message || "Gagal generate gambar");
  return data.result;
};

const handler = async (m, { conn, usedPrefix, text }) => {
  if (!text) {
    return conn.sendMessage(
      m.chat,
      {
        text: `*Contoh:*\n${usedPrefix}nsfw shiroko blue archive take a bath `,
      },
      { quoted: m }
    );
  }

  let [prompt, ratioPart] = text.split(/--ratio\s+/);
  prompt = prompt.trim();
  const ratio = ratioPart ? ratioPart.trim() : "1:1";

  await conn.sendMessage(
    m.chat,
    { text: "Sedang menggambar, Tunggu sebentar ya..." },
    { quoted: m }
  );

  try {
    const imgUrl = await waiNsfw(prompt, ratio);
    const buffer = await axios
      .get(imgUrl, { responseType: "arraybuffer" })
      .then((r) => Buffer.from(r.data));

    await conn.sendMessage(
      m.chat,
      {
        image: buffer,
        caption: `*Prompt:* ${prompt}\n*Ratio:* ${ratio}\n*©Powered by GPT, Pixiv, Nano Banana*`,
      },
      { quoted: m }
    );
  } catch (e) {
    await conn.sendMessage(
      m.chat,
      { text: "❌ " +  "Gagal generate, coba lagi." },
      { quoted: m }
    );
  }
};

handler.help = ["nsfw <prompt> [--ratio 16:9]"];
handler.tags = ["nsfw", "ai"];
handler.command = /^nsfw$/i;
handler.nsfw = true; 
export default handler;
