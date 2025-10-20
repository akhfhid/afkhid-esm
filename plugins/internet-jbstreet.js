import axios from 'axios';

const searchJob = async (job, city) => {
    const qJob = encodeURIComponent(job);
    const qCity = encodeURIComponent(city);
    const url = `https://api.nekolabs.my.id/discovery/jobstreet/search?job=${qJob}&city=${qCity}`;
    const { data } = await axios.get(url, { timeout: 15000 });
    return data.result ?? [];
};

let handler = async (m, { conn, usedPrefix, text }) => {
    if (!text || !text.includes('|')) {
        await conn.sendMessage(
            m.chat,
            { text: `*Contoh:* ${usedPrefix}jobstreet Web Developer | Cianjur` },
            { quoted: m }
        );
        return;
    }
    const [job, city] = text.split('|').map(s => s.trim());
    await conn.sendMessage(m.chat, { text: ' Mencari lowongan...' }, { quoted: m });

    try {
        const list = await searchJob(job, city);
        if (!list.length) {
            await conn.sendMessage(m.chat, { text: '❌ Tidak ada lowongan yang cocok.' }, { quoted: m });
            return;
        }

        const h = list.slice(0, 5)[0];
        const logo = h.brand?.serpLogoUrl || 'https://i.ibb.co/3sR7qYG/no-logo.png';
        const gaji = h.salaryLabel || 'Gaji tidak ditampilkan';
        const lokasi = h.locations?.map(l => l.label).join(', ') || 'Lokasi tidak diketahui';
        const perus = h.companyName || h.advertiser?.description || 'Perusahaan tidak diketahui';
        const tgl = h.listingDateDisplay || '-';
        const url = `https://id.jobstreet.com/id/job/${h.id}`;

        const caption =
            `*${h.roleId || 'Lowongan'}*\n\n` +
            `Perusahaan: ${perus}\n` +
            `Lokasi: ${lokasi}\n` +
            `Gaji: ${gaji}\n` +
            `Tanggal: ${tgl}\n\n` +
            `🔗 Detail: ${url}`;

        await conn.sendMessage(
            m.chat,
            { image: { url: logo }, caption },
            { quoted: m }
        );
    } catch (e) {
        await conn.sendMessage(m.chat, { text: '❌ ' + e.message }, { quoted: m });
    }
};

handler.help = ['jobstreet <job> | <city>'];
handler.tags = ['tools'];
handler.command = /^jobstreet$/i;
// handler.limit = true;   // 

export default handler;