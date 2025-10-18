import axios from "axios";

const aiResearch = async (query) => {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.nekolabs.my.id/ai/ai-research?text=${encodedQuery}`;
    const { data } = await axios.get(url);
    return data.result;
  } catch (error) {
    throw new Error(error.message);
  }
};

let handler = async (m, { conn, usedPrefix, text }) => {
  if (!text) {
    await conn.sendMessage(
      m.chat,
      {
        text: `Penggunaan:\n${usedPrefix}research <query>\n\nContoh:\n${usedPrefix}research demonstrasi di indonesia terjadi karena apa`,
      },
      { quoted: m }
    );
    return;
  }

  await conn.sendMessage(m.chat, { text: "Searching..." }, { quoted: m });

  try {
    const result = await aiResearch(text);
    let caption = `*Query:* ${result.query}\n\n*Report:*\n${result.report}\n\n`;

    if (result.files) {
      caption += `*Files:*\n`;
      for (const [format, url] of Object.entries(result.files)) {
        caption += `${format.toUpperCase()}: ${url}\n`;
      }
    }

    await conn.sendMessage(m.chat, { text: caption }, { quoted: m });
  } catch (e) {
    await conn.sendMessage(m.chat, { text: "❌ " + e.message }, { quoted: m });
  }
};

handler.help = ["research <query>"];
handler.tags = ["tools"];
handler.command = /^research$/i;

export default handler;
