/* handles.js  (ES-module) */
import axios from "axios";
import cheerio from "cheerio";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import tz from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(tz);

async function infoTourney() {
  try {
    const base = "https://infotourney.com";
    const { data } = await axios.get(`${base}/tournament/mobile-legends`, {
      timeout: 15000,
    });
    const $ = cheerio.load(data);
    const tournaments = [];

    $(".items-row .item").each((_, el) => {
      const item = $(el);
      const title = item.find('h2[itemprop="name"] a').text().trim();
      const link = item.find('h2[itemprop="name"] a').attr("href");
      const image = item.find("p img").attr("src");
      let datePublished = item.find('time[itemprop="datePublished"]').attr("datetime");

      if (datePublished) {
        datePublished = dayjs(datePublished)
          .tz("Asia/Jakarta")
          .format("DD/MM/YYYY HH:mm");
      }

      const [rawDesc = "", rawInfo = ""] = (
        item.find('p[style*="text-align:center"]').html() || ""
      )
        .split("<br>")
        .map((s) => s.replace(/&nbsp;/g, " ").trim());

      const tags = [];
      item.find(".tags a").each((_, tag) => tags.push($(tag).text().trim()));

      tournaments.push({
        title,
        imageUrl: new URL(image, base).href,
        datePublished,
        description: rawDesc,
        info: rawInfo,
        tags,
        url: new URL(link, base).href,
      });
    });

    return tournaments;
  } catch (e) {
    throw new Error("Gagal mengambil data: " + e.message);
  }
}

/* ---------- handler WhatsApp ---------- */
let handler = async (m, { conn }) => {
  try {
    const list = await infoTourney();
    if (!list.length) {
      await conn.sendMessage(
        m.chat,
        { text: "🔎 Tidak ada turnamen ML aktif saat ini." },
        { quoted: m }
      );
      return;
    }

    const teks = list
      .map(
        (t, i) =>
          `*${i + 1}. ${t.title}*\n` +
          //   `*Tanggal Berita :* ${t.datePublished}\n` +
          //   //   `📝 ${t.description}\n` +
          //   //   `ℹ️  ${t.info}\n` +
          //   `*Tags :* ${t.tags.join(", ")}\n` +
          `*Link :* ${t.url}`
      )
      .join("\n\n");

    await conn.sendMessage(m.chat, { text: teks }, { quoted: m });
  } catch (e) {
    await conn.sendMessage(m.chat, { text: "❌ " + e.message }, { quoted: m });
  }
};

handler.help = ["tourney"];
handler.tags = ["internet"];
handler.command = /^tourney|turnamenml|mltour$/i;

export default handler;
