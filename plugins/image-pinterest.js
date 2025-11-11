import axios from "axios";
import {
  prepareWAMessageMedia,
  generateWAMessageFromContent,
} from "@whiskeysockets/baileys";

const MAX = 10;

const handler = async (m, { conn, usedPrefix, text }) => {
  if (!text) {
    return conn.sendMessage(
      m.chat,
      { text: `*Contoh:*\n${usedPrefix}pinterest Wallpaper Desktop Denji` },
      { quoted: m }
    );
  }

  await conn.sendMessage(
    m.chat,
    { text: `🔍 Mengumpulkan hasil untuk "${text}" dari Pinterest…` },
    { quoted: m }
  );

  try {
    const { data } = await axios.get(
      "https://api.nekolabs.my.id/discovery/pinterest/search",
      { params: { q: text.trim() }, timeout: 20000 }
    );

    if (!data.success || !data.result?.length) {
      throw new Error("Tidak ditemukan hasil.");
    }

    const cards = [];
    const results = data.result.slice(0, MAX);

    for (const item of results) {
      try {
        const media = await prepareWAMessageMedia(
          { image: { url: item.imageUrl } },
          { upload: conn.waUploadToServer }
        );

        // 2. Bangun card
        cards.push({
          header: {
            hasMediaAttachment: true,
            imageMessage: media.imageMessage,
          },
          body: { text: item.caption || "Pinterest Image" },
          footer: { text: `© afkhid-esm` },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "Buka di Pinterest",
                  url: item.url,
                }),
              },
            ],
          },
        });
      } catch (err) {
        console.error(`Gagal memproses gambar: ${item.imageUrl}`, err);
      }
    }

    if (!cards.length) {
      throw new Error("Tidak ada gambar yang bisa ditampilkan dalam carousel.");
    }

    const msg = generateWAMessageFromContent(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            interactiveMessage: {
              body: {
                text: `Menampilkan ${cards.length} hasil teratas untuk "${text}"`,
              },
              footer: { text: "© afkhid-esm – geser untuk melihat lainnya" },
              carouselMessage: { cards },
            },
          },
        },
      },
      { quoted: m }
    );

    await conn.relayMessage(m.chat, msg.message, {
      messageId: msg.key.id,
    });
  } catch (e) {
    console.error(e);
    await conn.sendMessage(
      m.chat,
      { text: `❌ Gagal memuat hasil untuk “${text}”.\nError: ${e.message}` },
      { quoted: m }
    );
  }
};

handler.help = ["pinterest <kata kunci>"];
handler.tags = ["internet"];
handler.command = /^pinterest$/i;
handler.groupOnly = false;
handler.privateOnly = false;
handler.admin = false;
handler.botAdmin = false;
export default handler;
