import axios from "axios";
import { Buffer } from "buffer";

const MAX = 5;

const handler = async (m, { conn, usedPrefix, text }) => {
  if (!text) {
    return conn.sendMessage(
      m.chat,
      { text: `*Contoh:*\n${usedPrefix}deviant Reze Chainsaw Man` },
      { quoted: m }
    );
  }
//  let command = text
  await conn.sendMessage(
    m.chat,
    { text: `Mengumpulkan karya ${text} dari Deviant...`},
    { quoted: m }
  );

  try {
    const { data } = await axios.get(
      "https://api.nekolabs.my.id/discovery/devianart/search",
      { params: { q: text.trim() }, timeout: 15_000 }
    );
    if (!data.success || !data.result?.length)
      throw new Error("Tidak ditemukan hasil.");

    const list = data.result.slice(0, MAX);

    const jobs = list.map(async (it) => {
      const buff = await axios
        .get(it.imageUrl, { responseType: "arraybuffer" })
        .then((r) => Buffer.from(r.data));
      return { buffer: buff, title: it.title, url: it.url };
    });
    const ready = await Promise.all(jobs);

    for (const item of ready) {
      await conn.sendMessage(
        m.chat,
        {
          image: item.buffer,
          caption: `*${item.title}*\n${item.url}\n\n© afkhid-esm`,
        },
        { quoted: m }
      );
    }
  } catch (e) {
    await conn.sendMessage(
      m.chat,
      { text: `Gagal memuat karya ${text} dari Deviant` },
      { quoted: m }
    );
  }
};

handler.help = ["deviant <kata kunci>"];
handler.tags = ["internet"];
handler.command = /^deviant$/i;
export default handler;
