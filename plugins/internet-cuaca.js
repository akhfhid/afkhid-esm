import axios from 'axios';

const handler = async (m, { conn, usedPrefix, text }) => {
  const city = text?.trim() || 'Cianjur'; 
  await conn.sendMessage(
    m.chat,
    { text: `⏳ Mengambil prakiraan cuaca *${text}*…` },
    { quoted: m }
  );

  try {
    const { data } = await axios.get(
      'https://api.nekolabs.my.id/discovery/accuweather/forecast-10day',
      { params: { city }, timeout: 15_000 }
    );
    if (!data.success) throw new Error(data.message || 'Gagal load cuaca');

    const { location, forecastData } = data.result;
    const lines = [
      `🌍 *${location.name}, ${location.country}*`,
      `📌 ${forecastData.Text}\n`,
    ];

    forecastData.DailyForecasts.forEach((f) => {
      const d = new Date(f.Date);
      const day = d.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
      lines.push(
        [
          `┏━ ${day}`,
          `┃ 🌡️  ${f.Temperature.Min}°C – ${f.Temperature.Max}°C`,
          `┃ ☁️  ${f.Day.IconPhrase}`,
          `┃ 💧  Hujan ${f.Day.PrecipitationProbability}% | Petir ${f.Day.ThunderstormProbability}%`,
          `┃ 🌬️  ${f.Day.Wind.Speed} km/h ${f.Day.Wind.Direction}`,
          `┃ ☀️  ${f.HoursOfSun} jam`,
          `┃ 🌫️  UV: ${f.AirAndPollen.UVIndex}`,
          `┗━ https://accuweather.com`,
        ].join('\n')
      );
    });

    lines.push('\n© afkhid-esm');
    await conn.sendMessage(m.chat, { text: lines.join('\n') }, { quoted: m });
  } catch (e) {
    await conn.sendMessage(
      m.chat,
      { text: `❌ ${e.message || 'Gagal memuat prakiraan cuaca.'}` },
      { quoted: m }
    );
  }
};

handler.help = ['cuaca <kota>'];
handler.tags = ['info'];
handler.command = /^cuaca$/i;
export default handler;