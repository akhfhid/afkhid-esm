let buttonHandler = async (m, { conn }) => {
  if (m.buttonId === "cekpajak_help") {
    await conn.sendMessage(
      m.chat,
      {
        text: `
📌 Cara Pakai Cek Pajak Kendaraan Jabar:

1. Ketik perintah: *.cekpajak [nomor plat]*
   Contoh: *.cekpajak B 1234 ABC*

2. Tunggu beberapa detik, bot akan mengirim informasi:
   - Merk & Model
   - Nomor Polisi & Warna
   - Pajak & STNK
   - Keterangan & Status pembayaran

⚠️ Catatan:
- Hanya berlaku untuk wilayah Jawa Barat.
- Pastikan format plat benar.
      `,
      },
      { quoted: m }
    );
  }
};

export default buttonHandler;
