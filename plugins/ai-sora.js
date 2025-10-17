import fetch from "node-fetch";
import axios from "axios";
import crypto from "crypto"

let handler = async (m, { text, conn, usedPrefix, command }) => {
    if (!text) await conn.sendMessage(m.chat, {
      text: `Contoh: ${usedPrefix + command} Denji ngoding php`,
    });
    await conn.sendMessage(m.chat, {
        text:"Sedang membuat video, tunggu sebentar..._"
    })
//   m.reply("_ Sedang membuat video, tunggu sebentar..._");

  try {
    const sora = async (prompt, { ratio = "portrait" } = {}) => {
      if (!prompt) throw new Error("Prompt is required.");
      if (!["portrait", "landscape"].includes(ratio))
        throw new Error("Available ratios: portrait, landscape.");

    
        const api = axios.create({
            baseURL: 'https://api.bylo.ai/aimodels/api/v1/ai',
            withCredentials: true,
            headers: {
                accept: 'application/json, text/plain, */*',
                'content-type': 'application/json; charset=UTF-8',
                origin: 'https://bylo.ai',
                referer: 'https://bylo.ai/features/sora-2',
                'user-agent':
                    'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36',
                'x-requested-with': 'XMLHttpRequest',
                'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                // Optional: kadang API butuh host tertentu (biasanya axios set otomatis)
                // host: 'api.bylo.ai',
                // ----------------------
                // **PENTING**: tambahkan cookie session bila punya (copy dari browser DevTools)
                // contoh: 'sessionid=xxx; token=yyy;'
                // cookie: 'sessionid=REPLACE_WITH_YOURS; token=REPLACE_WITH_YOURS',
                // ----------------------
                // uniqueId: boleh konsisten per user/request
                uniqueId: crypto.randomUUID().replace(/-/g, '')
            },
            timeout: 60000
        })

      const { data: task } = await api.post("/video/create", {
        prompt,
        channel: "SORA2",
        pageId: 536,
        source: "bylo.ai",
        watermarkFlag: true,
        privateFlag: true,
        isTemp: true,
        vipFlag: true,
        model: "sora_video2",
        videoType: "text-to-video",
        aspectRatio: ratio,
      });

      while (true) {
          const { data } = await api.get(`/${task.data}?channel=SORA2`);
          console.log(data);
        if (data.data.state > 0) return JSON.parse(data.data.completeData);
        await new Promise((res) => setTimeout(res, 2000));
      }
    };

    const video = await sora(text);
    const videoUrl = video?.data?.url || video?.url;

    if (!videoUrl) return m.reply("❌ Gagal mendapatkan video.");

    await conn.sendMessage(
      m.chat,
      {
        video: { url: videoUrl },
        caption: ` *Video Sora berhasil dibuat!*\n\nPrompt: ${text}\nby Afkhid`,
      },
      { quoted: m }
    );
  } catch (e) {
      console.error(e);
      await conn.sendMessage(m.chat, {
          text:"Terjadi kesalahan server sedang dalam perbaikan coba lagi nanti" + e.message
      })
    // m.reply("Terjadi kesalahan server sedang dalam perbaikan coba lagi nanti" + e.message);
  }
};

handler.help = ["sora <prompt>"];
handler.tags = ["ai"];
handler.command = /^sora$/i;

export default handler;
