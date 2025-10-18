import axios from "axios";

const searchKomik = async (query) => {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.nekolabs.my.id/discovery/komikindo/v1/search?q=${encodedQuery}`;
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
      { text: `*Contoh:* ${usedPrefix}komikindo Naruto` },
      { quoted: m }
    );
    return;
  }

  await conn.sendMessage(
    m.chat,
    { text: `Sedang mencari komik...  ` },
    { quoted: m }
  );

  try {
    const results = await searchKomik(text);
    if (results.length === 0) {
      await conn.sendMessage(
        m.chat,
        { text: "No results found." },
        { quoted: m }
      );
      return;
    }

    for (const result of results) {
      const caption = `*Title:* ${result.title}\n*Rating:* ${result.rating}\n*URL:* ${result.url}`;
      await conn.sendMessage(
        m.chat,
        { image: { url: result.cover }, caption: caption },
        { quoted: m }
      );
    }
  } catch (e) {
    await conn.sendMessage(m.chat, { text: "❌ " + e.message }, { quoted: m });
  }
};

handler.help = ["komikindo <query>"];
handler.tags = ["tools"];
handler.command = /^komikindo$/i;

export default handler;
