// file: handler-upload-voice.js
import axios from "axios";
import FormData from "form-data";

let handler = async (m, { conn }) => {
  try {
    let audioMsg;
    let quoted = m.quoted || m;
    const msg = quoted.message || {};

    console.log("Quoted Message:", quoted); // Log pesan yang direply
    console.log("Message:", msg); // Log struktur pesan

    // Cek semua kemungkinan PTT / voice / audio WA terbaru
    if (msg.audioMessage && msg.audioMessage.ptt)
      audioMsg = msg.audioMessage; // voice note PTT
    else if (msg.voiceMessage) audioMsg = msg.voiceMessage;
    else if (msg.audioMessage) audioMsg = msg.audioMessage;
    else if (m.message?.audioMessage && m.message.audioMessage.ptt)
      audioMsg = m.message.audioMessage;
    else if (m.message?.voiceMessage) audioMsg = m.message.voiceMessage;

    console.log("Audio Message:", audioMsg); // Log voice note yang terdeteksi

    if (!audioMsg) {
      return await conn.sendMessage(m.chat, {
        text: "Kirim voice note / audio lalu reply dengan perintah: .uploadvoice",
      });
    }

    // Download media WA
    const fileBuffer = await conn.downloadMediaMessage({ message: audioMsg });
    const fileName = audioMsg.fileName || `voice_${Date.now()}.ogg`;

    // Upload ke tmpfiles.org
    const form = new FormData();
    form.append("file", fileBuffer, fileName);

    const response = await axios.post(
      "https://tmpfiles.org/api/v1/upload ",
      form,
      {
        headers: form.getHeaders(),
      }
    );

    if (response.data && response.data.success) {
      const link = response.data.data.url.full;
      const answer = `✅ Voice berhasil diupload!\nLink: ${link}`;

      // Kirim pakai buttons
      await conn.sendButtons(
        m.chat,
        {
          text: answer,
          footer: "© afkhid-esm",
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "Buka Voice",
                url: link,
              }),
            },
            {
              name: "cta_copy",
              buttonParamsJson: JSON.stringify({
                display_text: "Copy Link Voice",
                copy_code: link,
              }),
            },
          ],
        },
        { quoted: m }
      );
    } else {
      throw new Error("Gagal upload ke tmpfiles");
    }
  } catch (e) {
    console.error(e);
    await conn.sendMessage(m.chat, {
      text: "❌ Terjadi kesalahan saat upload voice",
    });
  }
};
handler.command = ["uploadvoice", "uv"];
handler.tags = ["tools"];
handler.help = [
  ".uploadvoice - Upload voice note / audio ke tmpfiles.org dengan button",
];

export default handler;
