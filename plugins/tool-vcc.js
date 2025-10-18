import axios from "axios";

const vccgenerator = async (type, num = 10) => {
  const _type = {
    "american-express": "American Express",
    mastercard: "MasterCard",
    visa: "Visa",
    jcb: "JCB",
  };

  if (!Object.keys(_type).includes(type.toLowerCase()))
    throw new Error(`Available types: ${Object.keys(_type).join(", ")}`);
  if (isNaN(num) || num < 1 || num > 10)
    throw new Error("Invalid number. Please enter a number between 1 and 10.");

  const { data } = await axios.get(
    "https://backend.lambdatest.com/api/dev-tools/credit-card-generator",
    {
      headers: {
        "content-type": "application/json",
      },
      params: {
        type: _type[type.toLowerCase()],
        "no-of-cards": num,
      },
    }
  );

  return data;
};

let handler = async (m, { conn, usedPrefix, text }) => {
  const args = text.trim().split(/\s+/);
  const type = args[0];
  const num = args[1] ? parseInt(args[1], 10) : 10;

  if (!type) {
    await conn.sendMessage(
      m.chat,
      {
        text: `*Available types:*\n- american-express\n- mastercard\n- visa\n- jcb\n\n*Contoh:* ${usedPrefix}vcc visa 5`,
      },
      { quoted: m }
    );
    return;
  }

  await conn.sendMessage(m.chat, { text: "Generating VCC..." }, { quoted: m });

  try {
    const data = await vccgenerator(type, num);
    let result = `*VCC*\nType: ${type}\nNumber of Cards: ${num}\n\n`;
    data.forEach((card, index) => {
      result += `*Card ${index + 1}*\n`;
      result += `Name: ${card.name}\n`; 
      result += `Number: ${card.number}\n`;
      result += `CVV: ${card.cvv}\n`;
      result += `Expiration: ${card.expiry}\n`;
      result += `-------------------------\n`;
    });
    await conn.sendMessage(m.chat, { text: result }, { quoted: m });
  } catch (e) {
    await conn.sendMessage(m.chat, { text: "Server sedang sibuk coba lagi nanti " + e.message }, { quoted: m });
  }
};

handler.help = ["vcc <type> <num>"];
handler.tags = ["tools"];
handler.command = /^vcc$/i;

export default handler;
