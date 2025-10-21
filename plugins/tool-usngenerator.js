import axios from "axios";

const MAX_RESULTS = 10;
const FONT_VARIANTS = [
  {
    a: "𝙖",
    b: "𝙗",
    c: "𝙘",
    d: "𝙙",
    e: "𝙚",
    f: "𝙛",
    g: "𝙜",
    h: "𝙝",
    i: "𝙞",
    j: "𝙟",
    k: "𝙠",
    l: "𝙡",
    m: "𝙢",
    n: "𝙣",
    o: "𝙤",
    p: "𝙥",
    q: "𝙦",
    r: "𝙧",
    s: "𝙨",
    t: "𝙩",
    u: "𝙪",
    v: "𝙫",
    w: "𝙬",
    x: "𝙭",
    y: "𝙮",
    z: "𝙯",
  },
  {
    a: "𝘢",
    b: "𝘣",
    c: "𝘤",
    d: "𝘥",
    e: "𝘦",
    f: "𝘧",
    g: "𝘨",
    h: "𝘩",
    i: "𝘪",
    j: "𝘫",
    k: "𝘬",
    l: "𝘭",
    m: "𝘮",
    n: "𝘯",
    o: "𝘰",
    p: "𝘱",
    q: "𝘲",
    r: "𝘳",
    s: "𝘴",
    t: "𝘵",
    u: "𝘶",
    v: "𝘷",
    w: "𝘸",
    x: "𝘹",
    y: "𝘺",
    z: "𝘻",
  },
  {
    a: "𝗮",
    b: "𝗯",
    c: "𝗰",
    d: "𝗱",
    e: "𝗲",
    f: "𝗳",
    g: "𝗴",
    h: "𝗵",
    i: "𝗶",
    j: "𝗷",
    k: "𝗸",
    l: "𝗹",
    m: "𝗺",
    n: "𝗻",
    o: "𝗼",
    p: "𝗽",
    q: "𝗾",
    r: "𝗿",
    s: "𝘀",
    t: "𝘁",
    u: "𝘂",
    v: "𝘃",
    w: "𝘄",
    x: "𝘅",
    y: "𝘆",
    z: "𝘇",
  },
  {
    a: "α",
    b: "в",
    c: "¢",
    d: "∂",
    e: "є",
    f: "ƒ",
    g: "ց",
    h: "һ",
    i: "ι",
    j: "ϳ",
    k: "к",
    l: "ℓ",
    m: "м",
    n: "η",
    o: "σ",
    p: "ρ",
    q: "զ",
    r: "г",
    s: "ѕ",
    t: "т",
    u: "υ",
    v: "ν",
    w: "ω",
    x: "χ",
    y: "у",
    z: "զ",
  },
];

function stylizeRandom(text) {
  if (!text) return text;
  const variant =
    FONT_VARIANTS[Math.floor(Math.random() * FONT_VARIANTS.length)];
  return text
    .toLowerCase()
    .split("")
    .map((c) => {
      if (/[a-z]/.test(c)) return variant[c] || c;
      return c;
    })
    .join("");
}

function localGenerate(keyword, count = MAX_RESULTS) {
  const suffixes = [
    "x",
    "z",
    "ix",
    "on",
    "verse",
    "ify",
    "core",
    "prime",
    "nova",
    "edge",
    "lyn",
    "aura",
  ];
  const prefixes = [
    "the",
    "real",
    "mr",
    "ms",
    "pro",
    "dark",
    "neo",
    "ultra",
    "hyper",
    "arch",
  ];
  const results = new Set();

  const base = keyword.replace(/[^a-z0-9]/gi, "").toLowerCase();
  for (let i = 0; i < count * 3 && results.size < count; i++) {
    if (i % 3 === 0) {
      const p = prefixes[Math.floor(Math.random() * prefixes.length)];
      results.add(`${p}${base}`);
    } else if (i % 3 === 1) {
      const s = suffixes[Math.floor(Math.random() * suffixes.length)];
      results.add(`${base}${s}`);
    } else {
      const s1 = suffixes[Math.floor(Math.random() * suffixes.length)];
      const p1 = prefixes[Math.floor(Math.random() * prefixes.length)];
      results.add(`${base}${s1}${Math.floor(Math.random() * 99)}`);
      results.add(`${p1}${base}${Math.floor(Math.random() * 9)}`);
    }
  }
  return Array.from(results).slice(0, count);
}

async function fetchFromRemote(keyword, mode = "instans") {
  try {
    const headers = {
      referer: "https://usernamegenerator.com/",
      "user-agent":
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
    };
    if (mode === "instans") {
      const url = `https://usernamegenerator.com/wk/gamertags/${encodeURIComponent(
        keyword
      )}`;
      const { data } = await axios.get(url, { headers, timeout: 12000 });
      if (Array.isArray(data)) return data.slice(0, MAX_RESULTS);
      if (data && Array.isArray(data.results))
        return data.results.slice(0, MAX_RESULTS);
      if (typeof data === "string") {
        const lines = data
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length) return lines.slice(0, MAX_RESULTS);
      }
    } else {
      const url = `https://usernamegenerator.com/ai/generate/player-names`;
      const { data } = await axios.post(
        url,
        { genre: "fantasy", keywords: keyword },
        { headers, timeout: 12000 }
      );
      if (Array.isArray(data)) return data.slice(0, MAX_RESULTS);
      if (data && Array.isArray(data.results))
        return data.results.slice(0, MAX_RESULTS);
    }
  } catch (e) {}
  return null;
}

