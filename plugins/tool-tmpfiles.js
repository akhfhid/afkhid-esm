// file: handler-upload-voice.js
import axios from "axios";
import FormData from "form-data";

let handler = async (m, { conn }) => {
    try {
        let fileBuffer;
        let fileName;

        // Ambil voice note
        if (m.quoted?.message?.audioMessage || m.quoted?.message?.voiceMessage) {
            fileBuffer = await m.quoted.download();
            fileName = m.quoted.message.audioMessage?.fileName || `voice_${Date.now()}.ogg`;
        } else if (m.message?.audioMessage || m.message?.voiceMessage) {
            fileBuffer = await m.download();
            fileName = m.message.audioMessage?.fileName || `voice_${Date.now()}.ogg`;
        } else {
            return await conn.sendMessage(m.chat, { text: "Kirim voice note atau audio lalu reply dengan perintah: #uploadvoice" });
        }

        // Upload ke tmpfiles.org
        const form = new FormData();
        form.append("file", fileBuffer, fileName);

        const response = await axios.post("https://tmpfiles.org/api/v1/upload", form, {
            headers: form.getHeaders()
        });

        if (response.data && response.data.success) {
            const link = response.data.data.url.full;
            const answer = `Voice berhasil diupload!\nLink: ${link}`;

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
        await conn.sendMessage(m.chat, { text: "❌ Terjadi kesalahan saat upload voice" });
    }
};

handler.command = ["uploadvoice", "uv"];
handler.tags = ["tools"];
handler.help = [".uploadvoice - Upload voice note ke tmpfiles.org dengan button"];

export default handler;
