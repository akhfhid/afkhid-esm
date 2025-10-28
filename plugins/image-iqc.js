import axios from "axios";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        return conn.sendMessage(
            m.chat,
            {
                text:
                    `❌ Format salah!\n\n` +
                    `Gunakan format:\n` +
                    `*${usedPrefix + command} teks*\n\n` +
                    `📌 *Contoh:*\n` +
                    `${usedPrefix + command} Hello World ✨✨✨`,
            },
            { quoted: m }
        );
    }

    await conn.sendMessage(
        m.chat,
        { text: "⏳ Membuat gambar IQC..." },
        { quoted: m }
    );
    try {
        let url = `https://api.ryzumi.vip/api/image/iqc?text=${encodeURIComponent(
            text
        )}`;

        let response = await axios.get(url, { responseType: "arraybuffer" });

        await conn.sendMessage(
            m.chat,
            {
                image: response.data,
                caption: ` IQC Result untuk: *${text}\nBy Afkhidbot*`,
            },
            { quoted: m }
        );
    } catch (err) {
        console.error(err);
        await conn.sendMessage(
            m.chat,
            { text: " Gagal membuat gambar IQC." },
            { quoted: m }
        );
    }
};

handler.help = ["ipquote <teks>"];
handler.tags = ["tools"];
handler.command = /^(ipquote)$/i;
// handler.register = true;
// handler.limit = 1;

export default handler;
