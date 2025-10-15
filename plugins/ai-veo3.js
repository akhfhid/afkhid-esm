import fetch from 'node-fetch';
import crypto from 'crypto';

async function veo3(prompt, {
    model = 'veo-3-fast',
    auto_sound = false,
    auto_speech = false
} = {}) {
    const _model = ['veo-3-fast', 'veo-3'];
    if (!prompt) throw new Error('Prompt is required');
    if (!_model.includes(model)) throw new Error(`Available models: ${_model.join(', ')}`);
    if (typeof auto_sound !== 'boolean') throw new Error('Auto sound must be a boolean');
    if (typeof auto_speech !== 'boolean') throw new Error('Auto speech must be a boolean');

    const { data: cf } = await fetch(
        'https://api.nekorinn.my.id/tools/rynn-stuff?mode=turnstile-min&siteKey=0x4AAAAAAAdJZmNxW54o-Gvd&url=https://lunaai.video/features/v3-fast&accessKey=5238b8ad01dd627169d9ac2a6c843613d6225e6d77a6753c75dc5d3f23813653'
    ).then(r => r.json());

    const uid = crypto.createHash('md5').update(Date.now().toString()).digest('hex');

    const { data: task } = await fetch('https://aiarticle.erweima.ai/api/v1/secondary-page/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', uniqueid: uid, verify: cf.result.token },
        body: JSON.stringify({
            prompt,
            imgUrls: [],
            quality: '720p',
            duration: 8,
            autoSoundFlag: auto_sound,
            soundPrompt: '',
            autoSpeechFlag: auto_speech,
            speechPrompt: '',
            speakerId: 'Auto',
            aspectRatio: '16:9',
            secondaryPageId: 1811,
            channel: 'VEO3',
            source: 'lunaai.video',
            type: 'features',
            watermarkFlag: true,
            privateFlag: true,
            isTemp: true,
            vipFlag: true,
            model
        })
    }).then(r => r.json());

    while (true) {
        const { data } = await fetch(
            `https://aiarticle.erweima.ai/api/v1/secondary-page/api/${task.data.recordId}`,
            { headers: { uniqueid: uid, verify: cf.result.token } }
        ).then(r => r.json());

        if (data.data.state === 'success') return JSON.parse(data.data.completeData);
        await new Promise(r => setTimeout(r, 1000));
    }
}

let handler = async (m, { conn, usedPrefix, text }) => {
    if (!text) throw `*Contoh:* ${usedPrefix}veo3 kucing lucu berbicara`;
    m.reply('Sedang membuat video, tunggu sekitar 20-60 detik…_');

    try {
        const json = await veo3(text); 
        const video = await fetch(json.videoUrl).then(r => r.buffer());

        await conn.sendMessage(
            m.chat,
            {
                video,
                caption: ` Veo3 selesai!\nModel: ${json.model || 'veo-3'}\nDurasi: ${json.duration || '?'}s\nby Afkhidbot`,
                gifPlayback: false 
            },
            { quoted: m }
        );
    } catch (e) {
        conn.sendMessage(m.chat, { text: '❌ Gagal membuat video: ' + e.message }, { quoted: m });
        // m.reply('❌ Gagal membuat video: ' + e.message);
    }
};

handler.help = ['veo3'];
handler.tags = ['ai'];
handler.command = /^veo3$/i;
// handler.limit = true

export default handler;