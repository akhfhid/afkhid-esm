// file: handler-cekpajak.js
import fetch from "node-fetch";

let handler = async (m, { conn, args }) => {
  // Buat salinan pesan aman
  let quotedMsg;
  try {
    quotedMsg = JSON.parse(JSON.stringify(m));
  } catch (e) {
    quotedMsg = null;
    console.error("Gagal membuat salinan pesan untuk quote:", e);
  }

  try {
    // Kalau tidak ada argumen
    if (!args[0]) {
      return await conn.sendButtons(
        m.chat,
        {
          text: "Masukkan nomor plat kendaraan. Contoh: *.cekpajak B1234ABC*",
          footer: "© afkhid-esm",
          buttons: [{ id: "cekpajak_help", text: "Cara Pakai" }],
        },
        { quoted: quotedMsg }
      );
    }

    // Ambil input, hapus spasi, pakai huruf besar
    let plat = args.join("").toUpperCase().replace(/\s+/g, "");

    // Cek panjang maksimal 9 karakter
    if (plat.length > 9) {
      return await conn.sendButtons(
        m.chat,
        {
          text: `❌ Nomor plat terlalu panjang (${plat.length} karakter). Maksimal 9 karakter.\nContoh format: B1234ABC`,
          footer: "© afkhid-esm",
          buttons: [{ id: "cekpajak_help", text: "Cara Pakai" }],
        },
        { quoted: quotedMsg }
      );
    }

    const url = `${
      global.APIs.ryzumi
    }/api/tool/cek-pajak/bapenda?plat=${encodeURIComponent(plat)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);

    const json = await res.json();
    if (!json.success)
      throw new Error(json.message || "Gagal mendapatkan data");

    const info = json.data["informasi-umum"];
    const pkb = json.data["informasi-pkb-pnbp"];
    const bayar = json.data["pembayaran-pkb-pnbp"];
    const bayarNon = json.data["pembayaran-pkb-pnbp-non-program"];
    const param = json.param;

    const safeStringify = (obj) => {
      try {
        return JSON.stringify(obj, null, 2);
      } catch {
        return "- Tidak bisa ditampilkan";
      }
    };

    let message = `
🚗 Informasi Umum:
• Merk      : ${info.merk}
• Model     : ${info.model}
• No Polisi : ${info["nomor-polisi"]}
• Warna     : ${info.warna}
• Milik Ke  : ${info["milik-ke"]}
• Jenis     : ${info.jenis}
• Tahun     : ${info["tahun-buatan"]}

💰 Pajak & STNK:
• Dari      : ${pkb.dari}
• Ke        : ${pkb.ke}
• Tanggal Pajak: ${pkb["tanggal-pajak"]}
• Tanggal STNK: ${pkb["tanggal-stnk"]}
• Wilayah   : ${pkb.wilayah}

🧾 Pembayaran PKB & PNBP:
${Object.keys(bayar).length ? safeStringify(bayar) : "- Tidak ada data"}

💸 Pembayaran PKB & PNBP Non Program:
${Object.keys(bayarNon).length ? safeStringify(bayarNon) : "- Tidak ada data"}

🗓 Tanggal Proses : ${json["tanggal-proses"]}
⚠️ Keterangan    : ${json.keterangan || "-"}
🔹 Status 5 Tahun : ${json.isFiveYear ? "Ya" : "Tidak"}
🔹 Bisa Dibayar  : ${json.canBePaid ? "Ya" : "Tidak"}

🆔 Param:
• No Polisi : ${param.no_polisi}
• Kode Plat : ${param.kd_plat}
`;

    await conn.sendMessage(m.chat, { text: message }, { quoted: quotedMsg });
  } catch (err) {
    await conn.sendButtons(
      m.chat,
      {
        text: `❌ Terjadi kesalahan: ${err.message}`,
        footer: "© afkhid-esm",
        buttons: [
          { id: "cekpajak_retry", text: "Coba Lagi" },
          { id: "cekpajak_help", text: "Cara Pakai" },
        ],
      },
      { quoted: quotedMsg }
    );
  }
};

handler.button = async (m, { conn }) => {
  let quotedMsg;
  try {
    quotedMsg = JSON.parse(JSON.stringify(m));
  } catch (e) {
    quotedMsg = null;
    console.error("Gagal membuat salinan pesan untuk quote:", e);
  }

  if (m.buttonId === "cekpajak_help") {
    await conn.sendMessage(
      m.chat,
      {
        text: `
📌 Cara Pakai Cek Pajak Kendaraan Jabar:

1. Ketik perintah: *.cekpajak [nomor plat]*
   Contoh: *.cekpajak B1234ABC*

2. Tunggu beberapa detik, bot akan mengirim informasi:
   - Merk & Model
   - Nomor Polisi & Warna
   - Pajak & STNK
   - Keterangan & Status pembayaran

⚠️ Catatan:
- Pastikan format plat benar (maks 9 karakter, tanpa spasi).
      `,
      },
      { quoted: quotedMsg }
    );
  }
};

handler.command = ["cekpajak", "pajak"];
export default handler;
