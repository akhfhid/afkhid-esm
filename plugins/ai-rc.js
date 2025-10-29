import axios from "axios";
import FormData from "form-data";

let handler = async (m, { conn }) => {
    try {
        const quoted = m.quoted || m;
        const msg = quoted.message || {};
        const img =
            msg.imageMessage ||
            (msg.documentMessage?.mimetype?.startsWith("image/") && msg.documentMessage);

        if (!img) {
            return await conn.sendButtons(
                m.chat,
                {
                    text: "Reply gambar yang ingin diproses.",
                    footer: "© afkhid-esm",
                    buttons: [{ name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Coba lagi", id: ".rc" }) }],
                },
                { quoted: m }
            );
        }

        const buffer = await quoted.download();
        if (!buffer?.length) throw new Error("Gagal download media");

        const form = new FormData();
        form.append("file", buffer, "img.jpg");
        const up = await axios.post("https://tmpfiles.org/api/v1/upload", form, { headers: form.getHeaders() });
        if (!up.data?.success) throw new Error("Gagal upload ke tmpfiles");
        const publicUrl = up.data.data.url.full;

        const api = `https://api.nekolabs.web.id/tools/convert/remove-clothes?imageUrl=${encodeURIComponent(publicUrl)}`;
        const { data } = await axios.get(api, {
            headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36" }
        });
        if (!data.success || !data.result) throw new Error(data.message || "API gagal memproses");

        await conn.sendButtons(
            m.chat,
            {
                text: ` Clothes Has Been Removed (${data.responseTime})`,
                footer: "© afkhid-esm",
                buttons: [
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📤 Lihat Hasil",
                            url: data.result,
                        }),
                    },
                    // {
                    //     name: "cta_copy",
                    //     buttonParamsJson: JSON.stringify({
                    //         display_text: "📋 Copy Link",
                    //         copy_code: data.result,
                    //     }),
                    // },
                ],
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        await conn.sendButtons(
            m.chat,
            {
                text: "❌ " + (e.response?.data?.message || e.message),
                footer: "© afkhid-esm",
                buttons: [{ name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Coba lagi", id: ".rc" }) }],
            },
            { quoted: m }
        );
    }
};

handler.help = ["removeclothes"];
handler.tags = ["tools"];
handler.command = ["removeclothes", "rc"];

export default handler;