import axios from "axios";
import { akhfhidCDN } from "../lib/uploadFile.js";

let handler = async (m, { conn }) => {
  const quoted = m.quoted ? m.quoted : m;
  const mime = (quoted.msg || quoted).mimetype || "";
  if (!mime.startsWith("image/"))
    await conn.sendMessage(m.chat, {
      text: "Kirim/reply gambar dengan caption .lens",
    });

      await conn.sendMessage(m.chat, {
        text: "Sedang menindai gambar...",
      });

  try {
    const media = await quoted.download();
    if (!media) throw "Gagal mengunduh gambar!";

    const { url } = await akhfhidCDN(media);
    if (!url) throw "Gagal upload ke CDN!";

    const { data } = await axios.get(
      "https://api.nekolabs.my.id/discovery/lens",
      {
        params: { url },
        timeout: 25_000,
      }
    );

    if (!data.success || !data.result?.length)
      throw "Tidak ditemukan hasil Google Lens.";

    const out =
      data.result
        .map(
          (r, i) =>
            `🔎 *Hasil ${i + 1}*\n` +
            `📖 *Judul:* ${r.title}\n` +
            `🔗 *Halaman:* ${r.link}\n` +
            `🖼️ *Thumb:* ${r.thumbnail}\n` +
            `📍 *Sumber:* ${r.source}\n`
        )
        .join("\n") + "\n© afkhid-esm";

    await conn.sendMessage(m.chat, out.trim(), m);
  } catch (e) {
    console.error(e);
    m.reply(e.message || "Terjadi kesalahan saat memproses gambar.");
  }
};
handler.help = ["lens"];
handler.tags = ["tools"];
handler.command = /^(lens|googlelens)$/i;
// handler.register = true;
// handler.limit = 2;

export default handler;
