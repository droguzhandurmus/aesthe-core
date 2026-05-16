-- AestheCore Ayarlar Tabloları
-- Çalıştır: Supabase Dashboard > SQL Editor

-- Klinik Profili
CREATE TABLE IF NOT EXISTS klinik_profil (
  id text PRIMARY KEY DEFAULT 'default',
  klinik_adi text DEFAULT '',
  uzmanlik text DEFAULT '',
  adres text DEFAULT '',
  sehir text DEFAULT '',
  telefon text DEFAULT '',
  email text DEFAULT '',
  website text DEFAULT '',
  instagram text DEFAULT '',
  whatsapp text DEFAULT '',
  vergi_no text DEFAULT '',
  calisma_baslangic text DEFAULT '09:00',
  calisma_bitis text DEFAULT '18:00',
  calisma_gunleri text[] DEFAULT '{}',
  randevu_suresi_dk integer DEFAULT 30,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE klinik_profil ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read klinik_profil"
  ON klinik_profil FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can upsert klinik_profil"
  ON klinik_profil FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Personel
CREATE TABLE IF NOT EXISTS personeller (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_soyad text NOT NULL,
  email text DEFAULT '',
  telefon text DEFAULT '',
  rol text DEFAULT 'Doktor',
  maas numeric DEFAULT 0,
  prim_yuzdesi numeric DEFAULT 0,
  sgk_dahil boolean DEFAULT true,
  is_gunleri text[] DEFAULT '{}',
  is_baslangic text DEFAULT '09:00',
  is_bitis text DEFAULT '18:00',
  yetkiler jsonb DEFAULT '{}',
  aktif boolean DEFAULT true,
  notlar text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE personeller ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage personeller"
  ON personeller FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ödemeler (hasta üzerinden gelir ekleme için)
CREATE TABLE IF NOT EXISTS odemeler (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hasta_id uuid REFERENCES hastalar(id) ON DELETE CASCADE,
  tarih date NOT NULL DEFAULT CURRENT_DATE,
  tutar numeric NOT NULL DEFAULT 0,
  islem_adi text DEFAULT '',
  aciklama text DEFAULT '',
  odeme_yontemi text DEFAULT 'Nakit',
  fatura_no text DEFAULT '',
  finans_id uuid REFERENCES finans(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE odemeler ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage odemeler"
  ON odemeler FOR ALL TO authenticated USING (true) WITH CHECK (true);
