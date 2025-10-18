import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const txt2vid = async (prompt, ratio = "16:9") => {
  const _ratio = ["16:9", "9:16", "1:1", "4:3", "3:4"];

  if (!prompt) throw new Error("Prompt is required");
  if (!_ratio.includes(ratio))
    throw new Error(`Available ratios: ${_ratio.join(", ")}`);

  const { data: cf } = await axios.get(
    "https://api.nekorinn.my.id/tools/rynn-stuff",
    {
      params: {
        mode: "turnstile-min",
        siteKey: "0x4AAAAAAATOXAtQtziH-Rwq",
        url: "https://www.yeschat.ai/features/text-to-video-generator",
        accessKey:
          "a40fc14224e8a999aaf0c26739b686abfa4f0b1934cda7fa3b34522b0ed5125d",
      },
    }
  );

  const uid = crypto
    .createHash("md5")
    .update(Date.now().toString())
    .digest("hex");
  const { data: task } = await axios.post(
    "https://aiarticle.erweima.ai/api/v1/secondary-page/api/create",
    {
      prompt: prompt,
      imgUrls: [],
      quality: "540p",
      duration: 5,
      autoSoundFlag: false,
      soundPrompt: "",
      autoSpeechFlag: false,
      speechPrompt: "",
      speakerId: "Auto",
      aspectRatio: ratio,
      secondaryPageId: 388,
      channel: "PIXVERSE",
      source: "yeschat.ai",
      type: "features",
      watermarkFlag: false,
      privateFlag: false,
      isTemp: true,
      vipFlag: false,
    },
    {
      headers: {
        uniqueid: uid,
        verify: cf.result.token,
      },
    }
  );

  while (true) {
    const { data } = await axios.get(
      `https://aiarticle.erweima.ai/api/v1/secondary-page/api/${task.data.recordId}`,
      {
        headers: {
          uniqueid: uid,
          verify: cf.result.token,
        },
      }
    );

    if (data.data.state === "success")
      return JSON.parse(data.data.completeData);
    await new Promise((res) => setTimeout(res, 1000));
  }
};

let handler = async (m, { conn, usedPrefix, text }) => {
  if (!text) {
    await conn.sendMessage(
      m.chat,
      {
        text: `Penggunaan:\n${usedPrefix}txt2vid <prompt>\n\nContoh:\n${usedPrefix}txt2vid a woman relaxing on the beach`,
      },
      { quoted: m }
    );
    return;
  }

  await conn.sendMessage(
    m.chat,
    { text: "Generating video..." },
    { quoted: m }
  );

  try {
    const result = await txt2vid(text);
    const videoUrl = result.videoUrl;

    const tmpDir = path.join(__dirname, "tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
    const filePath = path.join(tmpDir, "video.mp4");

    const response = await axios.get(videoUrl, { responseType: "stream" });
    response.data.pipe(fs.createWriteStream(filePath));

    await new Promise((resolve, reject) => {
      response.data.on("end", resolve);
      response.data.on("error", reject);
    });

    await conn.sendMessage(
      m.chat,
      { video: { url: filePath }, caption: "Here is your video!" },
      { quoted: m }
    );

    fs.unlinkSync(filePath);
  } catch (e) {
    await conn.sendMessage(m.chat, { text: "❌ " + e.message }, { quoted: m });
  }
};

handler.help = ["txt2vid <prompt>"];
handler.tags = ["tools"];
handler.command = /^txt2vid$/i;

export default handler;
