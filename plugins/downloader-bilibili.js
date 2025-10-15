import axios from "axios";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
// <<<<<<< HEAD

// function sanitizeFilename(name) {
//   return name.replace(/[^a-z0-9_\-]/gi, "_");
// }

// let handler = async (m, { conn, args }) => {
//   if (!args[0]) {
//     return await conn.sendMessage(
//       m.chat,
//       { text: "⚠️ Mohon sertakan URL video BiliBili!" },
//       { quoted: m }
//     );
//   }

//   const sender = m.sender.split("@")[0];
//   const url = args[0];

//   await conn.sendMessage(
//     m.chat,
//     {
//       text: "⏳ Proses download video sedang berlangsung. Mohon menunggu hingga proses selesai. Status selanjutnya akan diinformasikan.",
//     },
//     { quoted: m }
//   );

//   try {
//     const { data } = await axios.get(
//       `${APIs.ryzumi}/api/downloader/bilibili?url=${encodeURIComponent(url)}`
//     );

//     if (!data.status || !data.data?.mediaList?.videoList?.length) {
//       throw "Tidak ditemukan video yang tersedia!";
//     }

//     const video = data.data.mediaList.videoList[0];
//     const videoUrl = video.url;
//     const filenameSafe = sanitizeFilename(video.filename || "video");

//     const tempDir = path.join(process.cwd(), "tmp");
//     await fs.mkdir(tempDir, { recursive: true });

//     const tempFilePath = path.join(tempDir, `${filenameSafe}.mp4`);
//     const outputFilePath = path.join(tempDir, `${filenameSafe}_fixed.mp4`);

//     // Download video
//     const writer = (await import("fs")).createWriteStream(tempFilePath);
//     const response = await axios.get(videoUrl, { responseType: "stream" });
//     const totalLength = response.headers["content-length"];
//     let downloaded = 0;
//     const startTime = Date.now();

//     response.data.on("data", (chunk) => {
//       downloaded += chunk.length;
//     });

//     response.data.pipe(writer);

//     await new Promise((resolve, reject) => {
//       writer.on("finish", resolve);
//       writer.on("error", reject);
//     });

//     const endTime = Date.now();
//     const durationSec = (endTime - startTime) / 1000;
//     const mbps = (downloaded / 1024 / 1024 / durationSec).toFixed(2);

//     await conn.sendMessage(
//       m.chat,
//       {
//         text: `⚙️ Memulai proses pengolahan video. Mohon tetap menunggu hingga video siap dikirim.\n\n📌 Durasi download: ${durationSec.toFixed(
//           2
//         )} detik\n📌 Rata-rata kecepatan: ${mbps} MB/s`,
//       },
//       { quoted: m }
//     );

//     await new Promise((resolve, reject) => {
//       const ff = spawn("ffmpeg", [
//         "-i",
//         tempFilePath,
//         "-vf",
//         'drawtext=text="By Afkhidbot":fontcolor=white:fontsize=24:x=10:y=H-th-10',
//         "-c:a",
//         "copy",
//         outputFilePath,
//         "-y",
//       ]);

//       ff.stderr.on("data", (data) => {
//       });

//       ff.on("close", (code) => {
//         if (code !== 0) {
//           return reject(new Error(`FFmpeg exited with code ${code}`));
//         }
//         resolve();
//       });
//       ff.on("error", reject);
//     });

//     try {
//       await fs.access(outputFilePath);
//     } catch {
//       throw new Error(
//         "File video hasil pengolahan tidak ditemukan. FFmpeg gagal membuat file output."
//       );
// =======

let handler = async (m, { conn, args }) => {
    if (!args[0]) {
        return await conn.sendMessage(
            m.chat,
            { text: "Sertakan URL/Link video BiliBili!" },
            { quoted: m }
        );
    }

    const sender = m.sender.split("@")[0];
    const url = args[0];
    await conn.sendMessage(
        m.chat,
        {
            text: "⏳ Proses download video sedang berlangsung. Mohon untuk menunggu hingga proses selesai. Status selanjutnya akan diinformasikan.",
        },
        { quoted: m }
    );

    try {
        const { data } = await axios.get(
            `${APIs.ryzumi}/api/downloader/bilibili?url=${encodeURIComponent(url)}`
        );

        if (!data.status || !data.data?.mediaList?.videoList?.length) {
            throw " Tidak ditemukan video yang tersedia!";
        }
        const video = data.data.mediaList.videoList[0];
        const videoUrl = video.url;
        const tempFilePath = path.join("/tmp", `${video.filename || "video"}.mp4`);
        const outputFilePath = path.join(
            "/tmp",
            `${video.filename || "video"}_fixed.mp4`
        );
        const writer = (await import("fs")).createWriteStream(tempFilePath);
        const response = await axios.get(videoUrl, { responseType: "stream" });
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        // Informasi awal proses pengolahan video
        await conn.sendMessage(
            m.chat,
            {
                text: "⚙️ Memulai proses pengolahan video. Mohon tetap menunggu hingga video siap dikirim.",
            },
            { quoted: m }
        );

        await new Promise((resolve, reject) => {
            const ff = spawn("ffmpeg", [
                "-i",
                tempFilePath,
                "-c",
                "copy",
                outputFilePath,
                "-y",
            ]);
            ff.stderr.on("data", () => { });
            ff.on("close", resolve);
            ff.on("error", reject);
        });

        const fixedVideoBuffer = await fs.readFile(outputFilePath);
        await conn.sendMessage(
            m.chat,
            {
                video: fixedVideoBuffer,
                mimetype: "video/mp4",
                fileName: video.filename || "video.mp4",
                caption: `🎬 Video BiliBili untuk @${sender}\n© By Afkhidbot`,
                mentions: [m.sender],
            },
            { quoted: m }
        );

        await fs.unlink(tempFilePath);
        await fs.unlink(outputFilePath);
    } catch (error) {
        console.error(error);
        await conn.sendMessage(
            m.chat,
            { text: ` Terjadi error: ${error.message || error}` },
            { quoted: m }
        );
        // >>>>>>> c2f8cdcfb84bc7282ee5b4843b5a8ba8d57ff506
    }

    const fixedVideoBuffer = await fs.readFile(outputFilePath);
    await conn.sendMessage(
        m.chat,
        {
            video: fixedVideoBuffer,
            mimetype: "video/mp4",
            fileName: `${filenameSafe}.mp4`,
            caption: `🎬 Video BiliBili untuk @${sender}\nBy Afkhidbot`,
            mentions: [m.sender],
        },
        { quoted: m }
    );

    await fs.unlink(tempFilePath);
    await fs.unlink(outputFilePath);
    // } catch (error) {
    //   console.error(error);
    //   await conn.sendMessage(
    //     m.chat,
    //     { text: ` Terjadi error: ${error.message || error}` },
    //     { quoted: m }
    //   );
    // }
};

handler.help = ["bilibili <url>"];
handler.tags = ["downloader"];
handler.command = /^(bili(bili)?)$/i;
// <<<<<<< HEAD
handler.limit = 5;
// =======
// handler.limit = 2;
// >>>>>>> c2f8cdcfb84bc7282ee5b4843b5a8ba8d57ff506
// handler.register = true;

export default handler;
