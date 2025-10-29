// file: handler-web2zip-local.js
import scrape from 'website-scraper';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmpBase = path.join(__dirname, '..', 'tmp_web2zip');   // folder kerja

let handler = async (m, { conn }) => {
  const args = m.text.trim().split(/\s+/);
  const target = args[0] || '';
  if (!/^https?:\/\//.test(target)) {
    return await conn.sendButtons(m.chat, {
      text: 'Berikan URL yang valid.\nContoh: *.web2zip https://example.com*',
      footer: '© afkhid-esm',
      buttons: [{ name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'Coba lagi', id: '.web2zip' }) }]
    }, { quoted: m });
  }

  await conn.sendMessage(m.chat, { text: '🕒 Sedang mirroring… (bisa 10-60 detik)' }, { quoted: m });

  const jobId = 'web_' + Date.now();
  const outDir = path.join(tmpBase, jobId);
  const zipPath = path.join(tmpBase, jobId + '.zip');

  try {
    // 1. scrape
    await scrape({
      urls: [target],
      directory: outDir,
      subdirectories: [{ directory: 'img', extensions: ['.jpg', '.png', '.svg', '.webp', '.gif'] },
      { directory: 'css', extensions: ['.css'] },
      { directory: 'js', extensions: ['.js'] }],
      sources: [{ selector: 'img', attr: 'src' },
      { selector: 'link', attr: 'href' },
      { selector: 'script', attr: 'src' },
      { selector: 'source', attr: 'srcset' }],
      urlFilter: (url) => url.startsWith(target), // stay on origin
      request: { timeout: 30000 }
    });

    // 2. zip
    const zip = new AdmZip();
    zip.addLocalFolder(outDir);
    zip.writeZip(zipPath);

    // 3. kirim
    await conn.sendMessage(m.chat, {
      document: { url: zipPath },
      fileName: `${new URL(target).hostname}.zip`,
      mimetype: 'application/zip',
      caption: `✅ Mirror selesai!\n📦 Ukuran: ${(fs.statSync(zipPath).size / 1024 / 1024).toFixed(2)} MB`
    }, { quoted: m });

  } catch (e) {
    console.error(e);
    await conn.sendButtons(m.chat, {
      text: '❌ ' + e.message,
      footer: '© afkhid-esm',
      buttons: [{ name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'Coba lagi', id: '.web2zip' }) }]
    }, { quoted: m });
  } finally {
    // bersihkan
    fs.rmSync(outDir, { recursive: true, force: true });
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  }
};

handler.help = ['web2zip'];
handler.tags = ['tools'];
handler.command = ['web2zip', 'w2z'];
