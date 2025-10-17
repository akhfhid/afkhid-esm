import axios from "axios";
import FormData from "form-data";
import { tmpdir } from "os";
import { join } from "path";
import { writeFileSync, unlinkSync } from "fs";

class RVCHoloID {
  constructor() {
    this.api_url = "https://kit-lemonfoot-vtuber-rvc-models.hf.space";
    this.file_url = "https://kit-lemonfoot-vtuber-rvc-models.hf.space/file=";
    this.models = {
      moona: {
        fn: 44,
        file: [
          "Moona Hoshinova",
          "weights/hololive-id/Moona/Moona_Megaaziib.pth",
          "weights/hololive-id/Moona/added_IVF1259_Flat_nprobe_1_v2_mbkm.index",
          "",
        ],
      },
      lofi: {
        fn: 45,
        file: [
          "Airani Iofifteen",
          "weights/hololive-id/Iofi/Iofi_KitLemonfoot.pth",
          "weights/hololive-id/Iofi/added_IVF256_Flat_nprobe_1_AiraniIofifteen_Speaking_V2_v2.index",
          "",
        ],
      },
      risu: {
        fn: 46,
        file: [
          "Ayunda Risu",
          "weights/hololive-id/Risu/Risu_Megaaziib.pth",
          "weights/hololive-id/Risu/added_IVF2090_Flat_nprobe_1_v2_mbkm.index",
          "",
        ],
      },
      ollie: {
        fn: 47,
        file: [
          "Kureiji Ollie",
          "weights/hololive-id/Ollie/Ollie_Dacoolkid.pth",
          "weights/hololive-id/Ollie/added_IVF2227_Flat_nprobe_1_ollie_v2_mbkm.index",
          "",
        ],
      },
      anya: {
        fn: 48,
        file: [
          "Anya Melfissa",
          "weights/hololive-id/Anya/Anya_Megaaziib.pth",
          "weights/hololive-id/Anya/added_IVF910_Flat_nprobe_1_anyav2_v2_mbkm.index",
          "",
        ],
      },
      reine: {
        fn: 49,
        file: [
          "Pavolia Reine",
          "weights/hololive-id/Reine/Reine_KitLemonfoot.pth",
          "weights/hololive-id/Reine/added_IVF256_Flat_nprobe_1_PavoliaReine_Speaking_KitLemonfoot_v2.index",
          "",
        ],
      },
      zeta: {
        fn: 50,
        file: [
          "Vestia Zeta",
          "weights/hololive-id/Zeta/Zeta_Megaaziib.pth",
          "weights/hololive-id/Zeta/added_IVF462_Flat_nprobe_1_zetav2_v2.index",
          "",
        ],
      },
      kaela: {
        fn: 51,
        file: [
          "Kaela Kovalskia",
          "weights/hololive-id/Kaela/Kaela_Megaaziib.pth",
          "weights/hololive-id/Kaela/added_IVF265_Flat_nprobe_1_kaelaV2_v2.index",
          "",
        ],
      },
      kobo: {
        fn: 52,
        file: [
          "Kobo Kanaeru",
          "weights/hololive-id/Kobo/Kobo_Megaaziib.pth",
          "weights/hololive-id/Kobo/added_IVF454_Flat_nprobe_1_kobov2_v2.index",
          "",
        ],
      },
    };
  }

  generateSession() {
    return Math.random().toString(36).substring(2);
  }

  async upload(buffer) {
    const upload_id = this.generateSession();
    const orig_name = `vtr_${Date.now()}.mp3`;
    const form = new FormData();
    form.append("files", buffer, orig_name);
    const { data } = await axios.post(
      `${this.api_url}/upload?upload_id=${upload_id}`,
      form,
      {
        headers: form.getHeaders(),
      }
    );
    return {
      orig_name,
      path: data[0],
      url: `${this.file_url}${data[0]}`,
    };
  }

  async process(buffer, opts = {}) {
    const { model = "moona", transpose = 0 } = opts;
    if (!Buffer.isBuffer(buffer)) throw new Error("Butuh audio buffer");
    if (!this.models[model])
      throw new Error(`Model tersedia: ${Object.keys(this.models).join(", ")}`);

    const audio = await this.upload(buffer);
    const session = this.generateSession();
    const payload = [
      ...this.models[model].file,
      {
        path: audio.path,
        url: audio.url,
        orig_name: audio.orig_name,
        size: buffer.length,
        mime_type: "audio/mpeg",
        meta: { _type: "gradio.FileData" },
      },
      "",
      "English-Ana (Female)",
      transpose,
      "pm",
      0.4,
      1,
      0,
      1,
      0.23,
    ];

    /* join queue */
    await axios.post(`${this.api_url}/queue/join?`, {
      data: payload,
      event_data: null,
      fn_index: this.models[model].fn,
      trigger_id: 620,
      session_hash: session,
    });

    /* polling hasil */
    const { data: stream } = await axios.get(
      `${this.api_url}/queue/data?session_hash=${session}`
    );
    let result;
    for (const line of stream.split("\n\n")) {
      if (line.startsWith("data:")) {
        const d = JSON.parse(line.substring(6));
        if (d.msg === "process_completed") result = d.output.data[1].url;
      }
    }
    if (!result) throw new Error("Gagal mengubah suara");
    return result;
  }
}

let handler = async (m, { conn, usedPrefix, text }) => {
  /* penggunaan: .vtr <model> (reply audio) */
  const models = Object.keys(new RVCHoloID().models);
  if (!text || !models.includes(text.toLowerCase())) {
    await conn.sendMessage(
      m.chat,
      {
        text: `*Pilih model:*\n${models
          .map((v) => `• ${v}`)
          .join("\n")}\n\n*Contoh:* ${usedPrefix}vtr risu`,
      },
      { quoted: m }
    );
    return;
  }

  const q = m.quoted || m;
  const mime = (q.msg || q).mimetype || "";
  if (!mime || !mime.startsWith("audio/")) {
    await conn.sendMessage(
      m.chat,
      { text: `Reply audio dengan caption ${usedPrefix}vtr <model>` },
      { quoted: m }
    );
    return;
  }

  await conn.sendMessage(
    m.chat,
    { text: "🎙️ Mengubah suara... (±30-60 dtk)" },
    { quoted: m }
  );

  try {
    const buff = await q.download();
    const rv = new RVCHoloID();
    const url = await rv.process(buff, {
      model: text.toLowerCase(),
      transpose: 0,
    });

    const audioBuff = await axios.get(url, { responseType: "arraybuffer" });
    await conn.sendMessage(
      m.chat,
      { audio: audioBuff.data, mimetype: "audio/mp4", ptt: true },
      { quoted: m }
    );
  } catch (e) {
    await conn.sendMessage(m.chat, { text: "❌ " + e.message }, { quoted: m });
  }
};

handler.help = ["vtr <model> (reply audio)"];
handler.tags = ["ai"];
handler.command = /^vtr$/i;
// handler.limit = true;

export default handler;
