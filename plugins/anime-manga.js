import axios from "axios";
import {
  prepareWAMessageMedia,
  generateWAMessageFromContent,
} from "@whiskeysockets/baileys";

const BASE = "https://www.sankavollerei.com/comic";
const MAX_SEARCH = 10;
const MAX_CHAP = 30;

const clean = (str = "") => str.replace(/\*/g, "").trim();

const handler = async (m, { conn, usedPrefix, text }) => {
  if (!text) {
    if (!m?.chat) return;
    return conn.sendMessage(m.chat, { text: `*Contoh:*\n${usedPrefix}manga nano machine` });
  }

  try {
    const { data: sRes } = await axios.get(
      `${BASE}/bacakomik/search/${encodeURIComponent(text)}`,
      { timeout: 15000 }
    );
    if (!sRes.success || !sRes.komikList?.length) {
      throw new Error("Judul tidak ditemukan.");
    }

    const cards = [];
    for (let i = 0; i < Math.min(sRes.komikList.length, MAX_SEARCH); i++) {
      const k = sRes.komikList[i];
      const img = await prepareWAMessageMedia(
        { image: { url: k.cover } },
        { upload: conn.waUploadToServer }
      );

      cards.push({
        header: {
          hasMediaAttachment: true,
          imageMessage: img.imageMessage,
        },
        body: { text: `*${clean(k.title)}*\nRating: ${k.rating} ⭐` },
        footer: { text: "Tap tombol di bawah untuk melihat chapter" },
        nativeFlowMessage: {
          buttons: [
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: "📖 Daftar Chapter",
                id: `manga_chapter|${k.slug}`,
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
    console.error("ERROR handler:", e?.stack ?? e);
    await conn.sendMessage(m.chat, { text: `❌ ${e.message || String(e)}` });
  }
};
handler.onButton = async (m, { conn, id }) => {
  try {
    if (!id?.startsWith?.("manga_chapter|")) return;

    const slug = id.split("|")[1];
    if (!slug) throw new Error("Slug tidak valid.");

    const { data: dRes } = await axios.get(`${BASE}/bacakomik/detail/${slug}`, {
      timeout: 15000,
    });
    if (!dRes.success) throw new Error("Detail manga tidak ditemukan.");

    const detail = dRes.detail;
    const chapters = (dRes.chapters || []).slice(0, MAX_CHAP);
    if (!chapters.length) throw new Error("Belum ada chapter.");

    const rows = chapters.map((c, i) => ({
      header: "",
      title: `Ch. ${chapters.length - i}`,
      description: c.date,
      id: `manga_read|${c.slug}`,
    }));

    const chatId = m?.chat || m?.key?.remoteJid || m?.from || m;
    if (!chatId) throw new Error("Chat ID tidak ditemukan.");

    await conn.sendMessage(chatId, {
      interactiveMessage: {
        body: { text: `Berikut chapter dari *${clean(detail.title)}*` },
        footer: { text: "© afkhid-esm" },
        nativeFlowMessage: {
          buttons: [
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "📖 Pilih Chapter",
                sections: [{ title: "Daftar Chapter", rows }],
              }),
            },
          ],
        },
      },
    });
  } catch (e) {
    console.error("onButton error:", e);
    const chatId = m?.chat || m?.key?.remoteJid || m?.from || m;
    if (chatId)
      await conn.sendMessage(chatId, { text: `❌ ${e.message || String(e)}` });
  }
};

handler.help = ["manga <judul>"];
handler.tags = ["weebs"];
handler.command = /^manga$/i;

export default handler;
