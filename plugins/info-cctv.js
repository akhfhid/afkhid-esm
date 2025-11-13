import fs from "fs";
import path from "path";
import initFunction from "buttons-warpper";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const cctvPath = path.join(__dirname, "..", "cctv.json");
const cctvData = JSON.parse(fs.readFileSync(cctvPath, "utf-8"));

function cleanURL(url) {
  return encodeURI(url.trim());
}

let handler = async (m, { conn }) => {
  try {
    if (!conn.sendInteractiveMessage) await initFunction(conn);

    const rows = cctvData.map((c, idx) => {
      const maps = `https://www.google.com/maps?q=${c.lat},${c.lng}`;
      const stream = cleanURL(c.stream_cctv);
      return {
        header: `${idx + 1}.`,
        title: c.cctv_name,
        description: `${maps}\n${stream}`,
        id: `cctv_${idx}`,
      };
    });
    await conn.sendInteractiveMessage(
      m.chat,
      {
        title: "*CCTV BANDUNG*",
        text: `Total ${cctvData.length} titik CCTV tersedia.\nSilahkan klik button untuk melihat list cctv`,
        footer: "© afkhid-esm",
        interactiveButtons: [
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "Pilih CCTV",
              sections: [{ title: "Daftar CCTV", rows }],
            }),
          },
        ],
      },
      { quoted: m }
    );
  } catch (e) {
    m.reply("❌ Error: " + e.message);
  }
};

handler.help = ["cctv"];
handler.tags = ["info"];
handler.command = /^(cctv)$/i;
handler.limit = false;

export default handler;
