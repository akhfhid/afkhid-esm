// plugin: cookpad.js  (ES-module)
import axios from "axios";
import cheerio from "cheerio";
import dayjs from "dayjs";

const cookpadAPI = {
  async search(query) {
    if (!query) throw new Error("Query diperlukan");
    const { data } = await axios.get(
      `https://cookpad.com/id/cari/${encodeURIComponent(query)}`,
      { timeout: 15000 }
    );
    const $ = cheerio.load(data);
    const recipes = [];

    $('li[id^="recipe_"]').each((_, el) => {
      const id = $(el).attr("id")?.replace("recipe_", "") || null;
      const title = ($(el).find("a.block-link__main").text() || "").trim();
      const img = (
        $(el).find('picture img[fetchpriority="auto"]').attr("src") || ""
      ).trim();
      const auth = (
        $(el).find(".flex.items-center.mt-auto span.text-cookpad-gray-600").text() || ""
      ).trim();
      const time =
        ($(el).find(".mise-icon-time + .mise-icon-text").text() || "").trim() || null;
      const srv =
        ($(el).find(".mise-icon-user + .mise-icon-text").text() || "").trim() || null;

      const raw = (
        $(el).find('[data-ingredients-highlighter-target="ingredients"]').text() || ""
      ).toString();
      const ings = raw
        .split(",")
        .map((s) => s.replace(/\s+/g, " ").trim())
        .filter(Boolean);

      if (!title) return; // skip item kosong
      recipes.push({
        id,
        title,
        imageUrl: img,
        author: auth,
        prepTime: time,
        servings: srv,
        ingredients: ings,
        url: `https://cookpad.com/id/resep/${id}`,
      });
    });
    return recipes;
  },

  async detail(url) {
    if (!url.includes("cookpad.com")) throw new Error("URL tidak valid");
    const { data } = await axios.get(url, { timeout: 15000 });
    const $ = cheerio.load(data);

    const ld = $('script[type="application/ld+json"]')
      .toArray()
      .map((s) => {
        try {
          return JSON.parse($(s).text());
        } catch {
          return null;
        }
      })
      .find((j) => j?.["@type"] === "Recipe");
    if (!ld) throw new Error("Strukturnya gak ketemu");

    return {
      id: ld.url?.split("/").pop() || null,
      title: (ld.name || $("h1.break-words").text() || "").trim(),
      author:
        ld.author?.["@type"] === "Person"
          ? {
              name: (ld.author.name || "").trim(),
              url: ld.author.url,
              username:
                (
                  $('a[href*="/pengguna/"] span[dir="ltr"]').first().text() || ""
                ).trim() || null,
            }
          : null,
      imageUrl: (ld.image || $('meta[property="og:image"]').attr("content") || "").trim(),
      description: (
        ld.description ||
        $('meta[name="description"]').attr("content") ||
        ""
      ).trim(),
      servings: ld.recipeYield || null,
      prepTime:
        (
          $('div[id*="cooking_time_recipe_"] span.mise-icon-text').first().text() || ""
        ).trim() || null,
      ingredients: (ld.recipeIngredient || []).map((i) => (i || "").toString().trim()),
      steps: (ld.recipeInstructions || []).map((s) => ({
        text: (s.text || "").toString(),
        images: s.image || [],
      })),
      datePublished: ld.datePublished
        ? dayjs(ld.datePublished).format("DD/MM/YYYY")
        : null,
      dateModified: ld.dateModified ? dayjs(ld.dateModified).format("DD/MM/YYYY") : null,
    };
  },
};

/* ---------- Handler WhatsApp ---------- */
let handler = async (m, { conn, usedPrefix, text }) => {
  if (!text) {
    await conn.sendMessage(
      m.chat,
      {
        text: `*Contoh:*\n• ${usedPrefix}cookpad ayam kecap\n• ${usedPrefix}cookpad https://cookpad.com/id/resep/12345678`,
      },
      { quoted: m }
    );
    return;
  }

  if (!text.startsWith("https://")) {
    try {
      const list = await cookpadAPI.search(text);
      if (!list.length) {
        await conn.sendMessage(
          m.chat,
          { text: "🔎 Resep tidak ditemukan." },
          { quoted: m }
        );
        return;
      }
      const top10 = list.slice(0, 10); // PASTI 10
      for (const [idx, r] of top10.entries()) {
        const cap =
          // `*${idx + 1} dari 10* • ${r.title}\n\n`
          `*${idx + 1}. ${r.title}*\n\n` +
          `👤 ${r.author}\n` +
          `⏱️ ${r.prepTime || "?"} | 🍽️ ${r.servings || "?"} porsi\n` +
          `📝 Bahan: ${r.ingredients.join(", ")}\n\n` +
          `🔗 ${r.url}`;

        await conn.sendMessage(
          m.chat,
          {
            document: { url: r.imageUrl },
            mimetype: "image/jpeg",
            fileName: `${r.title}.jpg`,
            caption: cap,
          },
          { quoted: m }
        );
      }
    } catch (e) {
      await conn.sendMessage(
        m.chat,
        { text: "❌ " + e.message },
        { quoted: m }
      );
    }
    return;
  }
  try {
    const r = await cookpadAPI.detail(text.trim());

    const head =
      `*${r.title}*\n\n` +
      `👤 ${r.author?.name || ""}\n` +
      `🍽️ ${r.servings || "?"} porsi | ⏱️ ${r.prepTime || "?"}\n` +
      `📅 Dipublikasikan: ${r.datePublished || "-"}\n`;

    const bahan =
      "\n*Bahan-bahan:*\n" + r.ingredients.map((i) => `• ${i}`).join("\n");
    const langkah =
      "\n*Cara membuat:*\n" +
      r.steps.map((s, i) => `${i + 1}. ${s.text}`).join("\n");
    const full = head + bahan + langkah + `\n📖 ${r.url}`;

    const chunk = 3500;
    for (let i = 0; i < full.length; i += chunk) {
      await conn.sendMessage(
        m.chat,
        { text: full.slice(i, i + chunk) },
        { quoted: m }
      );
    }
    await conn.sendMessage(
      m.chat,
      { image: { url: r.imageUrl }, caption: "" },
      { quoted: m }
    );
  } catch (e) {
    await conn.sendMessage(m.chat, { text: "❌ " + e.message }, { quoted: m });
  }
};

handler.help = ["cookpad <pencarian>", "cookpad <url-cookpad>"];
handler.tags = ["internet"];
handler.command = /^cookpad$/i;

export default handler;
