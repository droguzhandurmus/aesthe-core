# AestheCore — Claude Code Rehberi

## Proje
Türkiye'deki estetik cerrahlar için hasta yönetim platformu. Marka adı: AestheCore.
Kullanıcı: Dr. Oğuzhan Durmuş (plastik cerrah, kodlama bilgisi yok)

## Klasör Yolları
- **Bu uygulama:** /Users/oguzd.md/Desktop/aesthe-core
- **Araştırma ajansı:** /Users/oguzd.md/Desktop/Agentlar/agents/aesthe-core-research/
- **Araştırma çıktıları:** /Users/oguzd.md/Desktop/Agentlar/agents/aesthe-core-research/outputs/

## Teknoloji Stack
- Next.js (App Router) + React 19 + TypeScript
- Supabase (PostgreSQL + Auth + Storage) — project ID: ukvapprhnakpdqjyifzm
- Tailwind CSS v4 + Lucide React
- FullCalendar v6 (randevu takvimi)

## Supabase Tabloları
- `hastalar` — hasta profilleri (id, ad_soyad, telefon, tc_kimlik, dogum_tarihi, cinsiyet, ulke, islem, etiketler, notlar, durum)
- `randevular` — (id, hasta_id, tarih, sure_dk, islem_turu, notlar, durum)
- `finans` — (id, tarih, tur, kategori, aciklama, tutar)
- `ameliyat_notlari` — (id, hasta_id, tarih, islem_adi, notlar, hekim)
- `fotograflar` — (id, hasta_id, tip, url, aciklama)

## Tamamlanan Modüller
- Auth sistemi (Supabase email/şifre + oturum koruması) ✅
- Hasta listesi, yeni hasta ekleme, hasta detay sayfası ✅
- Randevu takvimi (FullCalendar, Google Takvim benzeri haftalık görünüm) ✅
- Finans modülü (gelir/gider kayıtları) ✅

## Bekleyen Modüller
- Before/After galeri (Supabase Storage ile fotoğraf yükleme)
- Dashboard gerçek veri (hardcoded kısımlar var)
- İstatistikler sayfası gerçek Supabase sorguları
- Hasta detay sayfası sekmeleri (fotoğraf, notlar, randevular)

## Kritik Kurallar
- KVKK uyumu — hasta verisi işlendiği için zorunlu
- WhatsApp — Türkiye'de birincil iletişim kanalı
- Türkçe arayüz — tüm UI metinleri Türkçe
- Supabase RLS politikaları aktif — authenticated kullanıcılar tüm tablolarda CRUD yapabilir
