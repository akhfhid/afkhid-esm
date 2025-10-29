import fs from "fs";
import path from "path";
import { exec } from "child_process";

let handler = async (m, { conn }) => {
  try {
    let fileBuffer, filename;
    if (m.quoted && m.quoted.message && m.quoted.message.documentMessage) {
      fileBuffer = await m.quoted.download();
      filename = m.quoted.message.documentMessage.fileName;
    } else if (m.message && m.message.documentMessage) {
      fileBuffer = await m.download();
      filename = m.message.documentMessage.fileName;
    } else {
      return await conn.sendMessage(
        m.chat,
        {
          text: " Reply atau kirim file archive (.zip, .rar, .7z, .tar.gz, .tar.bz2) dengan command *.deploy*",
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
      return await conn.sendMessage(
        m.chat,
        {
          text: " Format file tidak didukung. Gunakan .zip, .rar, .7z, .tar.gz, .tar.bz2",
        },
        { quoted: m }
      );
    }

    await conn.sendMessage(
      m.chat,
      { text: "⏳ Sedang memproses deploy... tunggu sebentar" },
      { quoted: m }
    );

    const uploadsDir = "/home/proxy_ubuntu/Public/afkhid-esm/webuser";
    if (!fs.existsSync(uploadsDir))
      fs.mkdirSync(uploadsDir, { recursive: true });

    const tempName = `deploy_${Date.now()}`;
    const tempFile = path.join(uploadsDir, tempName + ext);
    fs.writeFileSync(tempFile, fileBuffer);

    const tmpExtract = path.join(uploadsDir, tempName); // /webuser/deploy_123456
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
      if (err) {
        return await conn.sendMessage(
          m.chat,
          { text: "❌ Gagal extract: " + err.message },
          { quoted: m }
        );
      }

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

      const url = `https://${path.basename(targetDir)}.akhfhid.my.id`;
      return await conn.sendMessage(
        m.chat,
        {
          text:
            `✅ Deploy berhasil!\n\n` +
            `📁 Folder: ${path.basename(targetDir)}\n` +
            `🌍 URL: ${url}\n` +
            `📦 File archive sudah dihapus otomatis ✅`,
        },
        { quoted: m }
      );
    });
  } catch (err) {
    console.error(err);
    await conn.sendMessage(
      m.chat,
      { text: " Gagal deploy, ada error di server" },
      { quoted: m }
    );
  }
};

handler.command = ["deploy"];
export default handler;
