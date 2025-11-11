// file: plugins/tool-deploy.js
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { sendInteractiveMessage } from "buttons-warpper";

const fmtSize = (bytes) => {
  const mb = bytes / 1024 / 1024;
  return mb < 1 ? `${(bytes / 1024).toFixed(2)} KB` : `${mb.toFixed(2)} MB`;
};
const fmtTime = (ms) => (ms / 1000).toFixed(2) + " s";
const pad = (n) => n.toString().padStart(2, "0");

/**
 * Kirim pesan dengan tombol interaktif via buttons-warpper
 */
async function sendButtons(conn, jid, opts) {
  const { text, footer, buttons = [], quoted } = opts;

  const interactiveButtons = buttons.map((btn) => {
    if (btn.url) {
      return {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: btn.text,
          url: btn.url,
        }),
      };
    } else {
      return {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: btn.text,
          id: btn.id || btn.text,
        }),
      };
    }
  });

  await sendInteractiveMessage(conn, jid, {
    text,
    footer: footer || "",
    interactiveButtons,
    quoted,
  });
}

let handler = async (m, { conn }) => {
  const start = Date.now();

  try {
    let fileBuffer, filename;

    if (m.quoted?.message?.documentMessage) {
      fileBuffer = await m.quoted.download();
      filename = m.quoted.message.documentMessage.fileName;
    } else if (m.message?.documentMessage) {
      fileBuffer = await m.download();
      filename = m.message.documentMessage.fileName;
    } else {
      return sendButtons(conn, m.chat, {
        text: "Kirim file archive (.zip/.rar/.7z/.tar.gz) lalu reply dengan *.deploy*",
        footer: "© afkhid-esm",
        buttons: [{ text: "Cara pakai", id: "deploy_help" }],
        quoted: m,
      });
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
      return sendButtons(conn, m.chat, {
        text: "Format file tidak didukung! Gunakan .zip / .rar / .7z / .tar.gz",
        footer: "© afkhid-esm",
        buttons: [{ text: "Coba Lagi", id: "deploy_retry" }],
        quoted: m,
      });
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

        // cari folder berisi index.html/php
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

        const lastFolderName = path.basename(deepest).toLowerCase();
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

        await sendButtons(conn, m.chat, {
          text: caption,
          footer: "© afkhid-esm",
          buttons: [
            { text: "🌐 Kunjungi Website", url },
            // { text: "Selesai", id: "deploy_done" },
          ],
          quoted: m,
        });
      } catch (e) {
        await sendButtons(conn, m.chat, {
          text: "❌ " + e.message,
          footer: "© afkhid-esm",
          buttons: [{ text: "Coba Lagi", id: "deploy_retry" }],
          quoted: m,
        });
      }
    });
  } catch (err) {
    await sendButtons(conn, m.chat, {
      text: "❌ Server Error, gagal deploy",
      footer: "Deploy error",
      buttons: [{ text: "Coba Lagi", id: "deploy_retry" }],
      quoted: m,
    });
  }
};

handler.command = /^deploy$/i;
export default handler;
