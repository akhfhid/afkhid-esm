import axios from "axios";

/* ---------- PixelArt class ---------- */
class PixelArt {
    async img2pixel(buffer, ratio = "1:1") {
        if (!Buffer.isBuffer(buffer)) throw new Error("Image buffer required");
        if (!["1:1", "3:2", "2:3"].includes(ratio))
            throw new Error("Ratio: 1:1, 3:2, 2:3");

        const { data: a } = await axios.post(
            "https://pixelartgenerator.app/api/upload/presigned-url",
            {
                filename: `${Date.now()}.jpg`,
                contentType: "image/jpeg",
                type: "pixel-art-source",
            },
            {
                headers: {
                    referer: "https://pixelartgenerator.app/",
                    "content-type": "application/json",
                },
            }
        );

        await axios.put(a.data.uploadUrl, buffer, {
            headers: {
                "content-type": "image/jpeg",
                "content-length": buffer.length,
            },
        });

        const { data: b } = await axios.post(
            "https://pixelartgenerator.app/api/pixel/generate",
            { imageKey: a.data.key, prompt: "", size: ratio, type: "image" },
            {
                headers: {
                    referer: "https://pixelartgenerator.app/",
                    "content-type": "application/json",
                },
            }
        );

        while (true) {
            const { data } = await axios.get(
                `https://pixelartgenerator.app/api/pixel/status?taskId=${b.data.taskId}`,
                { headers: { referer: "https://pixelartgenerator.app/" } }
            );
            if (data.data.status === "SUCCESS") return data.data.images[0];
            await new Promise((r) => setTimeout(r, 1000));
        }
    }

    async txt2pixel(prompt, ratio = "1:1") {
        if (!prompt) throw new Error("Prompt required");
        if (!["1:1", "3:2", "2:3"].includes(ratio))
            throw new Error("Ratio: 1:1, 3:2, 2:3");

        const { data: a } = await axios.post(
            "https://pixelartgenerator.app/api/pixel/generate",
            { prompt, size: ratio, type: "text" },
            {
                headers: {
                    referer: "https://pixelartgenerator.app/",
                    "content-type": "application/json",
                },
            }
        );

        while (true) {
            const { data } = await axios.get(
                `https://pixelartgenerator.app/api/pixel/status?taskId=${a.data.taskId}`,
                { headers: { referer: "https://pixelartgenerator.app/" } }
            );
            if (data.data.status === "SUCCESS") return data.data.images[0];
            await new Promise((r) => setTimeout(r, 1000));
        }
    }
}

let handler = async (m, { conn, text, usedPrefix }) => {
    const q = m.quoted || m;
    const mime = (q.msg || q).mimetype || "";
    const isImage = mime.startsWith("image/");
    const p = new PixelArt();

    if (isImage) {
        // img2pixel
        const ratio = ["1:1", "3:2", "2:3"].includes(text?.trim())
            ? text.trim()
            : "1:1";
        await conn.sendMessage(
            m.chat,
            { text: "Mengubah gambar jadi pixel art…" },
            { quoted: m }
        );
        try {
            const buffer = await q.download();
            const url = await p.img2pixel(buffer, ratio);
            await conn.sendFile(m.chat, url, "pixel.png", " Pixel art by Afkhidbot", m);
        } catch (e) {
            await conn.sendMessage(
                m.chat,
                { text: "❌ " + e.message },
                { quoted: m }
            );
        }
    } else {
        // txt2pixel
        if (!text)
            return await conn.sendMessage(
                m.chat,
                {
                    text: `Contoh:\n${usedPrefix}pixelart kucing ninja\n`
                },
                { quoted: m }
            );
        const last = text.split(/\s/).pop();
        const ratio = ["1:1", "3:2", "2:3"].includes(last) ? last : "1:1";
        const prompt =
            ratio === last
                ? text.replace(/\|\|?\s*\w+:\w+$/, "").trim()
                : text.trim();
        await conn.sendMessage(
            m.chat,
            { text: "Pixel art sedang di proses…" },
            { quoted: m }
        );
        try {
            const url = await p.txt2pixel(prompt, ratio);
            await conn.sendFile(m.chat, url, "pixel.png", " Pixel art by Afkhidbot", m);
        } catch (e) {
            await conn.sendMessage(
                m.chat,
                { text: "❌ " + e.message },
                { quoted: m }
            );
        }
    }
};

handler.help = ["pixelart"];
handler.tags = ["ai"];
handler.command = /^pixelart$/i;
handler.limit = true;

export default handler;
