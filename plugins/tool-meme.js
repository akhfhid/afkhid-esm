import axios from "axios";
import FormData from "form-data";
import { command } from "yargs";

let handler = async (m, { conn, text }) => {
    try {
        if (!text || !text.includes("|")) {
            return conn.sendMessage(m.chat, { text: "⚠️ Format salah!\n\nGunakan:\n.meme Text Atas | Text Bawah\n\nContoh:\n.meme Aduh | Ganteng amat" }, { quoted: m });
        }

        // Ambil teks atas dan bawah
        const [textT, textB] = text.split("|").map(v => v.trim());

        // Ambil gambar dari pesan yang sama
        let mime = m.mimetype || m.msg?.mimetype || "";
        if (!/image/.test(mime)) {
            return conn.sendMessage(m.chat, { text: "⚠️ Kirim gambar lalu tulis caption: .meme Text Atas | Text Bawah" }, { quoted: m });
        }

        // Download gambar
        let img = await m.download();

        // Upload gambar ke tmpfiles
        const form = new FormData();
        form.append("file", img, "meme.jpg");

        let upload = await axios.post("https://tmpfiles.org/api/v1/upload", form, {
            headers: form.getHeaders(),
        });

        if (!upload.data?.success) throw new Error("Upload gagal ke tmpfiles!");

        let imageUrl = upload.data.data.url.full;

        // Generate meme
        const apiUrl = `https://api.nekolabs.web.id/canvas/meme?imageUrl=${encodeURIComponent(imageUrl)}&textT=${encodeURIComponent(textT)}&textB=${encodeURIComponent(textB)}`;

        let result = await axios.get(apiUrl, { responseType: "arraybuffer" });

        // Kirim hasil meme ke chat
        await conn.sendMessage(m.chat, { image: result.data, caption: "✅ Meme berhasil dibuat!" });

    } catch (err) {
        console.log(err);
        return conn.sendMessage(m.chat, { text: "❌ Gagal membuat meme!" });
    }
};

handler.command = ["meme"];
handler.tags = ["tools"];
handler.help = [prefix + command + " Text Atas | Text Bawah (kirim bareng gambar)"];

export default handler;
