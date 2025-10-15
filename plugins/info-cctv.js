import fs from "fs";
import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const cctvPath = path.join(__dirname, "..", "cctv.json");
const cctvData = JSON.parse(fs.readFileSync(cctvPath, "utf-8"));

const chunkSize = 24;

function cleanURL(url) {
  return encodeURI(url.trim());
}

let handler = async (m, { conn }) => {
  try {
    for (let i = 0; i < cctvData.length; i += chunkSize) {
      const slice = cctvData.slice(i, i + chunkSize);
      const text =
        `📹 *CCTV Bandung (${i + 1}-${Math.min(
          i + chunkSize,
          cctvData.length
        )})*\n\n` +
        slice
          .map((c, idx) => {
            const maps = `https://www.google.com/maps?q=${c.lat},${c.lng}`;
            const stream = cleanURL(c.stream_cctv);
            return `${i + idx + 1}. *${c.cctv_name}*\n📍 ${maps}\n🔗 ${stream}`;
          })
          .join("\n\n");

      await conn.sendMessage(m.chat, { text }, { quoted: i === 0 ? m : null });
      await new Promise((r) => setTimeout(r, 700));
    }
  } catch (e) {
    m.reply("❌ Error: " + e.message);
  }
};

handler.help = ["cctv"];
handler.tags = ["info"];
handler.command = /^(cctv)$/i;
handler.limit = false;

export default handler;
