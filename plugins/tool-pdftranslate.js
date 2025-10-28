import { PDFDocument, rgb } from "pdf-lib";
import pdfParse from "pdf-parse";
import translate from "translate-google";
import fs from "fs";

let handler = async (m, { conn }) => {
  const q = m.quoted || m;
  const mime = (q.msg || q).mimetype || "";
  if (!/pdf/.test(mime))
    return await conn.sendMessage(m.chat, {
      text: "Kirim file *PDF* dengan caption *.pdftranslate* atau reply ke file PDF.",
    });

  await conn.sendMessage(m.chat, {
    text: "⏳ Sedang menerjemahkan PDF, tunggu...",
  });

  try {
    const media = await q.download(); // Buffer PDF
    const data = await pdfParse(media); // Ekstrak teks murni
    const rawText = data.text; // String full teks

    // Terjemahkan seluruh teks sekaligus (bisa di-chunk kalau panjang)
    const translated = await translate(rawText, { to: "id" });

    // Buat PDF baru
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();

    // Embed font
    const font = await pdfDoc.embedFont("Helvetica");
    const fontSize = 12;
    const lineHeight = fontSize * 1.4;

    // Pecah paragraf
    const lines = translated.split("\n");
    let y = height - 40; // margin atas

    for (const line of lines) {
      if (y < 40) {
        // halaman baru kalau habis
        const newPage = pdfDoc.addPage();
        y = newPage.getHeight() - 40;
      }
      page.drawText(line, {
        x: 40,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight;
    }

    const pdfBytes = await pdfDoc.save();

    await conn.sendMessage(
      m.chat,
      {
        document: Buffer.from(pdfBytes),
        mimetype: "application/pdf",
        fileName: "translated.pdf",
        caption: "✅ PDF selesai diterjemahkan ke dalam bahasa Indonesia.",
      },
      { quoted: m }
    );
  } catch (err) {
    console.error(err);
    m.reply("❌ Gagal menerjemahkan PDF: " + err.message);
  }
};

handler.help = ["pdftranslate"];
handler.tags = ["tools"];
handler.command = /^pdftranslate$/i;

export default handler;
