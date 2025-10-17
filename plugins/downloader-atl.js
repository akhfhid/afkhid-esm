import axios from 'axios';
import cheerio from 'cheerio';

class ATL {
  parse_img(url) {
    try {
      const u = new URL(url);
      return new URLSearchParams(u.search).get('url') || url;
    } catch {
      return url;
    }
  }

  async hpage() {
    const { data } = await axios.get('https://asiantolick.com/', { timeout: 15000 });
    const $ = cheerio.load(data);
    const res = [];
    $('div#container a.miniatura').each((_, el) => {
      const title = $(el).find('span.titulo_video').text().trim();
      const total_images = $(el).find('div.contar_imagens').text().trim();
      const cover = $(el).find('img').attr('data-src');
      const url = $(el).attr('href');
      if (title && cover && url) {
        res.push({ title, total_images, cover: this.parse_img(cover), url });
      }
    });
    return res;
  }

  async search(query) {
    if (!query) throw new Error('Query diperlukan');
    const { data } = await axios.get(`https://asiantolick.com/search/${encodeURIComponent(query)}`, { timeout: 15000 });
    const $ = cheerio.load(data);
    const res = [];
    $('div#container a.miniatura').each((_, el) => {
      const title = $(el).find('span.titulo_video').text().trim();
      const total_images = $(el).find('div.contar_imagens').text().trim();
      const cover = $(el).find('img').attr('data-src');
      const url = $(el).attr('href');
      if (title && cover && url) {
        res.push({ title, total_images, cover: this.parse_img(cover), url });
      }
    });
    return res;
  }

  async detail(url) {
    if (!url.includes('asiantolick.com')) throw new Error('URL tidak valid');
    const { data } = await axios.get(url, { timeout: 15000 });
    const $ = cheerio.load(data);
    const post = $('#post_content article');

    const title = post.find('h1').text().trim() || null;
    const thumbs_up = post.find('#postlike_content #postlike_count').text().trim() || null;
    const upload_date = post.find('#metadata_qrcode span').eq(1).text().split(':')[1]?.trim() || null;
    const total_pics = post.find('#metadata_qrcode span').eq(2).text().split(':')[1]?.trim() || null;
    const pic_size = post.find('#metadata_qrcode span').eq(3).text().split(':')[1]?.trim() || null;
    const album_size = post.find('#metadata_qrcode span').eq(4).text().split(':')[1]?.trim() || null;
    const category = post.find('#categoria_tags_post a[href*="category"]').text().trim() || null;
    const download_url = post.find('a#download_post').attr('href') || null;

    const tags = [];
    post.find('#categoria_tags_post a[href*="tag"]').each((_, el) => tags.push($(el).text().trim()));

    const pics = [];
    post.find('.spotlight-group div img').each((_, el) => {
      const src = $(el).attr('src');
      if (src) pics.push(this.parse_img(src));
    });

    return { title, thumbs_up, upload_date, total_pics, pic_size, album_size, category, tags, pics, download_url };
  }
}

let handler = async (m, { conn, usedPrefix, text }) => {
  if (!text) {
    await conn.sendMessage(m.chat, { text: `*Contoh:*\n• ${usedPrefix}atl school girl\n• ${usedPrefix}atl https://asiantolick.com/post-1685/school-girl-in-short-skirt-71p` }, { quoted: m });
    return;
  }

  const atl = new ATL();

  if (text.startsWith('https://')) {
    try {
      const r = await atl.detail(text.trim());
      const head =
        `*${r.title}*\n\n` +
        `👍 ${r.thumbs_up || '?'} | 📅 ${r.upload_date || '-'}\n` +
        `📸 ${r.total_pics || '?'} pics | 📐 ${r.pic_size || '?'} | 💾 ${r.album_size || '-'}\n` +
        `🏷️ ${r.category || '-'} \n` +
        `🔖 ${r.tags.join(', ') || '-'}\n`;

      const chunk = 3500;
      for (let i = 0; i < head.length; i += chunk) {
        await conn.sendMessage(m.chat, { text: head.slice(i, i + chunk) }, { quoted: m });
      }

      if (r.pics[0]) {
        await conn.sendMessage(m.chat, { image: { url: r.pics[0] }, caption: '' }, { quoted: m });
      }
    } catch (e) {
      await conn.sendMessage(m.chat, { text: '❌ ' + e.message }, { quoted: m });
    }
    return;
  }

  try {
    const list = await atl.search(text.trim());
    if (!list.length) {
      await conn.sendMessage(m.chat, { text: '🔎 Tidak ditemukan.' }, { quoted: m });
      return;
    }
    const top10 = list.slice(0, 10);
    for (const [idx, x] of top10.entries()) {
      const cap =
        `*${idx + 1}. ${x.title}*\n` +
        `📷 ${x.total_images}\n` +
        `🔗 ${x.url}`;
      await conn.sendMessage(
        m.chat,
        { document: { url: x.cover }, mimetype: 'image/jpeg', fileName: `${x.title}.jpg`, caption: cap },
        { quoted: m }
      );
    }
  } catch (e) {
    await conn.sendMessage(m.chat, { text: '❌ ' + e.message }, { quoted: m });
  }
};

handler.help = ['atl <pencarian>', 'atl <url-asiantolick>'];
handler.tags = ['internet'];
handler.command = /^atl$/i;

export default handler;