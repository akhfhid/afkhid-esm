import axios from 'axios';
import { Buffer } from 'buffer';

const MAX = 5;

const handler = async (m, { conn, usedPrefix, text }) => {
    const disease = text?.trim();
    if (!disease) {
        return conn.sendMessage(
            m.chat,
            { text: `*Contoh:*\n${usedPrefix}obat flu` },
            { quoted: m }
        );
    }

    await conn.sendMessage(
        m.chat,
        { text: `⏳ Mencari rekomendasi obat untuk *${disease}*…` },
        { quoted: m }
    );

    try {
        const { data } = await axios.get(
            'https://api.nekolabs.my.id/discovery/halodoc/medicine',
            { params: { disease }, timeout: 15_000 }
        );
        if (!data.success || !data.result?.length)
            throw new Error('Tidak ditemukan obat untuk penyakit tersebut.');

        const list = data.result.slice(0, MAX);

        const jobs = list.map(async (it) => {
            const buff = await axios
                .get(it.cover, { responseType: 'arraybuffer' })
                .then((r) => Buffer.from(r.data));
            return {
                buffer: buff,
                title: it.title,
                subtitle: it.subtitle,
                price: it.price,
                url: it.url,
            };
        });
        const ready = await Promise.all(jobs);

        for (const item of ready) {
            await conn.sendMessage(
                m.chat,
                {
                    image: item.buffer,
                    caption:
                        `*${item.title}*\n` +
                        `• ${item.subtitle}\n` +
                        `• ${item.price}\n` +
                        `• ${item.url}\n` +
                        `Source Halodoc \n\n*© afkhid-esm*`,
                },
                { quoted: m }
            );
        }
    } catch (e) {
        await conn.sendMessage(
            m.chat,
            { text: `❌ ${e.message || 'Gagal memuat rekomendasi obat.'}` },
            { quoted: m }
        );
    }
};

handler.help = ['halodoc <penyakit>'];
handler.tags = ['health'];
handler.command = /^halodoc$/i;
export default handler;