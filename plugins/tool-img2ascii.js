// plugin: img2ascii.js
import axios from 'axios';
import Jimp from 'jimp';

const DEFAULT_WIDTH = 60;   // lebar default dalam karakter
const MAX_WIDTH = 120;      // batas atas lebar agar pesan tidak terlalu besar
const CHARSET = '@%#*+=-:. '; // dari gelap -> terang

/**
 * convertImageToAscii(buffer, width)
 * - buffer: Buffer gambar
 * - width: lebar output dalam karakter (angka)
 * return: string ASCII (multi-line)
 */
async function convertImageToAscii(buffer, width = DEFAULT_WIDTH) {
  const image = await Jimp.read(buffer);

  // hitung tinggi sesuai rasio, koreksi tinggi karena karakter lebih tinggi dari lebar
  const aspectRatio = image.bitmap.height / image.bitmap.width;
  const height = Math.max(1, Math.round(width * aspectRatio * 0.5)); // 0.5 koreksi aspek char

  // resize
  image.resize(width, height);
  image.grayscale();

  const chars = CHARSET;
  const len = chars.length - 1;

  let ascii = '';
  for (let y = 0; y < image.bitmap.height; y++) {
    for (let x = 0; x < image.bitmap.width; x++) {
      const idx = (y * image.bitmap.width + x) << 2;
      const r = image.bitmap.data[idx + 0];
      const charIdx = Math.round((r / 255) * len);
      ascii += chars[charIdx];
    }
    ascii += '\n';
  }

  return ascii;
}

/**
 * fetchImageBufferFromUrl(url)
 */
async function fetchImageBufferFromUrl(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 });
  return Buffer.from(res.data);
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    let url = null;
    let width = DEFAULT_WIDTH;

    if (text && text.includes('|')) {
      const parts = text.split('|').map(s => s.trim());
      url = parts[0] || null;
      if (parts[1]) {
        const w = parseInt(parts[1]);
        if (!isNaN(w)) width = Math.min(MAX_WIDTH, Math.max(8, w));
      }
    } else if (text) {
      const single = text.trim();
      if (/^\d+$/.test(single)) {
        width = Math.min(MAX_WIDTH, Math.max(8, parseInt(single)));
      } else {
        url = single;
      }
    }

    let buffer = null;
    if (!url && m.quoted && typeof conn.downloadMedia === 'function') {
      try {
        const media = await conn.downloadMedia(m.quoted);
        if (media) {
          if (Buffer.isBuffer(media)) buffer = media;
          else if (typeof media === 'string') buffer = Buffer.from(media, 'base64');
          else if (media.data && Buffer.isBuffer(media.data)) buffer = media.data;
        }
      } catch (err) {
        console.warn('downloadMedia failed:', err?.message || err);
      }
    }

    if (url && !buffer) {
      buffer = await fetchImageBufferFromUrl(url);
    }

    if (!buffer) {
      return await conn.sendMessage(m.chat, {
        text:
          '❌ Gambar tidak ditemukan.\n\nCara pakai:\n1) Kirim `.img2ascii <image_url> | <width>`\n2) Atau reply pesan gambar lalu kirim `.img2ascii <width>` (mis. `.img2ascii 80`)\n\nContoh:\n.img2ascii https://i.ibb.co/abc/image.jpg | 80'
      }, { quoted: m });
    }

    const ascii = await convertImageToAscii(buffer, width);

    const MAX_MESSAGE_LENGTH = 6000; 
    if (ascii.length > MAX_MESSAGE_LENGTH) {
      const sample = ascii.slice(0, MAX_MESSAGE_LENGTH);
      const moreMsg = `\n\n⚠️ Hasil terlalu panjang (lebih dari ${MAX_MESSAGE_LENGTH} karakter). Coba gunakan width lebih kecil, mis. ${Math.max(20, Math.floor(width / 2))}`;
      await conn.sendMessage(m.chat, { text: '```' + sample + '```' + moreMsg }, { quoted: m });
    } else {
      await conn.sendMessage(m.chat, { text: '```' + ascii + '```' }, { quoted: m });
    }
  } catch (err) {
    console.error(err);
    await conn.sendMessage(m.chat, {
      text: ' Gagal mengonversi gambar ke ASCII.\nError: ' + (err.message || err) + '\n\nPastikan URL gambar valid atau coba reply gambar, dan kalau perlu install dependency: npm install jimp'
    }, { quoted: m });
  }
};

handler.help = ['img2ascii <url>|<width>', 'img2ascii <width> (reply image)'];
handler.tags = ['tools', 'fun'];
handler.command = /^img2ascii$/i;

export default handler;
