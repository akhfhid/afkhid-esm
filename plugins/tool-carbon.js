import axios from "axios";

const carbonify = async (code) => {
  try {
    const encodedCode = encodeURIComponent(code);
    const url = `https://api.nekolabs.my.id/canvas/carbonify?code=${encodedCode}`;
    const { data } = await axios.get(url, { responseType: "arraybuffer" });
    return data; // Mengembalikan buffer gambar
  } catch (error) {
    throw new Error(error.message);
  }
};

let handler = async (m, { conn, usedPrefix, text }) => {
  /* penggunaan: .carbon <code> */
  if (!text) {
    await conn.sendMessage(
      m.chat,
      { text: `*Contoh:* ${usedPrefix}carbon console.log(1+1)` },
      { quoted: m }
    );
    return;
  }

  await conn.sendMessage(
    m.chat,
    { text: "Generating image..." },
    { quoted: m }
  );

  try {
    const imageBuffer = await carbonify(text);
    await conn.sendMessage(
      m.chat,
      { image: imageBuffer, caption: "Here is your code image!" },
      { quoted: m }
    );
  } catch (e) {
    await conn.sendMessage(m.chat, { text: "❌ " + e.message }, { quoted: m });
  }
};

handler.help = ["carbon <code>"];
handler.tags = ["tools"];
handler.command = /^carbon$/i;

export default handler;
