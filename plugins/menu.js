import { promises as fs } from "fs";
import { join } from "path";
import { xpRange } from "../lib/levelling.js";
import moment from "moment-timezone";
import { platform as getPlatform } from "os";
import { sendInteractiveMessage } from "buttons-warpper";

const defaultMenu = {
  before: `
● *Nama:* %name
● *Nomor:* %tag
● *Premium:* %prems
● *Limit:* %limit
● *Role:* %role

*${ucapan()} %name!*
● *Tanggal:* %week %weton
● *Date:* %date
● *Tanggal Islam:* %dateIslamic
● *Waktu:* %time

● *Nama Bot:* %me
● *Mode:* %mode
● *Prefix:* [ *%_p* ]
● *Platform:* %platform
● *Uptime:* %muptime
● *Database:* %rtotalreg dari %totalreg

⬣───「 *INFO CMD* 」───⬣
│ *Ⓟ* = Premium
│ *Ⓛ* = Limit
▣────────────⬣
  `.trimStart(),
  header: "╭─────『 %category 』",
  body: "  ⫸ %cmd %isPremium %islimit",
  footer: "╰–––––––––––––––༓",
};

let handler = async (m, { conn, usedPrefix: _p, __dirname, args, command }) => {
  const tags = {
    // main: "🏠 Main",
    ai: "Fitur Ai",
    stalk: "Stalk Sosmed",
    downloader: "Downloader",
    internet: "Internet",
    anime: "Anime",
    sticker: " Sticker",
    tools: " Tools",
    group: " Group",
    info: "Info",
    // owner: " Owner",
  };

  try {
    // --------- User & Bot Info ----------
    const d = new Date();
    const locale = "id";
    const week = d.toLocaleDateString(locale, { weekday: "long" });
    const date = d.toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const weton = ["Pahing", "Pon", "Wage", "Kliwon", "Legi"][
      Math.floor(d / 84600000) % 5
    ];
    const dateIslamic = new Intl.DateTimeFormat(`${locale}-TN-u-ca-islamic`, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
    const time = d.toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });

    const uptime = clockString(process.uptime() * 1000);
    const muptime = process.send
      ? clockString(
          (await new Promise((resolve) => {
            process.once("message", resolve);
            setTimeout(resolve, 1000);
          })) * 1000
        )
      : "0 H 00 M 00 S";

    const user = global.db.data.users[m.sender];
    const { exp, limit, level, role, money } = user;
    const { min, xp, max } = xpRange(level, global.multiplier);
    const name = await conn.getName(m.sender);
    const prems = user.premiumTime > 0 ? "Premium" : "Free";
    const sysPlatform = getPlatform();
    const totalreg = Object.keys(global.db.data.users).length;
    const rtotalreg = Object.values(global.db.data.users).filter(
      (u) => u.registered
    ).length;

    const help = Object.values(global.plugins)
      .filter((p) => !p.disabled)
      .map((p) => ({
        help: Array.isArray(p.tags) ? p.help : [p.help],
        tags: Array.isArray(p.tags) ? p.tags : [p.tags],
        prefix: "customPrefix" in p,
        limit: p.limit,
        premium: p.premium,
      }));

    // --------- Group per category ----------
    const groups = {};
    for (let tag in tags)
      groups[tag] = help.filter((p) => p.tags.includes(tag));

    const readMore = String.fromCharCode(8206).repeat(4001);
    const replace = {
      "%": "%",
      _p,
      p: uptime,
      muptime,
      me: conn.getName(conn.user.jid),
      exp: exp - min,
      maxexp: xp,
      totalexp: exp,
      xp4levelup: max - exp,
      tag: `@${m.sender.split("@")[0]}`,
      platform: sysPlatform,
      mode: global.db.data.settings[conn.user.jid].public ? "Publik" : "Self",
      money,
      level,
      limit,
      name,
      prems,
      role,
      readmore: readMore,
      week,
      date,
      dateIslamic,
      time,
      totalreg,
      rtotalreg,
      weton,
    };

    const menuText = [
      defaultMenu.before,
      ...Object.keys(tags).map((tag) => {
        const catHeader = defaultMenu.header.replace(/%category/g, tags[tag]);
        const catBody =
          groups[tag]
            .map((p) =>
              p.help
                .map((h) =>
                  defaultMenu.body
                    .replace(/%cmd/g, p.prefix ? h : _p + h)
                    .replace(/%islimit/g, p.limit ? "Ⓛ" : "")
                    .replace(/%isPremium/g, p.premium ? "Ⓟ" : "")
                    .trim()
                )
                .join("\n")
            )
            .join("\n") || "Tidak ada perintah.";
        return `${catHeader}\n${catBody}\n${defaultMenu.footer}`;
      }),
    ].join("\n");
    // Contoh: menulist ai
    if (command === "menulist" && args[0]) {
      const tag = args[0].toLowerCase();
      if (!tags[tag]) return m.reply("Kategori tidak ditemukan!");

      const list = groups[tag]
        .map((p) =>
          p.help
            .map(
              (h) => `• ${_p + h} ${p.premium ? "Ⓟ" : ""}${p.limit ? "Ⓛ" : ""}`
            )
            .join("\n")
        )
        .join("\n");

      const text = `╭───『 *${tags[tag]}* 』\n${
        list || "Tidak ada perintah."
      }\n╰–––––––––––––––༓`;
      // return m.reply(text);
      return await conn.sendMessage(m.chat, {
        text : text
      })
    }
    const text = menuText.replace(
      new RegExp(
        `%(${Object.keys(replace)
          .sort((a, b) => b.length - a.length)
          .join("|")})`,
        "g"
      ),
      (_, name) => replace[name]
    );
    if (!m.isBaileys && !m.fromMe) {
      const interactiveButtons = [
        // Quick Reply Buttons (per kategori)
        ...Object.keys(tags).map((tag) => ({
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: tags[tag],
            id: `menulist ${tag}`,
          }),
        })),

        // Single Select Dropdown (semua kategori dalam satu dropdown)
        {
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "Pilih Kategori",
            sections: [
              {
                title: "Daftar Kategori",
                highlight_label: "Paling Populer", // opsional
                rows: Object.keys(tags).map((tag) => ({
                  id: `menulist ${tag}`,
                  title: tags[tag],
                  description: `Lihat perintah di kategori ${tags[tag]}`,
                })),
              },
            ],
          }),
        },
      ];

      await sendInteractiveMessage(conn, m.chat, {
        image: { url: "https://telegra.ph/file/666ccbfc3201704454ba5.jpg" },
        text: `*┌─「 Afkhid-esm 」*
│ • Name   : ${name}
│ • Premium: ${prems}
│ • Limit  : ${limit}
│ • Role   : ${role}
└───────────────⬣`,
        footer: `Tap tombol di bawah untuk navigasi.\n© afkhid-esm`,
        interactiveButtons,
      });
      return;
    }
    await sendInteractiveMessage(conn, m.chat, {
      // image: { url: "https://telegra.ph/file/666ccbfc3201704454ba5.jpg" },
      text: headerText,
      footer: `Tap tombol di bawah untuk navigasi.\n© afkhid-esm`,
      interactiveButtons,
    });
    // await conn.sendMessage(m.chat, { text }, { quoted: m });
  } catch (e) {
    conn.reply(m.chat, "Maaf, menu sedang error ⚠️", m);
    console.error(e);
  }
};

handler.help = ["menu"];
handler.tags = ["main"];
handler.register = true;
handler.command = /^(allmenu|menu|help|\?)$/i;
handler.exp = 3;

export default handler;

const more = String.fromCharCode(8206);
const readMore = more.repeat(4001);

function clockString(ms) {
  if (isNaN(ms)) return "-- H -- M -- S";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return `${h} H ${m} M ${s} S`;
}

function ucapan() {
  const hour = parseInt(moment.tz("Asia/Jakarta").format("HH"));
  if (hour >= 18) return "Malam Kak 🌙";
  if (hour >= 15) return "Sore Kak 🌇";
  if (hour >= 10) return "Siang Kak ☀️";
  if (hour >= 4) return "Pagi Kak 🌄";
  return "Kok Belum Tidur Kak? 🥱";
}
