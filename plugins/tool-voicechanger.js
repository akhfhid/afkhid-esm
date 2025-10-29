import axios from "axios";

let voiceList = [
    "anies-baswedan",
    "furina",
    "kobo-kanaeru",
    "megawati",
    "patrick-star/idn-dub",
    "prabowo-subianto",
    "saiba-momoi",
    "spongebob-squarepants/idn-dub",
    "squidward-tentacles/idn-dub",
    "sunaookami-shiroko",
    "takanashi-hoshino",
    "vestia-zeta"
];

let handler = async (m, { conn, text }) => {
    try {
        if (!text) return await conn.sendMessage(m.chat, {
            text: `Daftar voice:\n${voiceList.join("\n")}`+"Kirim perintah: .voice [voice] [link audio]\nContoh: .voice furina https://tmpfiles.org/abc123" });

        const [voiceName, audioUrl] = text.split(" ");
        if (!voiceName || !audioUrl) return await conn.sendMessage(m.chat, { text: "Format salah! Gunakan: #voice [voice] [link audio]" });

        if (!voiceList.includes(voiceName)) {
            return await conn.sendMessage(m.chat, { text: `Voice tidak tersedia!\nDaftar voice:\n${voiceList.join("\n")}` });
        }

        await conn.sendMessage(m.chat, { text: "Sedang memproses audio, tunggu sebentar..." });

        const res = await axios.get(`https://api.nekolabs.web.id/tools/voice-changer/${voiceName}`, {
            params: { audioUrl },
            responseType: "arraybuffer"
        });

        await conn.sendMessage(m.chat, {
            audio: Buffer.from(res.data, "binary"),
            mimetype: "audio/mpeg",
            fileName: `voice_${voiceName}.mp3`
        });

    } catch (e) {
        console.error(e);
        await conn.sendMessage(m.chat, { text: "❌ Gagal memproses voice changer" });
    }
};

handler.command = ["voice", "vc"];
handler.tags = ["tools"];
handler.help = ["#voice [voice] [link audio] - Mengubah suara audio"];

export default handler;
