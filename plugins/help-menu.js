// export const command = ["help", "menu"];
// export const tags = ["main"];

// export async function call(m, { conn }) {
//   let categories = {};

//   // Kategorikan semua plugin aktif
//   for (let name in global.plugins) {
//     let plugin = global.plugins[name];
//     if (!plugin || plugin.disabled) continue;
//     let tag = plugin.tags?.[0] || "Other";
//     if (!categories[tag]) categories[tag] = [];
//     if (plugin.command) {
//       if (Array.isArray(plugin.command))
//         categories[tag].push(...plugin.command);
//       else categories[tag].push(plugin.command);
//     }
//   }

//   // Build message
//   let text = "*📜 Daftar Command*\n\n";
//   for (let cat in categories) {
//     text += `*${cat.toUpperCase()}*\n`;
//     for (let cmd of categories[cat]) text += ` - ${cmd}\n`;
//     text += "\n";
//   }

//   await conn.sendMessage(m.chat, { text }, { quoted: m });
// }
