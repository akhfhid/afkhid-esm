// plugin: jobstreet.js
import axios from "axios";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import FormData from "form-data";

const TMP_DIR = path.resolve("./tmp");

// pastikan tmp ada
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const searchJob = async (job, city) => {
  const qJob = encodeURIComponent(job);
  const qCity = encodeURIComponent(city);
  const url = `https://api.nekolabs.my.id/discovery/jobstreet/search?job=${qJob}&city=${qCity}`;
  const { data } = await axios.get(url, { timeout: 15000 });
  return data.result ?? [];
};

// fallback upload to telegra.ph (jika perlu)
async function uploadToTelegraph(buffer) {
  try {
    const form = new FormData();
    form.append("file", buffer, "file.jpg");
    const upload = await axios.post("https://telegra.ph/upload", form, {
      headers: form.getHeaders(),
      timeout: 20000,
    });
    if (Array.isArray(upload.data) && upload.data[0] && upload.data[0].src) {
      return "https://telegra.ph" + upload.data[0].src;
    }
    return null;
  } catch (err) {
    console.error("telegraph upload error", err?.message || err);
    return null;
  }
}

// unduh image jadi buffer
async function fetchImageBuffer(url) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 20000,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      Referer: "https://id.jobstreet.com",
    },
  });
  return Buffer.from(res.data);
}

// simpan buffer ke tmp file, kembalikan path
async function saveBufferToTmp(buffer, ext = ".jpg") {
  const name = crypto.randomBytes(10).toString("hex") + ext;
  const filePath = path.join(TMP_DIR, name);
  await fs.promises.writeFile(filePath, buffer);
  return filePath;
}

// hapus file jika ada
async function safeUnlink(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) await fs.promises.unlink(filePath);
  } catch (e) {
    // ignore
  }
}

let handler = async (m, { conn, usedPrefix, text }) => {
  if (!text || !text.includes("|")) {
    await conn.sendMessage(
      m.chat,
      { text: `*Contoh:* ${usedPrefix}jobstreet Web Developer | Cianjur` },
      { quoted: m }
    );
    return;
  }

  const [job, city] = text.split("|").map((s) => s.trim());
  await conn.sendMessage(
    m.chat,
    { text: "🔎 Mencari lowongan..." },
    { quoted: m }
  );

  try {
    const list = await searchJob(job, city);
    if (!list.length) {
      await conn.sendMessage(
        m.chat,
        { text: "❌ Tidak ada lowongan yang cocok." },
        { quoted: m }
      );
      return;
    }

    const top5 = list.slice(0, 5);
    let summary = `🔍 *Hasil pencarian untuk:* ${job} — ${city}\nMenampilkan 5 teratas dari ${list.length} hasil\n\n`;
    top5.forEach((h, i) => {
      const perus =
        h.companyName ||
        h.advertiser?.description ||
        "Perusahaan tidak diketahui";
      const lokasi =
        h.locations?.map((l) => l.label).join(", ") || "Lokasi tidak diketahui";
      summary += `*${i + 1}.* ${h.roleId || "-"}\n  ${perus}\n  ${lokasi}\n\n`;
    });
    // await conn.sendMessage(m.chat, { text: summary }, { quoted: m });

    for (const h of top5) {
      const logoUrl =
        h.brand?.serpLogoUrl || "https://i.ibb.co/3sR7qYG/no-logo.png";
      const gaji = h.salaryLabel || "Gaji tidak ditampilkan";
      const lokasi =
        h.locations?.map((l) => l.label).join(", ") || "Lokasi tidak diketahui";
      const perus =
        h.companyName ||
        h.advertiser?.description ||
        "Perusahaan tidak diketahui";
      const tgl = h.listingDateDisplay || "-";
      const url = `https://id.jobstreet.com/id/job/${h.id}`;

      const caption =
        `*${h.roleId || "Lowongan"}*\n\n` +
        `Perusahaan: ${perus}\n` +
        `Lokasi: ${lokasi}\n` +
        `Gaji: ${gaji}\n` +
        `Tanggal: ${tgl}\n\n` +
        `🔗 Detail: ${url}`;

      let filePath = null;
      try {
        const buffer = await fetchImageBuffer(logoUrl);
        filePath = await saveBufferToTmp(
          buffer,
          path.extname(logoUrl).split("?")[0] || ".jpg"
        );

        await conn.sendMessage(
          m.chat,
          { image: fs.createReadStream(filePath), caption },
          { quoted: m }
        );
      } catch (err) {
        console.warn("Gagal kirim logo sebagai file:", err?.message || err);
        try {
          const buffer = await fetchImageBuffer(logoUrl);
          const tele = await uploadToTelegraph(buffer);
          if (tele) {
            await conn.sendMessage(
              m.chat,
              { image: { url: tele }, caption },
              { quoted: m }
            );
          } else {
            await conn.sendMessage(m.chat, { text: caption }, { quoted: m });
          }
        } catch (e2) {
          console.error("Fallback gagal:", e2?.message || e2);
          await conn.sendMessage(m.chat, { text: caption }, { quoted: m });
        }
      } finally {
        await safeUnlink(filePath);
      }
      await new Promise((res) => setTimeout(res, 600));
    }
  } catch (e) {
    console.error(e);
    await conn.sendMessage(
      m.chat,
      { text: "❌ " + (e.message || "Terjadi kesalahan") },
      { quoted: m }
    );
  }
};

handler.help = ["jobstreet <job> | <city>"];
handler.tags = ["tools"];
handler.command = /^jobstreet$/i;

export default handler;
