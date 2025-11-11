import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { sendInteractiveMessage } from "buttons-warpper";

const fmtTime = (ms) => (ms / 1000).toFixed(2) + " sec";
const fmtSize = (bytes) => (bytes / 1024).toFixed(2) + " KB";
const pad = (n) => n.toString().padStart(2, "0");

let handler = async (m, { conn, args }) => {
  const start = Date.now();
  const input = args.join(" ");
  if (!input) throw "Contoh: .webmaker buatkan landing page portofolio|affan";

  const [promptPart, customSub] = input.split("|").map((s) => s.trim());
  const topic = promptPart || "website portofolio sederhana";
  const subdomainName =
    customSub ||
    m.pushName?.toLowerCase()?.replace(/[^a-z0-9]+/g, "-") ||
    "guest";

  const webuserDir = "/home/proxy_ubuntu/Public/afkhid-esm/webuser";
  fs.mkdirSync(webuserDir, { recursive: true });

  let targetDir = path.join(webuserDir, subdomainName);
  let version = 1;
  while (fs.existsSync(targetDir)) {
    version++;
    targetDir = path.join(webuserDir, `${subdomainName}-v${version}`);
  }
  fs.mkdirSync(targetDir, { recursive: true });

  await conn.sendMessage(m.chat, {
    text: `🤖 Membuat website AI bertema *${topic}*\n📁 Subdomain: *${subdomainName}*\nMohon tunggu sebentar...`,
  });

  const systemPrompt = `Kamu adalah Liz, Senior Full-Stack Web Developer & UI/UX Designer 15 tahun pengalaman.  
Spesialisasi: landing page premium konversi-tinggi, ultra-cepat, 100 % responsif.

TUGAS:
Buat 1 file HTML5 komplit (hanya <html>...</html>) untuk landing page bertema "${topic}".
Semua asset (gambar, ikon, font) di-load dari CDN gratis (Unsplash, Font-Awesome 6, Google Fonts).
Tanpa framework eksternal (React, Vue, Bootstrap, Tailwind, dsb).
Semua styling & interaksi pakai <style> dan <script> internal.

STRUKTUR WAJIB (urut):
1. Header sticky + logo + nav + mobile hamburger
2. Hero section: headline, sub-headline, 2 CTA button (primary & secondary), background image Unsplash
3. Features / Benefits (3-6 cards dengan ikon Font-Awesome)
4. Gallery / Showcase (masonry 6 gambar Unsplash random sesuai topik)
5. Testimonials (carousel auto-slide 3 item, foto profile Unsplash)
6. Pricing / Packages (3 cards, highlight best-seller, toggle bulan/tahun opsional)
7. FAQ accordion (minimal 5 item, expand-collapse smooth)
8. CTA banner besar sebelum footer
9. Footer lengkap: logo, tagline, nav cepat, sosmed ikon, copyright, back-to-top button

DESAIN:
- Palet warna: gradasi lembut (primary, secondary, accent, netral)
- Typography: Poppins + Inter via Google Fonts
- Animasi: on-scroll fade-in (IntersectionObserver), hover lift, smooth scroll, parallax hero
- Dark-mode toggle (opsional tapi bonus poin)
- 100 % responsif: mobile-first, breakpoint 320 px s.d. 1440 px
- Aksesibilitas: semantic tag, aria-label, alt text, focus ring

PERFORMA:
- Lazy-load gambar (loading="lazy")
- Inline critical CSS, defer non-critical
- Tidak ada alert() / console.log() – user-friendly toast (innerHTML)

OUTPUT:
Kirim **hanya** kode HTML lengkap tanpa markdown, tanpa penjelasan, tanpa \`\`\`html.
Pastikan langsung bisa di-save sebagai index.html dan dibuka di browser tanpa error.
Gunakan Bahasa Indonesia untuk semua teks.
Gambar Unsplash sesuai topik: https://source.unsplash.com/1600x900/?${encodeURIComponent(
    topic
  )}`;

  const apiUrl =
    "https://api.nekolabs.web.id/ai/qwen/3-coder?text=" +
    encodeURIComponent(systemPrompt) +
    "&webSearch=false";

  const res = await fetch(apiUrl, { method: "GET" });
  if (!res.ok) throw new Error(`Gagal request API (${res.status})`);

  const data = await res.json();
  const html =
    data.result?.response?.content || data.result || data.output || "";
  if (!html || html.length < 100)
    throw new Error("Respon AI kosong atau tidak valid.");

  const htmlPath = path.join(targetDir, "index.html");
  fs.writeFileSync(htmlPath, html);
  const fileSize = fs.statSync(htmlPath).size;
  const subdomain = path.basename(targetDir);
  const url = `https://${subdomain}.akhfhid.my.id`;

  const elapsed = Date.now() - start;
  const now = new Date();
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(
    now.getSeconds()
  )}`;
  const dateStr = `${now.getDate()} ${
    [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ][now.getMonth()]
  } ${now.getFullYear()}`;

  const caption =
    `📂 Project : ${subdomain}\n` +
    `🌍 Domain  : ${url}\n` +
    `📦 Size    : ${fmtSize(fileSize)}\n` +
    `⚡ Speed   : ${fmtTime(elapsed)}\n` +
    `🛠 Runtime : AI Generated + Auto Deployed\n` +
    `────────────────────────\n` +
    `🚀 Status  : Online & Live\n` +
    `👨‍💻 Creator : ${m.pushName || "Guest"}\n` +
    `⏳ Created : ${timeStr} - ${dateStr}\n\n` +
    `*Powered by © afkhid-esm*`;

  await sendInteractiveMessage(conn, m.chat, {
    text: caption,
    footer: "© afkhid-esm",
    interactiveButtons: [
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "🌐 Kunjungi Website",
          url,
        }),
      },
    ],
    quoted: m,
  });
};

handler.command = ["webmaker", "aiweb"];
export default handler;
