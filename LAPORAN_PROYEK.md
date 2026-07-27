# Laporan Proyek: Cek Wawasan Bela Negara

Laporan ringkas mengenai seluruh alur pengembangan website kuis interaktif Pendidikan Kewarganegaraan (PKN) bertajuk **"Cek Wawasan Bela Negara"** dari Tahap 0 sampai Tahap 6.

---

## 1. Struktur File Final

```text
Wawasan_bela_negara/
├── index.html
├── style.css
├── script.js
├── LAPORAN_PROYEK.md
├── data/
│   └── soal.json
└── assets/
    └── images/
        ├── hero-illustration.svg
        └── result-icon.svg
```

---

## 2. Fitur yang Sudah Diimplementasikan (per tahap)

- **Tahap 0 (Konfirmasi Scope)**: Mengonfirmasi ruang lingkup proyek (Pure HTML/CSS/JS tanpa framework/backend), alur pengembangan 6 tahap, serta menetapkan tema visual Wayang Merah-Emas.  
  `[STATUS: SELESAI]`

- **Tahap 1 (Data Soal JSON)**: Dibuat file `data/soal.json` berisi 16 soal terbagi rata dalam 4 kategori (*Pancasila & Konstitusi*, *Makna Bela Negara*, *Isu Kontemporer*, *Kegiatan Kebangsaan*) lengkap dengan opsi, kunci jawaban, dan penjelasan edukatif.  
  `[STATUS: SELESAI]`

- **Tahap 2 (Halaman Pembuka & Base CSS)**: Dibuat struktur dasar `index.html` dan Design System pada `style.css` menggunakan palet warna merah beludru, emas antik, latar hitam kehangatan, serta font Google (`Cinzel` & `Plus Jakarta Sans`).  
  `[STATUS: SELESAI]`

- **Tahap 3 (Logika Kuis & Transisi)**: Dikembangkan logika interaktif pada `script.js` untuk memuat soal asinkron, transisi layar, *progress bar* dinamis, penguncian opsi, umpan balik warna (hijau/merah), dan penayangan penjelasan edukatif.  
  `[STATUS: SELESAI]`

- **Tahap 4 (Halaman Hasil Akhir)**: Dibuat section hasil akhir yang menampilkan akumulasi skor (`X / 16`), 3 tingkatan kategori pemahaman, rekomendasi belajar statis, breakdown perolehan skor per 4 kategori, dan tombol navigasi *"Coba Lagi"*.  
  `[STATUS: SELESAI]`

- **Tahap 5 (Riwayat localStorage)**: Dibuat fungsi penyimpanan riwayat kuis dan kalkulasi skor tertinggi (*high score*) di `localStorage` browser yang mampu menangani kondisi data kosong (*first attempt*) atau rekor baru secara aman.  
  `[STATUS: SELESAI]`

- **Tahap 6 (Aset SVG & Integrasi Visual)**: Dibuat 2 file ilustrasi SVG independen bertema wayang kulit modern (`hero-illustration.svg` dan `result-icon.svg`) dan diintegrasikan secara responsif di halaman pembuka dan hasil akhir.  
  `[STATUS: SELESAI]`

- **Tahap 7 (Multiplayer Game PIN & Realtime Leaderboard Supabase)**: Dikembangkan fitur *Lobby System* ala Kahoot (Mode B: Self-Paced Room) lengkap dengan generator 6-digit Game PIN untuk Host/Guru, form masuk PIN untuk siswa, *timer* pengerjaan, serta tampilan Podium Top 3 (🥇🥈🥉) & Papan Peringkat Realtime terintegrasi Supabase.  
  `[STATUS: SELESAI]`

---

## 3. Deviasi dari Rencana Awal

- **Penyediaan Aset Ilustrasi**: Pada instruksi awal, folder `assets/` ditujukan untuk gambar yang akan disediakan nanti. Namun pada Tahap 6, ilustrasi dibuat langsung secara programmatic dalam format SVG portabel (`hero-illustration.svg` & `result-icon.svg`) tanpa membutuhkan dependensi file eksternal tambahan.

---

## 4. Isu atau Bug yang Diketahui

1. **Kebijakan CORS Browser saat Membuka File Langsung (`file://`)**:  
   Beberapa browser memperketat keamanan eksekusi `fetch('./data/soal.json')` jika `index.html` dibuka dengan double-click (tanpa web server lokal).
2. **Penggunaan `localStorage` pada Mode Private/Incognito**:  
   Pada mode penyamaran dengan proteksi ketat, penulisan riwayat kuis dapat terhalang oleh aturan privasi browser. Hal ini sudah ditangani dengan penanganan kesalahan (`try...catch`) sehingga kuis tetap berfungsi normal.

---

## 5. Cara Menjalankan/Testing

- **Melalui Local Web Server (Sangat Direkomendasikan)**:  
  Buka terminal/PowerShell di folder proyek, lalu jalankan perintah:
  ```bash
  npx serve .
  ```
  Buka tautan `http://localhost:3000` di browser.
- **Melalui VS Code Live Server**:  
  Klik kanan file `index.html` di VS Code, lalu pilih **"Open with Live Server"**.

---

## 6. Potongan Kode Kunci

### 1. Penilaian Jawaban & Umpan Balik Langsung (`script.js`)
```javascript
function handleSelectOption(selectedIndex) {
  if (isAnswered) return;
  isAnswered = true;
  const q = questionsData[currentQuestionIndex];
  const isCorrect = selectedIndex === q.jawabanBenar;
  const allOptionBtns = optionsContainer.querySelectorAll('.option-btn');

  if (isCorrect) {
    score++;
    categoryScores[q.kategori]++;
    allOptionBtns[selectedIndex].classList.add('correct');
    showExplanation(true, q.penjelasan);
  } else {
    allOptionBtns[selectedIndex].classList.add('wrong');
    allOptionBtns[q.jawabanBenar].classList.add('correct');
    showExplanation(false, q.penjelasan);
  }
  allOptionBtns.forEach(btn => btn.classList.add('disabled'));
  btnNext.classList.remove('hidden');
}
```

### 2. Klasifikasi Pemahaman & Rekomendasi (`script.js`)
```javascript
if (score <= 6) {
  categoryName = 'Perlu Diperdalam Lagi';
  tagClass = 'tag-needs-work';
  recommendation = 'Yuk, luangkan waktu untuk membaca kembali sejarah perjuangan bangsa, konstitusi UUD 1945...';
} else if (score <= 11) {
  categoryName = 'Cukup Paham';
  tagClass = 'tag-good';
  recommendation = 'Pemahamanmu tentang wawasan nusantara dan bela negara sudah cukup baik. Terus tingkatkan...';
} else {
  categoryName = 'Sangat Memahami';
  tagClass = 'tag-excellent';
  recommendation = 'Luar biasa! Kamu memiliki wawasan bela negara dan rasa nasionalisme yang sangat kuat...';
}
```

### 3. Penyimpanan Aman ke `localStorage` (`script.js`)
```javascript
function saveQuizAttempt(score, total, category) {
  try {
    const history = getQuizHistory();
    history.push({
      tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      skor: score,
      total: total,
      kategori: category
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn('Gagal menyimpan ke localStorage:', error);
  }
}
```
