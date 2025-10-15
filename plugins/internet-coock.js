// plugin: cookpad.js  (ES-module, 1 handler)
import axios from "axios";
import cheerio from "cheerio";
import dayjs from "dayjs";

const cookpad = {
  async search(query) {
    if (!query) throw new Error("Query diperlukan");
    const { data } = await axios.get(
      `https://cookpad.com/id/cari/${encodeURIComponent(query)}`,
      { timeout: 15000 }
    );
    const $ = cheerio.load(data);
    const recipes = [];

    $('li[id^="recipe_"]').each((_, el) => {
      const id = $(el).attr("id").replace("recipe_", "");
      const title = $(el).find("a.block-link__main").text().trim();
      const img = $(el).find('picture img[fetchpriority="auto"]').attr("src");
      const auth = $(el)
        .find(".flex.items-center.mt-auto span.text-cookpad-gray-600")
        .text()
        .trim();
      const time =
        $(el).find(".mise-icon-time + .mise-icon-text").text().trim() || null;
      const srv =
        $(el).find(".mise-icon-user + .mise-icon-text").text().trim() || null;
      const ings = (
        $(el)
          .find('[data-ingredients-highlighter-target="ingredients"]')
          .text() || ""
      )
        .split(",")
        .map((s) => s.replace(/\s+/g, " ").trim())
        .filter(Boolean);
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
      title: ld.name || $("h1.break-words").text().trim(),
      author:
        ld.author?.["@type"] === "Person"
          ? {
              name: ld.author.name,
              url: ld.author.url,
              username:
                $('a[href*="/pengguna/"] span[dir="ltr"]')
                  .first()
                  .text()
                  .trim() || null,
            }
          : null,
      imageUrl: ld.image || $('meta[property="og:image"]').attr("content"),
      description:
        ld.description || $('meta[name="description"]').attr("content"),
      servings: ld.recipeYield || null,
      prepTime:
        $('div[id*="cooking_time_recipe_"] span.mise-icon-text')
          .first()
          .text()
          .trim() || null,
      ingredients: ld.recipeIngredient || [],
      steps: (ld.recipeInstructions || []).map((s) => ({
        text: s.text,
        images: s.image || [],
      })),
      datePublished: ld.datePublished
        ? dayjs(ld.datePublished).format("DD/MM/YYYY")
        : null,
      dateModified: ld.dateModified
        ? dayjs(ld.dateModified).format("DD/MM/YYYY")
        : null,
    };
  },
};

let handler = async (m, { conn, usedPrefix, text }) => {
  if (!text) {
    await conn.sendMessage(
      m.chat,
      { text: `*Contoh:* ${usedPrefix}cookpad ayam kecap` },
      { quoted: m }
    );
    return;
  }

  /* ---- mode pencarian ---- */
  if (!text.startsWith("https://")) {
    try {
      const list = await cookpad.search(text);
      if (!list.length) {
        await conn.sendMessage(
          m.chat,
          { text: "🔎 Resep tidak ditemukan." },
          { quoted: m }
        );
        return;
      }
      const teks = list
        .map(
          (r, i) =>
            `*${i + 1}. ${r.title}*\n` +
            `👤 ${r.author}\n` +
            `⏱️ ${r.prepTime || "?"} | 🍽️ ${r.servings || "?"} porsi\n` +
            `📝 Bahan: ${r.ingredients.slice(0, 3).join(", ")}${
              r.ingredients.length > 3 ? "..." : ""
            }\n` +
            `🔗 ${r.url}`
        )
        .join("\n\n");
      await conn.sendMessage(m.chat, { text: teks }, { quoted: m });
    } catch (e) {
      await conn.sendMessage(
        m.chat,
        { text: "❌ " + e.message },
        { quoted: m }
      );
    }
    return;
  }

  /* ---- mode detail ---- */
  try {
    const r = await cookpad.detail(text.trim());
    const cap =
      `*${r.title}*\n\n` +
      `👤 ${r.author?.name || ""}\n` +
      `🍽️ ${r.servings || "?"} porsi | ⏱️ ${r.prepTime || "?"}\n` +
      `📅 Dipublikasikan: ${r.datePublished || "-"}\n\n` +
      `*Bahan-bahan:*\n${r.ingredients.map((i) => `• ${i}`).join("\n")}\n\n` +
      `*Cara membuat:*\n${r.steps
        .map((s, i) => `${i + 1}. ${s.text}`)
        .join("\n")}\n\n` +
      `📖 ${r.url}`;
    await conn.sendMessage(
      m.chat,
      { image: { url: r.imageUrl }, caption: cap },
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
