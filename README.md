# Project Cost Monitoring & Invoice Reconciliation Automation

[Studi kasus lengkap](https://briannaufal211.github.io/personal-portfolio/project-cost-monitoring.html) · [Laporan manajerial PDF](https://briannaufal211.github.io/personal-portfolio/assets/project-cost/Laporan-Manajerial.pdf) · [Panduan Excel PDF](https://briannaufal211.github.io/personal-portfolio/assets/project-cost/Panduan-Excel.pdf)

[Demo dashboard tanpa login](https://briannaufal211.github.io/personal-portfolio/assets/project-cost/demo/) · [Video dengan narasi bahasa Inggris](https://briannaufal211.github.io/personal-portfolio/project-cost-monitoring.html#demo) · [Bukti visual Power Query](https://briannaufal211.github.io/personal-portfolio/project-cost-monitoring.html#power-query)

Demo publik memakai transaksi fiktif. Coba konfirmasi bon Rp48.000 dan catat pembayaran contoh untuk melihat perubahan status INV-DEMO-06.

## Ringkasan eksekutif

Project Cost Monitoring & Invoice Reconciliation Automation adalah studi kasus independen untuk membantu Finance melihat tagihan, pembayaran, dan selisih dalam satu alur. Proyek terinspirasi kebutuhan bisnis yang dibahas dalam interview; bukan implementasi resmi perusahaan atau penggunaan data internal perusahaan. Dashboard dan aplikasi unggah bon sudah online. Data publik diperkaya untuk konteks biaya konstruksi.

## Masalah dan tujuan

Rekap periodik menyulitkan manajemen melihat pengeluaran yang baru terjadi. Membandingkan setiap transaksi secara manual juga menyulitkan penelusuran pembayaran cicilan dan pembayaran beberapa tagihan sekaligus. Tujuan proyek: mengulang proses impor dan pembersihan secara konsisten, mencocokkan tagihan dengan pembayaran, menampilkan pengecualian, serta mempercepat akses ke informasi yang sudah dicatat. Proyek belum mengukur penghematan waktu operasional perusahaan.

## Data dan pengayaan

Sumber awal adalah Finance Invoice Matching dari TheAgentCompany: 500 tagihan dan 486 pembayaran. Pola ID dan hubungan pembayaran berasal dari sumber publik. Kategori konstruksi, proyek A/B/C, deskripsi pembelian, kuantitas, satuan, harga IDR, serta nominal yang disesuaikan adalah pengayaan untuk studi kasus. Angka tersebut bukan kurs konversi atau bukti transaksi perusahaan. Foto struk contoh berasal dari CORD, NAVER CLOVA, berlisensi CC BY 4.0; pengguna memeriksa total sebelum menyimpannya. CORD tidak menyediakan pasangan pembayaran untuk seluruh invoice dataset.

## Kontribusi dan bantuan AI

Brian Naufal mengerjakan tahapan Excel dengan panduan, menguji perubahan sumber melalui Refresh, meninjau hasil pencocokan, mencoba unggah bon, dan menentukan kebutuhan aplikasi serta dashboard. AI membantu penyusunan kode Python/JavaScript, desain, debugging, pengujian, dan dokumentasi. Proyek tidak mengklaim bahwa seluruh kode ditulis mandiri atau model OCR dilatih dari awal. Keputusan penting: pembayaran dipisahkan dari tagihan, hasil OCR harus dikonfirmasi, dan pembayaran gabungan dihitung sekali.

## Tahap Excel: impor dan pembersihan

Di Monitoring Rekonsiliasi, Power Query membaca file invoices.xlsx dan payments-uji.xlsx melalui langkah Source. Tipe ID ditetapkan sebagai teks, tanggal sebagai tanggal, dan Amount sebagai angka. Trim membersihkan spasi awal/akhir referensi. Query sumber disimpan sebagai connection only; query laporan dimuat ke tabel. Reference membuat query turunan yang mengikuti hasil query sebelumnya. Duplicate menyalin rangkaian langkah sebagai query terpisah.

## Tahap Excel: tiga pola pencocokan

Langsung: Merge Invoice_ID dengan Reference untuk satu tagihan dan satu pembayaran. Cicilan: bersihkan penanda Partial/Remaining, Group By per invoice, jumlahkan pembayaran, lalu Merge dengan nominal tagihan. Gabungan: pecah Reference menjadi baris invoice, ambil nominal tagihan melalui Merge, lalu Group By pada Payment_ID. Nominal pembayaran gabungan diambil sekali per pembayaran, tidak dijumlahkan ulang setelah pemecahan referensi. Selisih = tagihan dikurangi pembayaran.

## Tahap Excel: laporan dan kontrol

Samakan nama kolom menjadi ID_Kasus, Nominal_Tagihan, Nominal_Bayar, Selisih, Status, Jenis, dan Daftar_Tagihan. Append menyatukan ketiga laporan. ID_Kasus memakai invoice untuk langsung/cicilan dan payment untuk gabungan. PivotTable menghitung kasus per status dan jenis; jumlah kasus tidak sama dengan jumlah invoice. Setelah sumber disimpan, Refresh All menjalankan ulang query; PivotTable mungkin perlu Refresh setelah query selesai. Periksa total, ID ganda, referensi tanpa pasangan, dan kelengkapan invoice sebelum menggunakan hasil.

## Alur online dan peran setiap alat

Foto bon → OCR Tesseract.js di browser → pemeriksaan pengguna → konfirmasi simpan → Google Sheets Tagihan dan foto privat di Supabase. Pembayaran dicatat terpisah pada Google Sheets Pembayaran dengan Reference yang menunjuk invoice. Fungsi server Supabase membaca kedua sumber, menghitung hubungan rekonsiliasi, lalu mengirim hasil ke dashboard HTML/CSS/JavaScript di GitHub Pages. Monitoring Google Sheets menyediakan konteks kategori/keterangan. GitHub Pages menayangkan tampilan; fungsi server dijalankan Supabase.

## Arti live dan perbedaan dengan Excel

Dashboard memeriksa data setiap sekitar 15 detik selama halaman terbuka; server menggunakan cache singkat dan pembaruan tetap bergantung jaringan serta respons Google Sheets. Ini polling, bukan jaminan pembaruan seketika. Excel lokal tidak otomatis tersinkron dengan Google Sheets. Power Query yang diimpor ke Sheets tidak berubah menjadi mesin query online. Hasil rekonsiliasi online dihitung server dan tidak otomatis ditulis kembali ke tab Monitoring Sheets.

## Snapshot hasil: 26 November 2026

Pemeriksaan pukul 22.13 WIB: 502 tagihan, 452 kasus, 432 Cocok, 19 Beda nominal, 1 Belum ada pembayaran, dan 0 Periksa referensi. Total tagihan Rp3.250.455.000; pembayaran tercatat Rp3.248.896.000. Selisih agregat keduanya Rp1.559.000 mencakup tagihan tanpa pembayaran dan perbedaan positif/negatif; angka ini bukan bukti kerugian, fraud, atau saldo utang yang telah diaudit. Angka dashboard dapat berubah ketika sumber diperbarui.

## Contoh transaksi yang dapat ditelusuri

**CORD** adalah kumpulan foto struk toko dan restoran di Indonesia yang dipublikasikan oleh NAVER CLOVA untuk riset. Foto struk dilengkapi penanda untuk bagian seperti nama barang, pajak, dan total. Proyek ini mengambil satu foto struk bakso bihun dari koleksi tersebut sebagai contoh uji. [Dataset CORD](https://github.com/clovaai/cord) · [Foto struk contoh](https://briannaufal211.github.io/bon-proyek-dashboard/unggah/sample.jpg)

Saat operator memilih **Gunakan contoh CORD**, aplikasi online membaca tulisan pada foto dengan **Tesseract.js**. Proses ini disebut **OCR**. Aplikasi mengusulkan **Rp48.000** dari baris *Grand Total* sebagai nominal tagihan. Angka tunai Rp50.000 adalah uang yang diserahkan ke kasir, sedangkan Rp2.000 adalah kembalian. Operator memeriksa hasilnya sebelum menyimpan.

Pengguna telah menyimpannya sebagai INV0501 dengan keterangan konsumsi tim Proyek A dan kategori Lainnya. Pembacaan terbaru menemukan invoice Rp48.000 dan status Belum ada pembayaran. Ini berarti belum ditemukan catatan pembayaran dalam sumber, bukan bukti bahwa barang belum dibayar. Jika pembayaran sebenarnya telah dilakukan, operator mencatat Payment_ID unik, tanggal, Amount, dan Reference INV0501 setelah memeriksa bukti.

## Cara direktur memakai dashboard

1. Buka tautan dashboard dan masuk menggunakan kode yang diberikan privat. 2. Periksa indikator koneksi dan waktu Data diperiksa. 3. Pilih proyek, kategori, dan rentang tanggal tagihan. 4. Baca nominal tagihan, pembayaran tercatat, Perlu diperiksa, dan Belum ada pembayaran. 5. Lihat tren dan kategori terbesar. 6. Pada daftar, pilih Perlu tindak lanjut lalu cari ID invoice. 7. Minta Finance memeriksa bukti dan memperbaiki sumber bila ada kesalahan. 8. Tunggu pembaruan dan pastikan status serta nominal sesuai. Reset filter mengembalikan cakupan laporan.

## Cara membaca filter dan angka

Tanggal filter mengikuti tanggal tagihan, bukan tanggal arus kas bank. Satu kasus gabungan dapat mencakup invoice lintas kategori/proyek/periode. Daftar dapat menampilkan kasus yang bersinggungan dengan filter, sedangkan kartu pembayaran hanya menghitung kasus yang seluruh invoice-nya termasuk cakupan filter. Perhatikan catatan Pembayaran lintas filter hanya tampil di daftar. Grafik kategori tetap memberikan konteks kategori pada proyek/periode yang dipilih. Pencarian menyaring daftar kasus, bukan seluruh kartu ringkasan.

## Arti status dan tindak lanjut

Cocok: referensi dan nominal sesuai aturan; bukan persetujuan keabsahan pembelian. Beda nominal: bandingkan bukti invoice dan pembayaran, termasuk diskon, pajak, cicilan, biaya atau salah input. Selisih positif berarti tagihan lebih besar; negatif berarti pembayaran lebih besar. Belum ada pembayaran: cek apakah pembayaran belum dicatat, belum dilakukan, atau salah referensi. Periksa referensi: telusuri ID yang tidak ditemukan atau hubungan sumber yang bermasalah. Jangan mengubah angka hanya agar status menjadi Cocok.

## Prioritas tindak lanjut manajemen

Snapshot menunjukkan subkontrak pekerjaan Rp1.192.145.000 sebagai kategori tagihan terbesar, diikuti sewa alat Rp428.580.000. Ini menunjukkan area yang layak ditinjau volumenya, bukan pemborosan. Contoh INV0003: tagihan Rp2.900.000, pembayaran Rp1.732.000, selisih Rp1.168.000. Finance perlu memeriksa apakah pembayaran parsial, salah input, atau ada dokumen pendukung lain. Operator memeriksa INV0501 yang belum punya catatan pembayaran. Penanggung jawab dan tenggat dapat dikelola dalam daftar tindak lanjut terpisah; fitur penugasan belum tersedia di aplikasi.

## Bukti pengujian dan batas kesimpulan

Pada 26 November 2026, pengujian otomatis lokal lulus untuk rekonsiliasi terhadap fixture, parsing total, validasi, pencegahan simpan ganda untuk ID unggahan yang sama, pemulihan simpan yang belum pasti, akses sesi, kedaluwarsa, dan logout. Fixture dashboard berisi 501 invoice/451 kasus, berbeda dari snapshot online terbaru 502/452. Pembacaan Google Sheets dan tampilan dashboard terbaru sesuai. Uji OCR contoh membaca Rp48.000; hasil satu contoh tidak menunjukkan akurasi semua jenis bon. Tidak ada invoice baru yang dibuat oleh pemeriksaan dokumentasi ini.

## Batas proyek dan pengembangan berikutnya

OCR tetap perlu verifikasi manusia. Tanggal, proyek, kategori, dan keterangan memerlukan input atau pemeriksaan operator. Sistem tidak menjalankan transfer bank, persetujuan pengeluaran, pembukuan resmi, atau deteksi fraud. Belum ada anggaran versus aktual, komitmen pembelian, kontrol BBM berbasis volume/jam alat, maupun pengukuran SLA H+1. Kode pengelola dan dashboard saat ini sama sesuai pilihan pemilik; ini bukan pemisahan peran. Akses privat perlu diberikan terbatas. Pengembangan berikutnya: akun/peran terpisah, pencatatan keputusan review, uji banyak jenis bon, dan anggaran proyek.

## Tools dan komponen

Excel dan Power Query: pengolahan awal, rekonsiliasi, kontrol, PivotTable. Google Sheets: sumber online. HTML/CSS/JavaScript: dashboard dan aplikasi. Tesseract.js: OCR versi online. Supabase: fungsi server, sesi akses, ledger unggahan, penyimpanan foto privat. GitHub Pages: hosting tampilan. Python dan PP-OCRv5 digunakan pada prototipe lokal sebelumnya; bukan mesin OCR browser yang sekarang dipublikasikan.

## Sumber dan tautan

Portfolio: https://briannaufal211.github.io/personal-portfolio/project-cost-monitoring.html | Dashboard: https://briannaufal211.github.io/bon-proyek-dashboard/ | Unggah bon: https://briannaufal211.github.io/bon-proyek-dashboard/unggah/ | Repository: https://github.com/briannaufal211/bon-proyek-dashboard | Finance Invoice Matching: https://github.com/TheAgentCompany/TheAgentCompany/tree/main/workspaces/tasks/finance-invoice-matching | CORD: https://github.com/clovaai/cord | Lisensi CORD: https://creativecommons.org/licenses/by/4.0/