function localMixNames(a, b, count = MAX_RESULTS) {
  const clean = (str) =>
    String(str)
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase();
  const A = clean(a);
  const B = clean(b);
  const candidates = new Set();

  candidates.add(A + B);
  candidates.add(B + A);
  candidates.add(
    A.slice(0, Math.ceil(A.length / 2)) + B.slice(Math.floor(B.length / 2))
  );
  candidates.add(
    B.slice(0, Math.ceil(B.length / 2)) + A.slice(Math.floor(A.length / 2))
  );
  candidates.add(A + B.slice(0, 1) + Math.floor(Math.random() * 99));
  candidates.add(B + A.slice(0, 1) + Math.floor(Math.random() * 99));
  const suffixes = [
    "x",
    "on",
    "ix",
    "fy",
    "verse",
    "prime",
    "core",
    "lux",
    "nova",
    "ark",
  ];
  for (let s of suffixes) {
    candidates.add(A + s);
    candidates.add(B + s);
    candidates.add(s + A);
    candidates.add(s + B);
  }
  return Array.from(candidates).slice(0, count);
}

let handler = async (m, { conn, command, text, args }) => {
  const cmd = (command || "").toLowerCase();
  try {
    if (cmd === "username") {
      if (!text || !text.trim()) {
        return conn.sendMessage(
          m.chat,
          { text: `⚠️ Masukkan keyword!\nContoh: .username rynn` },
          { quoted: m }
        );
      }
      const keyword = text.trim().split(/\s+/)[0];

      let list = await fetchFromRemote(keyword, "instans");
      if (!list || list.length < MAX_RESULTS) {
        list = localGenerate(keyword, MAX_RESULTS);
      }
      if (!list || list.length === 0)
        list = localGenerate(keyword, MAX_RESULTS);

      const styled = list
        .slice(0, MAX_RESULTS)
        .map((u) => stylizeRandomVariant(u));

      const header = `┏━━━❀ Username Generator ❀━━━┓`;
      const footer = `┗━━━━━━━━━━━━━━━━━━━━━━━━┛\n© Powered by afkhid-esm`;
      let body = `✨ *Keyword:* ${keyword}\n🔹 *Style:* Aesthetic Clean (randomized)\n🔹 *Total:* ${styled.length}\n\n`;
      styled.forEach((u, i) => {
        body += `• ${i + 1}. ${u}\n`;
      });

      const out = `${header}\n${body}\n${footer}`;
      return conn.sendMessage(m.chat, { text: out }, { quoted: m });
    }

    if (cmd === "usermix") {
      if (!args || args.length < 2) {
        return conn.sendMessage(
          m.chat,
          {
            text: `⚠️ Gunakan: .usermix <name1> <name2>\nContoh: .usermix affan kairi`,
          },
          { quoted: m }
        );
      }
      const name1 = args[0];
      const name2 = args[1];

      // try remote mix first
      let list = null;
      try {
        const res = await axios.get(
          `https://usernamegenerator.com/wk/mix-words/${encodeURIComponent(
            name1
          )}-${encodeURIComponent(name2)}`,
          {
            headers: {
              referer: "https://usernamegenerator.com/",
              "user-agent": "Mozilla/5.0",
            },
            timeout: 10000,
          }
        );
        if (res && res.data) {
          if (Array.isArray(res.data)) list = res.data.slice(0, MAX_RESULTS);
          else if (typeof res.data === "string")
            list = res.data
              .split(/\r?\n/)
              .map((l) => l.trim())
              .filter(Boolean)
              .slice(0, MAX_RESULTS);
        }
      } catch (e) {}

      if (!list || list.length < 1) {
        list = localMixNames(name1, name2, MAX_RESULTS);
      }

      const styled = list.map((u) => stylizeRandomVariant(u));

      const header = `┏━━━❀ Username Mixer ❀━━━┓`;
      const footer = `┗━━━━━━━━━━━━━━━━━━━━━━━━┛\n© Powered by afkhid-esm`;
      let body = `✨ *Nama:* ${name1} + ${name2}\n🔹 *Total:* ${styled.length}\n\n`;
      styled.forEach((u, i) => {
        body += `• ${i + 1}. ${u}\n`;
      });

      const out = `${header}\n${body}\n${footer}`;
      return conn.sendMessage(m.chat, { text: out }, { quoted: m });
    }

    return conn.sendMessage(
      m.chat,
      { text: `⚠️ Command tidak dikenali pada plugin ini.` },
      { quoted: m }
    );
  } catch (err) {
    console.error(err);
    return conn.sendMessage(
      m.chat,
      { text: `❌ Terjadi kesalahan: ${err.message || err}` },
      { quoted: m }
    );
  }
};

function stylizeRandomVariant(name) {
  const pick = Math.floor(Math.random() * 4);
  const base = name.replace(/[^a-z0-9]/gi, "");
  let r = "";
  switch (pick) {
    case 0:
      r = stylizeRandom(base);
      break;
    case 1:
      r =
        stylizeRandom(base) +
        (Math.random() > 0.6 ? String.fromCharCode(0x1f49c) : "");
      break;
    case 2:
      r =
        stylizeRandom(base.replace(/(.)/g, "$1")) +
        (Math.random() > 0.7 ? Math.floor(Math.random() * 99) : "");
      break;
    default:
      r = stylizeRandom(base).replace(
        /[aiou]/g,
        (c) => c + String.fromCharCode(0x2032)
      );
      break;
  }
  return r;
}

handler.help = ["username <keyword>", "usermix <name1> <name2>"];
handler.tags = ["tools"];
handler.command = /^(username|usermix)$/i;

export default handler;
