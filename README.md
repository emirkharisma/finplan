# FamFinance — Emir & Mayang 👨‍👩‍👧

PWA keuangan keluarga dengan Supabase backend. Light mode, modern dashboard style.

---

## 📁 Struktur File

```
famfinance/
├── index.html          ← Shell utama (sidebar + topbar)
├── manifest.json       ← PWA manifest
├── sw.js               ← Service worker (offline support)
├── css/
│   └── main.css        ← Semua styling
├── js/
│   ├── utils.js        ← Helper functions, kategori, formatting
│   ├── supabase.js     ← Supabase client + DB helpers + SQL schema
│   ├── charts.js       ← Chart.js wrappers
│   └── app.js          ← App logic, routing, page renderers
└── README.md
```

---

## 🚀 Setup (10 menit)

### Step 1 — Buat Supabase Project

1. Buka **https://supabase.com** → New Project
2. Isi nama project: `famfinance`, pilih region terdekat (Singapore)
3. Catat **Project URL** dan **anon/public key** dari:
   `Settings → API → Project URL & anon key`

### Step 2 — Buat Database Tables

1. Di Supabase dashboard → **SQL Editor** → New Query
2. Copy-paste SQL schema dari komentar di `js/supabase.js` (bagian atas file)
3. Klik **Run**

### Step 3 — Sambungkan ke App

Buka `js/supabase.js`, ganti baris ini:

```js
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

Contoh:
```js
const SUPABASE_URL = 'https://abcdefghij.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### Step 4 — Jalankan Lokal

Butuh local server (bukan buka file:// langsung) karena PWA & ES modules.

**Opsi A — Python (paling mudah):**
```bash
cd famfinance
python3 -m http.server 3000
# Buka http://localhost:3000
```

**Opsi B — Node.js:**
```bash
npx serve famfinance -p 3000
```

**Opsi C — VS Code Live Server:**
Klik kanan `index.html` → Open with Live Server

---

## 🌐 Deploy ke Netlify (gratis, sync antar device)

1. Buat akun di **https://netlify.com**
2. Drag & drop folder `famfinance/` ke Netlify dashboard
3. Done! Dapat URL seperti `https://famfinance-emir.netlify.app`
4. Install sebagai PWA: buka di Chrome/Safari → "Add to Home Screen"

### Setup HTTPS untuk PWA icons
Buat folder `icons/` dan tambahkan:
- `icons/icon-192.png` (192×192 px)
- `icons/icon-512.png` (512×512 px)

Bisa generate di: https://realfavicongenerator.net

---

## 📱 Install sebagai PWA

### Android (Chrome):
1. Buka URL di Chrome
2. Tap menu ⋮ → "Add to Home Screen"

### iOS (Safari):
1. Buka URL di Safari
2. Tap Share → "Add to Home Screen"

---

## 🗺 Fitur

| Halaman | Deskripsi |
|---------|-----------|
| **Dashboard Keluarga** | Ringkasan gabungan: total income, pengeluaran, surplus, kontribusi |
| **Keuangan Emir** | Income, pengeluaran per kategori, donut chart, budget vs aktual |
| **Keuangan Mayang** | Sama seperti Emir, kategori berbeda (kecantikan, anak, dll) |
| **Input Data** | Input income bulanan, kontribusi keluarga, tambah/hapus pengeluaran |
| **Budget vs Aktual** | Set target budget per kategori, lihat progress, warning merah jika over |
| **Tren & Analisis** | Chart 6 bulan: income trend, pengeluaran per orang, tren tabungan |

---

## 📊 Kategori Default

**Emir:** Makan & Groceries, Transport, Belanja Online, Hiburan, Kesehatan, Pendidikan, Investasi

**Mayang:** Makan & Groceries, Belanja & Fashion, Kecantikan, Kebutuhan Anak, Kesehatan, Transport, Investasi

**Keluarga:** Listrik (PLN), Gas & Air, Sampah, Internet, Groceries Rumah, Pendidikan Anak, Kesehatan Keluarga, Hiburan Keluarga

---

## 🔧 Customisasi

Edit `js/utils.js` untuk ubah kategori:
```js
const CATEGORIES_EMIR = [
  { key: 'makan', label: 'Makan & Groceries', color: '#2563eb', icon: '🛒' },
  // tambah/ubah di sini...
];
```

---

## 🔐 Keamanan (opsional, nanti)

Saat ini pakai policy "allow all" untuk kemudahan setup.
Untuk production, tambahkan Supabase Auth:
1. Supabase → Authentication → Enable Email provider
2. Buat user untuk Emir & Mayang
3. Update RLS policies di SQL

---

## 💡 Tips

- **Bulan lalu?** Pakai tombol `←` di topbar untuk navigasi bulan
- **Data tidak muncul?** Pastikan Supabase URL & key sudah benar
- **Offline?** PWA cache halaman saat online; data butuh koneksi ke Supabase
