import axios from "axios";
import crypto from "crypto";
import fetch from "node-fetch";

async function veo3(prompt, { image = null, retries = 2 } = {}) {
  if (!prompt) throw new Error("Prompt is required");

  for (let i = 0; i <= retries; i++) {
    try {
      const { data: cf } = await axios.post(
        "https://cf.nekolabs.my.id/action",
        {
          mode: "turnstile-min",
          siteKey: "0x4AAAAAAANuFg_hYO9YJZqo",
          url: "https://aivideogenerator.me/features/g-ai-video-generator",
        },
        { timeout: 60000 } // 10 s
      );

      const num = Math.floor(Math.random() * 100) + 1700;
      const uid = crypto
        .createHash("md5")
        .update(Date.now().toString())
        .digest("hex");

      const { data: task } = await axios.post(
        "https://aiarticle.erweima.ai/api/v1/secondary-page/api/create",
        {
          prompt,
          imgUrls: image ? [image] : [],
          quality: "720p",
          duration: 8,
          autoSoundFlag: false,
          soundPrompt: "",
          autoSpeechFlag: false,
          speechPrompt: "",
          speakerId: "Auto",
          aspectRatio: "16:9",
          secondaryPageId: num,
          channel: "VEO3",
          source: "aivideogenerator.me",
          type: "features",
          watermarkFlag: true,
          privateFlag: true,
          isTemp: true,
          vipFlag: true,
          model: "veo-3-fast",
        },
        {
          headers: {
            uniqueid: uid,
            verify: cf.token,
            "Content-Type": "application/json",
          },
          timeout: 60000,
        }
      );

      for (;;) {
        const { data } = await axios.get(
          `https://aiarticle.erweima.ai/api/v1/secondary-page/api/${task.data.recordId}`,
          { headers: { uniqueid: uid, verify: cf.token }, timeout: 60000 }
        );
        if (data.data.state === "fail") throw new Error("Render failed");
        if (data.data.state === "success")
          return JSON.parse(data.data.completeData);
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch (e) {
      const is502 = e.response?.status === 502;
      if (is502 && i < retries) {
        // retry kalau 502
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      throw e; // lempar error akhir
    }
  }
}

/* ---------- WhatsApp handler ---------- */
let handler = async (m, { conn, usedPrefix, text }) => {
  if (!text) {
    await conn.sendMessage(
      m.chat,
      { text: `*Contoh:* ${usedPrefix}veo3 kucing ngajar javascript` },
      { quoted: m }
    );
    return;
  }
  await conn.sendMessage(
    m.chat,
    { text: "🎥 _Merender video (±20-60 dtk)_" },
    { quoted: m }
  );

  try {
    const json = await veo3(text);
    const video = await fetch(json.videoUrl).then((r) => r.buffer());

    await conn.sendMessage(
      m.chat,
      {
        video,
        caption: `✅ Veo-3 selesai!\nDurasi: ${
          json.duration || "?"
        }s\nby Afkhidbot`,
        gifPlayback: false,
      },
      { quoted: m }
    );
  } catch (e) {
    const msg =
      e.response?.status === 502
        ? "❌ Server sedang overload (502). Coba lagi dalam 1-2 menit ya."
        : "❌ Gagal membuat video: " + e.message;
    await conn.sendMessage(m.chat, { text: msg }, { quoted: m });
  }
};

handler.help = ["veo3"];
handler.tags = ["ai"];
handler.command = /^veo3$/i;

export default handler;
