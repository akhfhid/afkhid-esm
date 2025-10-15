import axios from "axios";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        return conn.sendMessage(
            m.chat,
            {
                text:
                    `❌ Format salah!\n\n` +
                    `Gunakan format:\n` +
                    `*${usedPrefix + command} username|caption*\n\n` +
                    `📌 *Contoh:*\n` +
                    `${usedPrefix + command} Ryzumi_Starlette|Hello World ✨✨✨`,
            },
            { quoted: m }
        );
    }

    let [username, caption, avatar] = text.split("|");
    if (!username || !caption) {
        return conn.sendMessage(
            m.chat,
            {
                text: `❌ Format salah!\n\nGunakan: *${usedPrefix + command
                    } username|caption*`,
            },
            { quoted: m }
        );
    }
    if (!avatar) {
        avatar =
            "https://i.pinimg.com/originals/8a/e9/e9/8ae9e92fa4e69967aa61bf2bda967b7b.jpg";
    }

    await conn.sendMessage(
        m.chat,
        { text: "⏳ Membuat fake story..." },
        { quoted: m }
    );

    try {
        let url = `https://api.ryzumi.vip/api/image/fake-story?username=${encodeURIComponent(
            username
        )}&caption=${encodeURIComponent(caption)}&avatar=${encodeURIComponent(
            avatar
        )}`;

        let response = await axios.get(url, { responseType: "arraybuffer" });

        await conn.sendMessage(
            m.chat,
            {
                image: response.data,
                caption: `🎭 Fake Story dari *${username}\nBy Afkhidbot*`,
            },
            { quoted: m }
        );
    } catch (err) {
        console.error(err);
        await conn.sendMessage(
            m.chat,
            { text: "❌ Gagal membuat fake story." },
            { quoted: m }
        );
    }
};

handler.help = ["igstory <username|caption>"];
handler.tags = ["tools"];
handler.command = /^(igstory|fstory)$/i;
// handler.limit = 1;
// handler.register = true;

export default handler;
