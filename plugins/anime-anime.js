import axios from "axios";
import {
  prepareWAMessageMedia,
  generateWAMessageFromContent,
} from "@whiskeysockets/baileys";

const BASE = "https://www.sankavollerei.com/anime";
const MAX_SEARCH = 10;
const MAX_EPS = 50;

const clean = (str = "") => str.replace(/\*/g, "").trim();

const handler = async (m, { conn, usedPrefix, text }) => {
  if (!text) {
    return conn.sendMessage(m.chat, {
      text: `*Contoh:*\n${usedPrefix}anime boruto`
    });
  }

  try {
    const { data: sRes } = await axios.get(
      `${BASE}/search/${encodeURIComponent(text)}`,
      { timeout: 15000 }
    );

    if (sRes.status !== "success" || !sRes.data?.length) {
      throw new Error("Anime tidak ditemukan.");
    }

    const cards = [];
    for (let i = 0; i < Math.min(sRes.data.length, MAX_SEARCH); i++) {
      const k = sRes.data[i];

      const img = await prepareWAMessageMedia(
        { image: { url: k.poster } },
        { upload: conn.waUploadToServer }
      );

      cards.push({
        header: {
          hasMediaAttachment: true,
          imageMessage: img.imageMessage,
        },
        body: { text: `*${clean(k.title)}*\nRating: ${k.rating} ⭐` },
        footer: { text: `${k.status} — Tap tombol` },
        nativeFlowMessage: {
          buttons: [
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: "📺 Episode List",
                id: `anime_eps|${k.slug}`,
              }),
            },
          ],
        },
      });
    }

    const content = {
      interactiveMessage: {
        body: { text: `Hasil pencarian *"${text}"*` },
        footer: { text: "© afkhid-esm" },
        carouselMessage: { cards },
      },
    };

    const searchMsg = generateWAMessageFromContent(m.chat, content, {});
    await conn.relayMessage(m.chat, searchMsg.message, {
      messageId: searchMsg.key?.id || null,
    });
  } catch (e) {
    console.error(e);
    return conn.sendMessage(m.chat, {
      text: `❌ ${e.message || String(e)}`
    });
  }
};

// ============================
// BUTTON: LIST EPISODE
// ============================
handler.onButton = async (m, { conn, id }) => {
  try {
    if (!id?.startsWith?.("anime_eps|")) return;

    const slug = id.split("|")[1];

    // Ambil detail anime + semua episode dari otakudesu
    const { data: dRes } = await axios.get(`${BASE}/detail/${slug}`);

    if (dRes.status !== "success") throw new Error("Detail anime tidak ditemukan.");

    const eps = dRes.data.episodes.slice(0, MAX_EPS);

    const rows = eps.map((ep, i) => ({
      header: "",
      title: `Episode ${i + 1}`,
      description: ep.date,
      id: `anime_watch|${ep.slug}`,
    }));

    const chatId = m?.chat || m;

    await conn.sendMessage(chatId, {
      interactiveMessage: {
        body: { text: `Berikut episode dari *${clean(dRes.data.title)}*` },
        footer: { text: "© afkhid-esm" },
        nativeFlowMessage: {
          buttons: [
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "📺 Pilih Episode",
                sections: [{ title: "Episode List", rows }],
              }),
            },
          ],
        },
      },
    });
  } catch (e) {
    console.error("eps error:", e);
    return conn.sendMessage(m.chat, {
      text: `❌ ${e.message || String(e)}`
    });
  }
};

// ============================
// BUTTON: WATCH EPISODE
// ============================
handler.onButton2 = async (m, { conn, id }) => {
  try {
    if (!id?.startsWith?.("anime_watch|")) return;

    const slug = id.split("|")[1];

    const { data: res } = await axios.get(`${BASE}/episode/${slug}`);

    if (res.status !== "success") throw new Error("Data episode tidak ditemukan.");

    const ep = res.data;

    const msg = `
🎬 *${ep.episode}*
Status: ${ep.anime?.slug}

📡 *Streaming URL*
${ep.stream_url}

🗂️ *Quality Available:*
- 360p, 480p, 720p, 1080p (lihat daftar server)
`;

    const chatId = m?.chat || m;

    await conn.sendMessage(chatId, { text: msg });

  } catch (e) {
    console.error("watch error:", e);
    const chatId = m?.chat || m;
    return conn.sendMessage(chatId, {
      text: `❌ ${e.message || String(e)}`
    });
  }
};

handler.help = ["anime <judul>"];
handler.tags = ["weebs"];
handler.command = /^anime$/i;

export default handler;
