import CapcutMagic from "./CapcutMagic.js";
import { fileTypeFromBuffer } from "file-type";

const handler = async (m, { conn, usedPrefix, command }) => {
  const quoted = m.quoted || m;
  const mime = (quoted.msg || quoted).mimetype || "";
  if (!mime.startsWith("video/")) {
    await conn.sendMessage(m.chat, {
      text: `Kirim/balas video dengan caption *${
        usedPrefix + command
      }* untuk upscale 2×.`,
    });
  }

  const media = await quoted.download();
  const type = await fileTypeFromBuffer(media); 
  if (!type || !["mp4", "mov", "avi", "mkv", "webm"].includes(type.ext)) {
    await conn.sendMessage(m.chat, {
      text: "Format video tidak didukung",
    });
    return m.reply("❌ Format video tidak didukung.");
  }

  conn.sendMessage(m.chat, {
    text: "Sedang upscale video 2×… (1-5 menit tergantung ukuran",
  });
  try {
    const upscaledBuf = await new CapcutMagic().processVideo(media);
    await conn.sendMessage(
      m.chat,
      {
        video: upscaledBuf,
        caption: "✅ Selesai! Video telah di-upscale 2×.",
        gifPlayback: false,
      },
      { quoted: m }
    );
  } catch (e) {
    console.error("[CapcutUpscale]", e);
    await conn.sendMessage(m.chat, {
        text: "Gagal upscale video coba lagi beberapa saat " + e.message,
      });
  }
};

handler.help = ["capcuthd"];
handler.tags = ["tools"];
handler.command = /^capcuthd$/i;

export default handler;
