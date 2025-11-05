// file: handler-deploy.js
import fs from "fs";
import path from "path";
import { exec } from "child_process";

const fmtSize = (bytes) => {
  const mb = bytes / 1024 / 1024;
  return mb < 1 ? `${(bytes / 1024).toFixed(2)} KB` : `${mb.toFixed(2)} MB`;
};
const fmtTime = (ms) => (ms / 1000).toFixed(2) + " sec";
const pad = (n) => n.toString().padStart(2, "0");

let handler = async (m, { conn }) => {
  const start = Date.now(); // 
  try {
    let fileBuffer, filename;
    if (m.quoted?.message?.documentMessage) {
      fileBuffer = await m.quoted.download();
      filename = m.quoted.message.documentMessage.fileName;
    } else if (m.message?.documentMessage) {
      fileBuffer = await m.download();
      filename = m.message.documentMessage.fileName;
    } else {
      return await conn.sendButtons(
        m.chat,
        {
          text: "Kirim file archive .zip lalu ketik *.deploy*",
          footer: "© afkhid-esm",
          buttons: [{ id: "deploy_help", text: "Cara pakai" }],
        },
        { quoted: m }
      );
    }

    const ext = path.extname(filename).toLowerCase();
    const validExts = [
      ".zip",
      ".rar",
      ".7z",
      ".tar.gz",
      ".tgz",
      ".tar.bz2",
      ".tbz2",
    ];
    if (!validExts.includes(ext)) {
      return await conn.sendButtons(
        m.chat,
        {
          text: "Format file tidak didukung! Gunakan format .zip",
          footer: "© afkhid-esm",
          buttons: [{ id: `".deploy"`, text: "Coba Lagi" }],
        },
        { quoted: m }
      );
    }

    const uploadsDir = "/home/proxy_ubuntu/Public/afkhid-esm/webuser";
    if (!fs.existsSync(uploadsDir))
      fs.mkdirSync(uploadsDir, { recursive: true });

    const tempName = `deploy_${Date.now()}`;
    const tempFile = path.join(uploadsDir, tempName + ext);
    fs.writeFileSync(tempFile, fileBuffer);
    const fileSize = fileBuffer.length; 

    const tmpExtract = path.join(uploadsDir, tempName);
    fs.mkdirSync(tmpExtract, { recursive: true });

    let cmd = "";
    if (ext === ".zip") cmd = `unzip -o ${tempFile} -d ${tmpExtract}`;
    else if (ext === ".rar") cmd = `unrar x -o+ ${tempFile} ${tmpExtract}/`;
    else if (ext === ".7z") cmd = `7z x ${tempFile} -o${tmpExtract}`;
    else if (ext === ".tar.gz" || ext === ".tgz")
      cmd = `tar -xzf ${tempFile} -C ${tmpExtract}`;
    else if (ext === ".tar.bz2" || ext === ".tbz2")
      cmd = `tar -xjf ${tempFile} -C ${tmpExtract}`;

    exec(cmd, async (err) => {
      try {
        if (err) throw new Error("Gagal extract: " + err.message);
        fs.unlinkSync(tempFile);

        let deepest = tmpExtract;
        function findDeep(dir) {
          const list = fs.readdirSync(dir, { withFileTypes: true });
          for (const d of list) {
            if (d.isDirectory()) {
              const sub = path.join(dir, d.name);
              if (
                fs.readdirSync(sub).some((f) => /^index\.(html|php)$/i.test(f))
              ) {
                deepest = sub;
                return;
              }
              findDeep(sub);
            }
          }
        }
        findDeep(tmpExtract);
        const lastFolderName = path.basename(deepest);

        let targetDir = path.join(uploadsDir, lastFolderName);
        let count = 1;
        while (fs.existsSync(targetDir)) {
          targetDir = path.join(uploadsDir, `${lastFolderName}-v${count}`);
          count++;
        }
        fs.renameSync(deepest, targetDir);
        fs.rmSync(tmpExtract, { recursive: true, force: true });

        const elapsed = Date.now() - start;
        const now = new Date();
        const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(
          now.getSeconds()
        )}`;
        const dateStr = `${now.getDate()} ${
          [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ][now.getMonth()]
        } ${now.getFullYear()}`;

        const subdomain = path.basename(targetDir);
        const url = `https://${subdomain}.akhfhid.my.id`;
        const uploader = "+" + m.sender.replace(/\D/g, "");

        const caption =
          `📂 Project : ${subdomain}\n` +
          `🌍 Domain  : ${url}\n` +
          `📦 Size    : ${fmtSize(fileSize)}\n` +
          `⚡ Speed   : ${fmtTime(elapsed)}\n` +
          `🛠 Runtime : Ubuntu 22.04 • Nginx Active\n` +
          `────────────────────────\n` +
          `🚀 Status  : Online & Live\n` +
          `👨‍💻 Uploader: ${uploader}\n` +
          `⏳ Deployed: ${timeStr} - ${dateStr}\n\n` +
          `*Powered by © afkhid-esm*`;

        await conn.sendButtons(
          m.chat,
          {
            title: "*DEPLOYMENT SUCCESS*",
            text: caption,
            footer: "© afkhid-esm",
            buttons: [
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "🌐 Kunjungi Website",
                  url,
                }),
              },
              // { id: "deploy_done", text: "Selesai" },
            ],
          },
          { quoted: m }
        );
      } catch (e) {
        await conn.sendButtons(
          m.chat,
          {
            text: "❌ " + e.message,
            footer: "© afkhid-esm",
            buttons: [{ id: "deploy_retry", text: "Coba Lagi" }],
          },
          { quoted: m }
        );
      }
    });
  } catch (err) {
    await conn.sendButtons(
      m.chat,
      {
        text: "❌ Server Error, gagal deploy",
        footer: "Deploy error",
        buttons: [{ id: "deploy_retry", text: "Coba Lagi" }],
      },
      { quoted: m }
    );
  }
};

handler.command = ["deploy"];
export default handler;
