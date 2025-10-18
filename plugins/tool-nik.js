import fs from "fs";

// Baca data wilayah (provinsi, kabkot, kecamatan)
const data = JSON.parse(fs.readFileSync("./data.json", "utf-8"));

/* ---------------- helper date / math ---------------- */

// Hitung Julian Day Number untuk tanggal Gregorian (Y, M, D)
const julianDayNumber = (y, m, d) => {
  // sumber formula JDN (integers)
  const a = Math.floor((14 - m) / 12);
  const y2 = y + 4800 - a;
  const m2 = m + 12 * a - 3;
  const jdn =
    d +
    Math.floor((153 * m2 + 2) / 5) +
    365 * y2 +
    Math.floor(y2 / 4) -
    Math.floor(y2 / 100) +
    Math.floor(y2 / 400) -
    32045;
  return jdn;
};

// Fungsi hitung usia detail dan total hari hidup
const calculateAgeDetail = (birthY, birthM, birthD) => {
  const birth = new Date(birthY, birthM - 1, birthD);
  const today = new Date();

  // total hari hidup
  const oneDay = 24 * 60 * 60 * 1000;
  const totalDays = Math.floor((today - birth) / oneDay);

  // hitung tahun, bulan, hari
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();

  if (days < 0) {
    // pinjam satu bulan
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0); // last day of previous month
    days += prevMonth.getDate();
    months--;
  }
  if (months < 0) {
    months += 12;
    years--;
  }

  return {
    years,
    months,
    days,
    totalDays,
  };
};

// Zodiak Barat berdasarkan tanggal dan bulan
const getZodiac = (day, month) => {
  // month: 1-12
  if ((month == 1 && day >= 20) || (month == 2 && day <= 18)) return "Aquarius";
  if ((month == 2 && day >= 19) || (month == 3 && day <= 20)) return "Pisces";
  if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) return "Aries";
  if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) return "Taurus";
  if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) return "Gemini";
  if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) return "Cancer";
  if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) return "Leo";
  if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) return "Virgo";
  if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) return "Libra";
  if ((month == 10 && day >= 23) || (month == 11 && day <= 21))
    return "Scorpio";
  if ((month == 11 && day >= 22) || (month == 12 && day <= 21))
    return "Sagittarius";
  if ((month == 12 && day >= 22) || (month == 1 && day <= 19))
    return "Capricorn";
  return "Tidak Diketahui";
};

// Nama hari dalam bahasa Indonesia (0 = Minggu)
const hariIndonesia = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

// Pasaran Jawa mapping (dari JDN)
const pasaranFromJDN = (jdn) => {
  // kita gunakan (jdn + 1) % 5 mapping ke [Legi,Pahing,Pon,Wage,Kliwon]
  const map = ["Legi", "Pahing", "Pon", "Wage", "Kliwon"];
  return map[(jdn + 1) % 5];
};

// Nama lengkap weton (gabungan hari + pasaran)
const wetonName = (weekdayIndex, pasaran) => {
  // weekdayIndex: 0..6 (Sun..Sat)
  return `${hariIndonesia[weekdayIndex]} ${pasaran}`;
};

/* ---------------- NIK parsing & validasi ---------------- */

const isNumeric = (s) => /^[0-9]+$/.test(s);

const validateNIK = (nik) => {
  if (!nik) return { ok: false, reason: "NIK kosong" };
  if (typeof nik !== "string") nik = String(nik);
  if (!/^\d{16}$/.test(nik))
    return { ok: false, reason: "NIK harus 16 digit angka yang valid!" };
  return { ok: true };
};

