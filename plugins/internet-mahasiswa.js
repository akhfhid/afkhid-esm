import axios from "axios";

var handler = async (m, { conn, text }) => {
  if (!text || text.trim() === "") {
    return await conn.sendMessage(
      m.chat,
      {
        text: `Masukkan Nama Mahasiswa yang ingin dicari! \n*Contoh:* .mahasiswa Affan `,
      },
      { quoted: m }
    );
  }

// <<<<<<< HEAD
// =======
  // await conn.sendMessage(m.chat, { text: 'Sedang mencari orangnya... Silahkan tunggu.' }, { quoted: m });
// >>>>>>> c2f8cdcfb84bc7282ee5b4843b5a8ba8d57ff506

  await conn.sendMessage(
    m.chat,
    { text: "🔎 Sedang mencari orangnya... Silahkan tunggu." },
    { quoted: m }
  );

  const url = `${APIs.ryzumi}/api/search/mahasiswa?query=${encodeURIComponent(
    text
  )}`;

  try {
    let res = await axios.get(url);
    const data = res.data;

    if (!Array.isArray(data) || data.length === 0) {
      return await conn.sendMessage(
        m.chat,
        { text: `❌ Tidak ditemukan data untuk nama "${text}".` },
        { quoted: m }
      );
    }

    let message = `Hasil pencarian untuk nama "${text}":\n\n`;

    data.forEach((mahasiswa, index) => {
      const nama = mahasiswa.nama || "Tidak Diketahui";
      const nim = mahasiswa.nim || "Tidak Diketahui";
      const namaPt = mahasiswa.nama_pt || "Tidak Diketahui";
      const namaProdi = mahasiswa.nama_prodi || "Tidak Diketahui";

      message += `${
        index + 1
      }. Nama: ${nama}\n   NIM: ${nim}\n   Perguruan Tinggi: ${namaPt}\n   Program Studi: ${namaProdi}\n\n`;
    });

    await conn.sendMessage(m.chat, { text: message }, { quoted: m });
  } catch (error) {
    console.error(error);

    await conn.sendMessage(m.chat, { text: `Terjadi kesalahan: ${error.message || error}` }, { quoted: m });
// >>>>>>> c2f8cdcfb84bc7282ee5b4843b5a8ba8d57ff506
  }
};

handler.help = ["mahasiswa <nama>"];
handler.tags = ["internet"];
handler.command = /^(mahasiswa)$/i;


export default handler;