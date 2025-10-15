import fs from "fs";
import os from "os";
import path from "path";
import { exec } from "child_process";
import { PDFDocument } from "pdf-lib";

let handler = async (m, { conn }) => {
    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || "";

    if (!/application\/pdf/.test(mime)) {
        return conn.sendMessage(
            m.chat,
            { text: "📄 Kirim file PDF dengan caption *.pdf2img*" },
            { quoted: m }
        );
    }

    await conn.sendMessage(
        m.chat,
        { text: "⏳ Mengonversi PDF ke gambar, tunggu sebentar..." },
        { quoted: m }
    );

    try {
        const fileData = await q.download?.();
        if (!fileData) throw new Error("Gagal mengunduh file PDF!");

        const pdfBuffer = Buffer.isBuffer(fileData)
            ? fileData
            : Buffer.from(fileData, "base64");

        // buat folder sementara
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf2img-"));
        const inputPath = path.join(tmpDir, "input.pdf");
        fs.writeFileSync(inputPath, pdfBuffer);

        // hitung jumlah halaman
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const totalPages = pdfDoc.getPageCount();

        for (let i = 1; i <= totalPages; i++) {
            const outputPrefix = path.join(tmpDir, `page-${i}`);
            const cmd = `pdftoppm -f ${i} -l ${i} -png "${inputPath}" "${outputPrefix}"`;

            await new Promise((resolve, reject) => {
                exec(cmd, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // cari file PNG hasil konversi (contoh: page-1-01.png)
            const files = fs
                .readdirSync(tmpDir)
                .filter((f) => f.startsWith(`page-${i}`) && f.endsWith(".png"));

            if (files.length === 0) throw new Error(`Gagal konversi halaman ${i}`);

            const imgPath = path.join(tmpDir, files[0]);
            const imageBuffer = fs.readFileSync(imgPath);

            await conn.sendMessage(
                m.chat,
                {
                    image: imageBuffer,
                    caption: `📄 Halaman ${i} dari ${totalPages}\nConverted © By Afkhidbot`,
                },
                { quoted: m }
            );
        }

        fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (err) {
        console.error(err);
        await conn.sendMessage(
            m.chat,
            { text: `❌ Terjadi kesalahan: ${err.message}` },
            { quoted: m }
        );
    }
};

handler.help = ["pdf2img"];
handler.tags = ["tools"];
handler.command = /^pdf2img$/i;

export default handler;