const nikParser = (nik) => {
  // Validasi awal
  const v = validateNIK(nik);
  if (!v.ok) throw new Error(v.reason);

  // ambil kode wilayah
  const provCode = nik.slice(0, 2);
  const kabCode = nik.slice(0, 4);
  const kecCode = nik.slice(0, 6);

  // ambil bagian tanggal/bulan/tahun pada NIK
  // posisi: 7-8 = tanggal (dd) ; 9-10 = bulan (mm); 11-12 = tahun (yy)
  const rawDay = parseInt(nik.slice(6, 8), 10); // bisa >= 40 untuk perempuan
  const day = rawDay > 40 ? rawDay - 40 : rawDay;
  const month = parseInt(nik.slice(8, 10), 10);
  const yearTwo = parseInt(nik.slice(10, 12), 10);

  // tentukan tahun penuh
  const fullYear = yearTwo > 30 ? 1900 + yearTwo : 2000 + yearTwo;

  // Validasi tanggal dasar
  const suspiciousReasons = [];
  if (!(day >= 1 && day <= 31))
    suspiciousReasons.push("Tanggal lahir tidak wajar");
  if (!(month >= 1 && month <= 12))
    suspiciousReasons.push("Bulan lahir tidak wajar");
  // cek konsistensi tanggal (mis: 31 Feb)
  const testDate = new Date(fullYear, month - 1, day);
  if (
    testDate.getFullYear() !== fullYear ||
    testDate.getMonth() !== month - 1 ||
    testDate.getDate() !== day
  ) {
    suspiciousReasons.push("Tanggal lahir tidak valid (konflik kalender)");
  }

  // mapping wilayah
  const provName = data.provinsi[provCode] || null;
  const kabName = data.kabkot[kabCode] || null;
  const kecName = data.kecamatan[kecCode] || null;

  if (!provName || !kabName || !kecName)
    suspiciousReasons.push(
      "Kode wilayah pada NIK tidak lengkap/terdeteksi tidak wajar"
    );

  // Hitung usia detail
  const age = calculateAgeDetail(fullYear, month, day);
  const usiaFormatted = `${age.years} tahun ${age.months} bulan ${age.days} hari`;

  // total hari hidup
  const totalDays = age.totalDays;

  // gender
  const kelamin = rawDay > 40 ? "Perempuan" : "Laki-laki";

  // Hari lahir (nama hari) menggunakan objek Date
  const birthDateObj = new Date(fullYear, month - 1, day);
  const weekdayIndex = birthDateObj.getDay(); // 0..6
  const hariLahir = hariIndonesia[weekdayIndex];

  // zodiak
  const zodiak = getZodiac(day, month);

  // weton: hitung JDN lalu pasaran
  const jdn = julianDayNumber(fullYear, month, day);
  const pasaran = pasaranFromJDN(jdn);
  const weton = wetonName(weekdayIndex, pasaran);

  // nomor urut (6 digit posisi 7..12)
  const nomorUrut = nik.slice(6, 12);

  // Indikasi NIK palsu? jika suspiciousReasons ada
  const indikasiPalsu = suspiciousReasons.length > 0;

  return {
    nik,
    kelamin,
    lahir_lengkap: `${String(day).padStart(2, "0")}-${String(month).padStart(
      2,
      "0"
    )}-${fullYear}`,
    provinsi: { kode: provCode, nama: provName || "Tidak Diketahui" },
    kotakab: { kode: kabCode, nama: kabName || "Tidak Diketahui" },
    kecamatan: { kode: kecCode, nama: kecName || "Tidak Diketahui" },
    kode_wilayah: kabCode,
    nomor_urut: nomorUrut,
    tambahan: {
      usia: `${usiaFormatted} (${totalDays} hari)`,
      kategori_usia:
        age.years < 18 ? "Remaja" : age.years < 60 ? "Dewasa" : "Lansia",
      ultah: `${String(day).padStart(2, "0")}-${String(month).padStart(
        2,
        "0"
      )}`,
      zodiak,
      pasaran,
      hari_lahir: hariLahir,
      weton,
    },
    indikasi_palsu: indikasiPalsu,
    suspiciousReasons,
  };
};

/* ---------------- WhatsApp handler (export) ---------------- */

let handler = async (m, { conn, usedPrefix, text }) => {
  // Validasi input ada atau tidak
  if (!text) {
    await conn.sendMessage(
      m.chat,
      { text: `*Contoh:* ${usedPrefix}nik 3201011508050002` },
      { quoted: m }
    );
    return;
  }

  // Jangan tampilkan NIK asli user di contoh -> user memberikan NIK sendiri
  await conn.sendMessage(
    m.chat,
    { text: "🔍 Memproses NIK..." },
    { quoted: m }
  );

  try {
    // parse
    const result = nikParser(text);

    // susunan output WhatsApp Clean Style (Format 2)
    const captionLines = [
      "┏━━━ INFO NIK ━━━",
      `┃ NIK: ${result.nik}`,
      `┃ Kelamin: ${result.kelamin}`,
      `┃ Tgl Lahir: ${formatTanggalLong(result.lahir_lengkap)}`,
      `┃ Usia: ${result.tambahan.usia}`,
      `┃ Hari Lahir: ${result.tambahan.hari_lahir}`,
      `┃ Zodiak: ${result.tambahan.zodiak}`,
      `┃ Weton: ${result.tambahan.weton}`,
      `┃ Provinsi: ${result.provinsi.nama}`,
      `┃ Kab/Kota: ${result.kotakab.nama}`,
      `┃ Kecamatan: ${result.kecamatan.nama}`,
      `┃ Kode Wilayah: ${result.kode_wilayah}`,
      `┃ Nomor Urut: ${result.nomor_urut}`,
    ];

    if (result.indikasi_palsu) {
      captionLines.push(
        `┃ ⚠️ Indikasi NIK tidak wajar: ${result.suspiciousReasons.join("; ")}`
      );
    }

    captionLines.push("┗━━━━━━━━━━━━━━");

    const caption = captionLines.join("\n");

    await conn.sendMessage(m.chat, { text: caption }, { quoted: m });
  } catch (e) {
    // Error standar seperti validasi NIK
    await conn.sendMessage(m.chat, { text: "❌ " + e.message }, { quoted: m });
  }
};

// Formatter tanggal panjang (dari 'dd-mm-yyyy' => 'DD NamaBulan YYYY')
const formatTanggalLong = (dmy) => {
  // dmy: "dd-mm-yyyy"
  const [dd, mm, yyyy] = dmy.split("-");
  const bulan = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  return `${dd} ${bulan[parseInt(mm, 10) - 1]} ${yyyy}`;
};

handler.help = ["nik <16digit>"];
handler.tags = ["tools"];
handler.command = /^nik$/i;

export default handler;
