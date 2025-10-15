import { PDFDocument } from "pdf-lib";

let handler = async (m, { conn }) => {
    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || "";

    if (!mime || !/image\/(jpe?g|png)/.test(mime)) {
        return conn.sendMessage(
            m.chat,
            { text: "Kirim gambar dengan caption *.topdf*" },
            { quoted: m }
        );
    }

    await conn.sendMessage(
        m.chat,
        { text: "⏳ Sedang membuat PDF, tunggu sebentar..." },
        { quoted: m }
    );

    try {
        let media = await q.download?.();
        if (!media) throw new Error("Gagal download media!");

        let pdfDoc = await PDFDocument.create();
        let image;

        if (/png/.test(mime)) {
            image = await pdfDoc.embedPng(media);
        } else {
            image = await pdfDoc.embedJpg(media);
        }

        let page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
        });

        let pdfBytes = await pdfDoc.save();

        await conn.sendMessage(
            m.chat,
            {
                document: Buffer.from(pdfBytes),
                mimetype: "application/pdf",
                fileName: "hasil.pdf",
                caption: "Converted © By Afkhidbot",
            },
            { quoted: m }
        );
    } catch (err) {
        console.error(err);
        await conn.sendMessage(
            m.chat,
            { text: ` Error: ${err.message}` },
            { quoted: m }
        );
    }
};

handler.help = ["topdf"];
handler.tags = ["tools"];
handler.command = /^topdf$/i;

export default handler;
