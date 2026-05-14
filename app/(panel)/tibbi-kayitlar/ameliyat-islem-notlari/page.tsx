"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  FileText, Plus, Search, User, LoaderCircle, X, Check,
  Calendar as CalendarIcon, Trash2, BookOpen, ChevronRight,
  Pencil, Stethoscope, Bookmark, BarChart2, SlidersHorizontal,
  Library, ArrowDownUp, ChevronDown, AlertCircle, Star,
} from "lucide-react";
import clsx from "clsx";
import { supabase } from "@/lib/supabaseClient";

// ── Types ─────────────────────────────────────────────────────────────────────

type IslemNotu = {
  id: number;
  hasta_id: number;
  created_at: string;
  baslik: string;
  not: string;
  tur: "Ameliyat" | "Klinik İşlem";
  islem_tarihi: string;
  hastalar?: { id: number; ad_soyad: string };
};

type Patient      = { id: number; ad_soyad: string };
type StructFields = { anestezi: string; sure_dk: string; asa: string; sigara: string; komplikasyon: string };
type NoteTemplate = { id: number; basliklar: string; tur: "Ameliyat" | "Klinik İşlem"; icerik: string; created_at: string };
type EditFields   = { hasta_id: number | null; basliklar: string[]; tur: "Ameliyat" | "Klinik İşlem"; islem_tarihi: string; not: string; sf: StructFields };
type StatPeriod   = "today" | "week" | "month" | "year" | "all";
type SortOrder    = "newest" | "oldest" | "az" | "za";

// ── Constants ─────────────────────────────────────────────────────────────────

const AMELIYAT_OPS = ["Rinoplasti","Meme Estetiği","Liposuction","Göz Kapağı","Yüz Germe","Karın Germe","Kulak Estetiği","Jinekomasti","Burun Ucu","Septoplasti"];
const KLINIK_OPS   = ["Botoks","Dolgu","Mezoterapi","PRP","Lazer","Peeling","İplik","Karboksiterapi","Hydrafacial"];
const ANESTEZI     = ["Genel","Lokal","Sedasyon + Lokal"];
const ASA_OPS      = ["I","II","III","IV"];

const FIELDS_M = "__fields__:";
const EMPTY_SF: StructFields = { anestezi: "", sure_dk: "", asa: "", sigara: "", komplikasyon: "" };

// ── Serialization ─────────────────────────────────────────────────────────────

function serializeNote(not: string, sf: StructFields): string {
  const hasF = Object.values(sf).some(v => v.trim());
  return hasF ? `${FIELDS_M}${JSON.stringify(sf)}\n\n${not.trim()}` : not.trim();
}

function parseRawNote(raw: string | null): { not: string; sf: StructFields } {
  if (!raw) return { not: "", sf: { ...EMPTY_SF } };
  let sf = { ...EMPTY_SF };
  let body = raw;
  const newlineIdx = raw.indexOf("\n\n");
  const firstLine = newlineIdx !== -1 ? raw.slice(0, newlineIdx) : raw;
  if (firstLine.startsWith(FIELDS_M)) {
    try { sf = { ...EMPTY_SF, ...JSON.parse(firstLine.slice(FIELDS_M.length)) }; } catch {}
    body = newlineIdx !== -1 ? raw.slice(newlineIdx + 2) : "";
  }
  // Backward-compat: old 3-section format
  const MPRE = "✦PREOPERATİF:"; const MINTRA = "✦İNTRAOPERATİF:"; const MPOST = "✦POSTOPERATİF:";
  if ([MPRE, MINTRA, MPOST].some(m => body.includes(m))) {
    const extract = (m: string, others: string[]) => {
      const i = body.indexOf(m); if (i === -1) return "";
      let end = body.length;
      for (const o of others) { const ni = body.indexOf(o, i + m.length); if (ni !== -1 && ni < end) end = ni; }
      return body.slice(i + m.length, end).trim();
    };
    const parts: string[] = [];
    const pre = extract(MPRE, [MINTRA, MPOST]); if (pre) parts.push("Preoperatif:\n" + pre);
    const intra = extract(MINTRA, [MPRE, MPOST]); if (intra) parts.push("İntraoperatif:\n" + intra);
    const post = extract(MPOST, [MPRE, MINTRA]); if (post) parts.push("Postoperatif:\n" + post);
    body = parts.join("\n\n");
  }
  return { not: body, sf };
}

// ── Statistics Helpers ────────────────────────────────────────────────────────

function filterByPeriod(notes: IslemNotu[], period: StatPeriod): IslemNotu[] {
  if (period === "all") return notes;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return notes.filter(n => {
    const d = new Date((n.islem_tarihi ?? "") + "T00:00:00");
    if (period === "today") return d.getTime() === today.getTime();
    if (period === "week")  { const s = new Date(today); s.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1)); return d >= s; }
    if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === "year")  return d.getFullYear() === now.getFullYear();
    return true;
  });
}

function computeStats(notes: IslemNotu[]) {
  const map: Record<string, { a: number; k: number }> = {};
  for (const n of notes) {
    for (const op of (n.baslik ?? "").split(",").map(s => s.trim()).filter(Boolean)) {
      map[op] = map[op] ?? { a: 0, k: 0 };
      if (n.tur === "Ameliyat") map[op].a++; else map[op].k++;
    }
  }
  const opList = Object.entries(map).map(([op, c]) => ({ op, a: c.a, k: c.k, t: c.a + c.k })).sort((a, b) => b.t - a.t);
  return { total: notes.length, ameliyat: notes.filter(n => n.tur === "Ameliyat").length, klinik: notes.filter(n => n.tur === "Klinik İşlem").length, opList, max: Math.max(1, ...opList.map(o => o.t)) };
}

const fmtDate = (dt: string) => dt ? new Date(dt).toLocaleDateString("tr-TR", { year: "numeric", month: "short", day: "numeric" }) : "";

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({ open, message, onConfirm, onCancel, confirmLabel = "Sil", confirmClass = "bg-red-600 hover:bg-red-700 text-white" }: {
  open: boolean; message: string; onConfirm: () => void; onCancel: () => void; confirmLabel?: string; confirmClass?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs mx-4 p-6 flex flex-col gap-5">
        <p className="text-slate-700 text-sm font-medium text-center leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">İptal</button>
          <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${confirmClass}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Error Banner ──────────────────────────────────────────────────────────────

function ErrorBanner({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
      <span className="flex-1">{msg}</span>
      <button onClick={onClose} className="text-red-400 hover:text-red-600 flex-shrink-0"><X size={14} /></button>
    </div>
  );
}

// ── MultiSelect Combobox ──────────────────────────────────────────────────────

function MultiSelectCombobox({ selected, setSelected, options, onUpdateOptions }: {
  selected: string[]; setSelected: (a: string[]) => void; options: string[]; onUpdateOptions: (newOpts: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [addInp, setAddInp] = useState("");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [confirmItem, setConfirmItem] = useState<string | null>(null);
  const cRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) { setAddInp(""); setEditingItem(null); return; }
    const h = (e: MouseEvent) => { if (!(e.target instanceof Node)) return; if (cRef.current && !cRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const toggle = (l: string) => setSelected(selected.includes(l) ? selected.filter(x => x !== l) : [...selected, l]);

  function addNew() {
    const v = addInp.trim();
    if (!v || options.includes(v)) return;
    onUpdateOptions([...options, v]);
    setSelected([...selected, v]);
    setAddInp("");
  }

  function confirmEdit() {
    if (!editingItem) return;
    const nv = editVal.trim();
    if (!nv || nv === editingItem || options.includes(nv)) { setEditingItem(null); return; }
    onUpdateOptions(options.map(o => o === editingItem ? nv : o));
    if (selected.includes(editingItem)) setSelected(selected.map(s => s === editingItem ? nv : s));
    setEditingItem(null);
  }

  function deleteItem(val: string) {
    setConfirmItem(val);
  }

  function confirmDeleteItem() {
    if (!confirmItem) return;
    onUpdateOptions(options.filter(o => o !== confirmItem));
    if (selected.includes(confirmItem)) setSelected(selected.filter(s => s !== confirmItem));
    setConfirmItem(null);
  }

  return (
    <div ref={cRef} className="relative">
      <div
        className={clsx("flex flex-wrap items-center min-h-[40px] w-full border rounded-lg px-2.5 py-1.5 gap-1.5 bg-white cursor-pointer transition", open ? "ring-2 ring-blue-400 border-blue-300" : "border-blue-200")}
        onClick={() => setOpen(v => !v)}
      >
        {selected.length === 0 && <span className="text-slate-400 text-sm py-0.5 flex-1">Seç veya ekle...</span>}
        {selected.map(v => (
          <span key={v} className="flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-2.5 py-0.5 text-xs font-semibold">
            {v}
            <button type="button" onClick={e => { e.stopPropagation(); setSelected(selected.filter(x => x !== v)); }} className="hover:bg-blue-100 rounded-full p-0.5"><X size={12} /></button>
          </span>
        ))}
        <ChevronDown size={14} className={clsx("ml-auto text-slate-400 transition flex-shrink-0", open && "rotate-180")} />
      </div>

      {open && (
        <div className="absolute left-0 right-0 z-30 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 flex flex-col" style={{ maxHeight: 290 }}>
          <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
            {options.length === 0 && <div className="px-3 py-4 text-slate-400 text-sm text-center">Henüz işlem eklenmedi</div>}
            {options.map(o => (
              <div key={o} className={clsx("flex items-center gap-2 px-3 py-2 group hover:bg-blue-50 transition", selected.includes(o) && "bg-blue-50")}>
                {editingItem === o ? (
                  <input
                    autoFocus
                    type="text"
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); confirmEdit(); } if (e.key === "Escape") setEditingItem(null); }}
                    onBlur={confirmEdit}
                    className="flex-1 text-sm border-b border-blue-400 outline-none bg-transparent py-0.5"
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <button type="button" className="flex-1 flex items-center gap-2 text-sm text-left" onMouseDown={e => { e.preventDefault(); toggle(o); }}>
                    <input type="checkbox" checked={selected.includes(o)} readOnly className="accent-blue-600 flex-shrink-0" />
                    <span className={selected.includes(o) ? "font-semibold text-blue-700" : "text-slate-700"}>{o}</span>
                    {selected.includes(o) && <Check size={13} className="ml-auto text-green-600 flex-shrink-0" />}
                  </button>
                )}
                {editingItem !== o && (
                  <div className="flex gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                    <button type="button" onMouseDown={e => { e.preventDefault(); setEditingItem(o); setEditVal(o); }} title="Düzenle" className="p-1 text-slate-400 hover:text-blue-600 rounded transition">
                      <Pencil size={12} />
                    </button>
                    <button type="button" onMouseDown={e => { e.preventDefault(); deleteItem(o); }} title="Listeden Kaldır" className="p-1 text-slate-400 hover:text-red-500 rounded transition">
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 px-3 py-2 flex gap-2 flex-shrink-0 bg-white rounded-b-lg">
            <input
              type="text"
              placeholder="Yeni işlem ekle..."
              value={addInp}
              onChange={e => setAddInp(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addNew(); } }}
              className="flex-1 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-300"
              onClick={e => e.stopPropagation()}
            />
            <button type="button" onMouseDown={e => { e.preventDefault(); addNew(); }} disabled={!addInp.trim() || options.includes(addInp.trim())} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-40 flex-shrink-0">
              <Plus size={13} />Ekle
            </button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!confirmItem}
        message={`"${confirmItem}" işlemini listeden kaldırmak istediğinize emin misiniz?`}
        onConfirm={confirmDeleteItem}
        onCancel={() => setConfirmItem(null)}
        confirmLabel="Kaldır"
      />
    </div>
  );
}

// ── Patient Combobox ──────────────────────────────────────────────────────────

function PatientCombobox({ value, setValue, patients }: { value: number | null; setValue: (v: number) => void; patients: Patient[] }) {
  const [s, setS] = useState("");
  const [open, setOpen] = useState(false);
  const iRef = useRef<HTMLInputElement>(null);
  const cRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!(e.target instanceof Node)) return; if (cRef.current && !cRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  useEffect(() => { if (!open) setS(""); }, [open]);
  const filtered = useMemo(() => !s.trim() ? patients : patients.filter(p => p.ad_soyad.toLocaleLowerCase("tr-TR").includes(s.toLocaleLowerCase("tr-TR"))), [s, patients]);
  const sel = patients.find(p => p.id === value);
  return (
    <div ref={cRef} className="relative">
      <input
        ref={iRef}
        type="text"
        autoComplete="off"
        placeholder="Hasta ara / seç"
        className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 transition"
        onFocus={() => setOpen(true)}
        value={open ? s : (sel?.ad_soyad ?? "")}
        onChange={e => { setS(e.target.value); setOpen(true); }}
      />
      <div className={clsx("absolute left-0 right-0 z-30 bg-white border rounded-lg max-h-48 overflow-y-auto shadow-lg mt-1", open ? "" : "hidden")}>
        {filtered.length
          ? filtered.map(p => (
              <button key={p.id} type="button" tabIndex={-1} className={clsx("w-full text-left px-3 py-2 flex items-center gap-2 text-sm hover:bg-blue-50", value === p.id && "bg-blue-50 font-semibold")} onMouseDown={e => { e.preventDefault(); setValue(p.id); setOpen(false); }}>
                <User size={14} className="text-slate-400" />{p.ad_soyad}
                {value === p.id && <Check size={14} className="ml-auto text-green-600" />}
              </button>
            ))
          : <div className="px-3 py-2 text-slate-400 text-sm">Bulunamadı</div>}
      </div>
    </div>
  );
}

// ── Structured Fields Panel ───────────────────────────────────────────────────

function StructuredFieldsPanel({ fields, setFields }: { fields: StructFields; setFields: (f: StructFields) => void }) {
  const [open, setOpen] = useState(false);
  const [anestDiger, setAnestDiger] = useState(false);
  // Sync anestDiger when fields.anestezi changes from outside (e.g. loading an edit note)
  useEffect(() => {
    setAnestDiger(!!fields.anestezi && !ANESTEZI.includes(fields.anestezi));
  }, [fields.anestezi]);

  const set = (k: keyof StructFields) => (v: string) => setFields({ ...fields, [k]: v });
  const selectVal = anestDiger ? "Diğer" : fields.anestezi;
  return (
    <div className="border border-blue-100 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-2.5 bg-blue-50 text-blue-800 font-semibold text-sm hover:bg-blue-100 transition">
        <span className="flex items-center gap-2"><Stethoscope size={14} />Ameliyat Detayları</span>
        <ChevronRight size={14} className={clsx("transition-transform", open && "rotate-90")} />
      </button>
      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-white">
          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Anestezi</label>
            <select value={selectVal} onChange={e => {
              if (e.target.value === "Diğer") { setAnestDiger(true); set("anestezi")(""); }
              else { setAnestDiger(false); set("anestezi")(e.target.value); }
            }} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300 bg-white">
              <option value="">Seçin</option>
              {ANESTEZI.map(o => <option key={o} value={o}>{o}</option>)}
              <option value="Diğer">Diğer</option>
            </select>
            {anestDiger && (
              <input type="text" placeholder="Anestezi türü yazın..." value={fields.anestezi}
                onChange={e => set("anestezi")(e.target.value)}
                className="mt-1.5 w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300" />
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Süre (dk)</label>
            <input type="number" min={0} max={600} placeholder="120" value={fields.sure_dk} onChange={e => set("sure_dk")(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">ASA Skoru</label>
            <select value={fields.asa} onChange={e => set("asa")(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300 bg-white">
              <option value="">Seçin</option>
              {ASA_OPS.map(o => <option key={o} value={o}>ASA {o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Sigara</label>
            <div className="flex gap-2 pt-0.5">
              {["Hayır","Evet"].map(v => (
                <button key={v} type="button" onClick={() => set("sigara")(fields.sigara === v ? "" : v)} className={clsx("px-3 py-1 rounded-full text-xs font-semibold border transition", fields.sigara === v ? v === "Evet" ? "bg-red-500 text-white border-red-500" : "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-600 border-slate-300")}>{v}</button>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Komplikasyon</label>
            <input type="text" placeholder="Yok / Açıklayın..." value={fields.komplikasyon} onChange={e => set("komplikasyon")(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── In-editor Template Drawer ─────────────────────────────────────────────────

type TSort = "varsayilan" | "newest" | "oldest" | "az" | "sikkullanim";
type TurFilter = "Tümü" | "Ameliyat" | "Klinik İşlem";

function NoteTemplateDrawer({ open, onClose, tur, currentBasliklar, currentNoteVal, onApply, hastaId }: {
  open: boolean; onClose: () => void; tur: "Ameliyat" | "Klinik İşlem"; currentBasliklar: string[]; currentNoteVal: string; onApply: (basliklar: string, icerik: string) => void; hastaId: number | null;
}) {
  const [activeTab, setActiveTab] = useState<"sablonlar" | "gecmis">("sablonlar");
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [tSort, setTSort] = useState<TSort>("varsayilan");
  const [turFilter, setTurFilter] = useState<TurFilter>("Tümü");
  const [pinned, setPinned] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem("sablon_pinned") ?? "[]"); } catch { return []; }
  });
  const [kullanimSay, setKullanimSay] = useState<Record<number, number>>(() => {
    try { return JSON.parse(localStorage.getItem("sablon_kullanim") ?? "{}"); } catch { return {}; }
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<TForm>({ ...ETF });
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [gecmisNotlar, setGecmisNotlar] = useState<IslemNotu[]>([]);
  const [gecmisLoading, setGecmisLoading] = useState(false);
  const [gecmisError, setGecmisError] = useState("");

  useEffect(() => {
    if (!open) { setActiveTab("sablonlar"); setSearch(""); setEditId(null); return; }
    loadTemplates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || activeTab !== "gecmis") return;
    loadGecmisNotlar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeTab, hastaId]);

  async function loadTemplates() {
    setLoading(true);
    const { data, error } = await supabase.from("not_sablonlari").select("*").order("created_at", { ascending: false });
    setLoading(false);
    if (error) { setMsg({ ok: false, text: "Şablonlar yüklenemedi: " + error.message }); return; }
    setTemplates((data as NoteTemplate[]) || []);
  }

  async function loadGecmisNotlar() {
    if (!hastaId) return;
    setGecmisLoading(true);
    setGecmisError("");
    const { data, error } = await supabase.from("islem_notlari").select("*, hastalar(id, ad_soyad)").eq("hasta_id", hastaId).order("islem_tarihi", { ascending: false });
    setGecmisLoading(false);
    if (error) { setGecmisError(error.message); return; }
    setGecmisNotlar((data as IslemNotu[]) || []);
  }

  function togglePin(id: number) {
    const next = pinned.includes(id) ? pinned.filter(p => p !== id) : [...pinned, id];
    setPinned(next);
    localStorage.setItem("sablon_pinned", JSON.stringify(next));
  }

  async function handleSaveAsTemplate() {
    if (!currentNoteVal.trim()) { setMsg({ ok: false, text: "Önce not yazın." }); return; }
    setSaving(true);
    const { error } = await supabase.from("not_sablonlari").insert({ basliklar: currentBasliklar.join(",") || "Genel", tur, icerik: currentNoteVal.trim() });
    setSaving(false);
    if (error) { setMsg({ ok: false, text: "Kaydedilemedi: " + error.message }); return; }
    setMsg({ ok: true, text: "Şablon kaydedildi" });
    setTimeout(() => setMsg(null), 2500);
    loadTemplates();
  }

  async function updateTemplate(id: number) {
    if (!editForm.basliklar.trim() || !editForm.icerik.trim()) return;
    setEditSaving(true);
    setEditError("");
    const { error } = await supabase.from("not_sablonlari").update({ basliklar: editForm.basliklar.trim(), tur: editForm.tur, icerik: editForm.icerik.trim() }).eq("id", id);
    setEditSaving(false);
    if (error) { setEditError(error.message); return; }
    setEditId(null);
    loadTemplates();
  }

  function deleteTemplate(id: number) {
    setConfirmDeleteId(id);
  }

  async function confirmDeleteTemplate() {
    if (!confirmDeleteId) return;
    await supabase.from("not_sablonlari").delete().eq("id", confirmDeleteId);
    setConfirmDeleteId(null);
    loadTemplates();
  }

  function incrementUsage(id: number) {
    const next = { ...kullanimSay, [id]: (kullanimSay[id] ?? 0) + 1 };
    setKullanimSay(next);
    localStorage.setItem("sablon_kullanim", JSON.stringify(next));
  }

  const filteredTemplates = useMemo(() => {
    let list = [...templates];
    if (turFilter !== "Tümü") list = list.filter(t => t.tur === turFilter);
    if (search.trim()) {
      const q = search.toLocaleLowerCase("tr-TR");
      list = list.filter(t => t.basliklar.toLocaleLowerCase("tr-TR").includes(q) || t.icerik.toLocaleLowerCase("tr-TR").includes(q));
    }
    return list.sort((a, b) => {
      if (tSort === "sikkullanim") {
        const aU = kullanimSay[a.id] ?? 0, bU = kullanimSay[b.id] ?? 0;
        if (aU !== bU) return bU - aU;
      }
      const aP = pinned.includes(a.id), bP = pinned.includes(b.id);
      if (tSort === "varsayilan" || tSort === "sikkullanim") {
        if (aP !== bP) return aP ? -1 : 1;
      }
      if (tSort === "oldest") return a.created_at.localeCompare(b.created_at);
      if (tSort === "az") return a.basliklar.localeCompare(b.basliklar, "tr");
      return b.created_at.localeCompare(a.created_at);
    });
  }, [templates, turFilter, search, tSort, pinned, kullanimSay]);

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-[80] bg-slate-900/25 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] max-w-full z-[81] bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2 font-bold text-blue-900 text-base"><Bookmark size={17} />Şablon Kütüphanesi</div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full transition"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 flex-shrink-0">
          {([["sablonlar", "Şablonlar", BookOpen], ["gecmis", "Geçmiş Notlar", FileText]] as const).map(([tab, label, Icon]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={clsx("flex-1 py-2.5 text-sm font-semibold transition border-b-2 flex items-center justify-center gap-1.5", activeTab === tab ? "border-blue-600 text-blue-700 bg-blue-50" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50")}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>

        {activeTab === "sablonlar" ? (
          <>
            {/* Search + Sort + Filter */}
            <div className="px-4 pt-3 pb-2 flex flex-col gap-2 flex-shrink-0 border-b border-slate-100">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input type="text" placeholder="Başlık veya içerik ara..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {(["Tümü", "Ameliyat", "Klinik İşlem"] as const).map(t => (
                    <button key={t} onClick={() => setTurFilter(t)} className={clsx("px-2 py-1 rounded-lg text-xs font-semibold border transition", turFilter === t
                      ? t === "Ameliyat" ? "bg-rose-600 text-white border-rose-600"
                        : t === "Klinik İşlem" ? "bg-blue-600 text-white border-blue-600"
                        : "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    )}>
                      {t}
                    </button>
                  ))}
                </div>
                <select value={tSort} onChange={e => setTSort(e.target.value as TSort)} className="ml-auto text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-300 bg-white text-slate-600">
                  <option value="varsayilan">Varsayılan</option>
                  <option value="newest">Yeni → Eski</option>
                  <option value="oldest">Eski → Yeni</option>
                  <option value="az">A → Z</option>
                  <option value="sikkullanim">En Sık Kullanılan</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-3 px-4 flex flex-col gap-2">
              {loading
                ? <div className="flex items-center justify-center min-h-[120px] text-blue-400"><LoaderCircle className="animate-spin" size={26} /></div>
                : filteredTemplates.length === 0
                  ? <div className="text-slate-400 text-center font-medium pt-16 text-sm">{search || turFilter !== "Tümü" ? "Eşleşen şablon bulunamadı" : "Şablon bulunamadı"}</div>
                  : filteredTemplates.map(t => (
                      <div key={t.id}>
                        {editId === t.id ? (
                          <div className="border border-blue-200 rounded-xl p-4 flex flex-col gap-3 bg-blue-50">
                            <TFormFields form={editForm} setForm={setEditForm} />
                            {editError && <ErrorBanner msg={editError} onClose={() => setEditError("")} />}
                            <div className="flex gap-2">
                              <button onClick={() => setEditId(null)} className="flex-1 py-1.5 rounded-lg text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition">İptal</button>
                              <button disabled={editSaving || !editForm.basliklar.trim() || !editForm.icerik.trim()} onClick={() => updateTemplate(t.id)} className="flex-1 py-1.5 rounded-lg text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 transition disabled:opacity-50 flex items-center justify-center gap-2">
                                {editSaving ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}Güncelle
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 group relative cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition"
                            onClick={() => { incrementUsage(t.id); onApply(t.basliklar, t.icerik); }}>
                            <div className="flex items-center gap-1 mb-1.5">
                              <span className={clsx("text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0", t.tur === "Ameliyat" ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700")}>{t.tur}</span>
                              <span className="text-xs text-slate-600 font-semibold truncate">{t.basliklar}</span>
                              {pinned.includes(t.id) && <Star size={11} className="text-amber-400 flex-shrink-0 ml-1" fill="currentColor" />}
                              <div className="flex items-center gap-0.5 ml-auto opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                                <button type="button" onClick={e => { e.stopPropagation(); togglePin(t.id); }} title={pinned.includes(t.id) ? "Sabitliği Kaldır" : "Sabitle"} className={clsx("p-1 rounded transition", pinned.includes(t.id) ? "text-amber-500 hover:text-amber-600" : "text-slate-400 hover:text-amber-500")}>
                                  <Star size={13} fill={pinned.includes(t.id) ? "currentColor" : "none"} />
                                </button>
                                <button type="button" onClick={e => { e.stopPropagation(); setEditId(t.id); setEditForm({ basliklar: t.basliklar, tur: t.tur, icerik: t.icerik }); setEditError(""); }} title="Düzenle" className="p-1 rounded text-slate-400 hover:text-blue-600 transition">
                                  <Pencil size={13} />
                                </button>
                                <button type="button" onClick={e => { e.stopPropagation(); deleteTemplate(t.id); }} title="Sil" className="p-1 rounded text-slate-400 hover:text-red-500 transition">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                            <div className="text-slate-700 text-sm line-clamp-3 leading-relaxed">{t.icerik}</div>
                          </div>
                        )}
                      </div>
                    ))}
            </div>

            <div className="p-4 border-t flex-shrink-0 flex flex-col gap-2">
              {msg && (
                <div className={clsx("flex gap-2 items-center text-sm font-semibold rounded-lg px-3 py-2", msg.ok ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50")}>
                  {msg.ok ? <Check size={14} /> : <AlertCircle size={14} />}{msg.text}
                </div>
              )}
              <button type="button" disabled={saving} onClick={handleSaveAsTemplate} className="w-full bg-blue-800 hover:bg-blue-700 text-white rounded-lg py-2 font-bold flex items-center justify-center gap-2 transition text-sm disabled:opacity-60">
                {saving ? <LoaderCircle className="animate-spin" size={15} /> : <Bookmark size={15} />}Mevcut Notu Şablon Kaydet
              </button>
            </div>
          </>
        ) : (
          /* Geçmiş Notlar Tab */
          <div className="flex-1 overflow-y-auto py-3 px-4 flex flex-col gap-2">
            {!hastaId
              ? <div className="text-slate-400 text-center font-medium pt-16 text-sm">Önce hasta seçin</div>
              : gecmisLoading
                ? <div className="flex items-center justify-center min-h-[120px] text-blue-400"><LoaderCircle className="animate-spin" size={26} /></div>
                : gecmisError
                  ? <ErrorBanner msg={gecmisError} onClose={() => setGecmisError("")} />
                  : gecmisNotlar.length === 0
                    ? <div className="text-slate-400 text-center font-medium pt-16 text-sm">Bu hastaya ait geçmiş not bulunamadı</div>
                    : gecmisNotlar.map(n => {
                        const { not: nText } = parseRawNote(n.not);
                        const ops = n.baslik ? n.baslik.split(",").map(s => s.trim()) : [];
                        const preview = nText.split("\n").filter(Boolean).slice(0, 2).join(" · ");
                        return (
                          <div key={n.id} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition"
                            onClick={() => { onApply(n.baslik ?? "", nText); }}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={clsx("text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0", n.tur === "Ameliyat" ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700")}>{n.tur}</span>
                              <span className="text-xs text-slate-500 ml-auto flex-shrink-0">{fmtDate(n.islem_tarihi)}</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-1">
                              {ops.map(op => <span key={op} className="text-xs text-slate-600 font-semibold">{op}</span>)}
                            </div>
                            <div className="text-slate-600 text-sm line-clamp-2 mt-1">{preview || "—"}</div>
                          </div>
                        );
                      })}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={!!confirmDeleteId}
        message="Bu şablonu silmek istediğinize emin misiniz?"
        onConfirm={confirmDeleteTemplate}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
}

// ── Note Modal ────────────────────────────────────────────────────────────────

function NoteModal({ open, onClose, onSave, onSaveAndContinue, patients, saving, saveError, editNote }: {
  open: boolean; onClose: () => void; onSave: (f: EditFields) => Promise<void>; onSaveAndContinue?: (f: EditFields) => Promise<void>; patients: Patient[]; saving: boolean; saveError: string; editNote?: IslemNotu | null;
}) {
  const [fields, setFields] = useState<EditFields>({ hasta_id: null, basliklar: [], tur: "Ameliyat", islem_tarihi: new Date().toISOString().slice(0, 10), not: "", sf: { ...EMPTY_SF } });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savingContinue, setSavingContinue] = useState(false);

  // Separate operation selections per type (don't mix when switching)
  const [ameliyatSec, setAmeliyatSec] = useState<string[]>([]);
  const [klinikSec, setKlinikSec] = useState<string[]>([]);

  // Managed operation lists, persisted in localStorage
  const [ameliyatOps, setAmeliyatOps] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("ameliyat_islemler") ?? "null") ?? AMELIYAT_OPS; } catch { return AMELIYAT_OPS; }
  });
  const [klinikOps, setKlinikOps] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("klinik_islemler") ?? "null") ?? KLINIK_OPS; } catch { return KLINIK_OPS; }
  });

  useEffect(() => {
    if (!open) return;
    if (editNote) {
      const { not, sf } = parseRawNote(editNote.not);
      const basliklar = editNote.baslik ? editNote.baslik.split(",").map(s => s.trim()) : [];
      setFields({ hasta_id: editNote.hasta_id, basliklar, tur: editNote.tur, islem_tarihi: editNote.islem_tarihi?.slice(0, 10) ?? "", not, sf });
      if (editNote.tur === "Ameliyat") { setAmeliyatSec(basliklar); setKlinikSec([]); }
      else { setKlinikSec(basliklar); setAmeliyatSec([]); }
    } else {
      setFields({ hasta_id: null, basliklar: [], tur: "Ameliyat", islem_tarihi: new Date().toISOString().slice(0, 10), not: "", sf: { ...EMPTY_SF } });
      setAmeliyatSec([]);
      setKlinikSec([]);
    }
  }, [open, editNote]);

  const activeBasliklar = fields.tur === "Ameliyat" ? ameliyatSec : klinikSec;
  const canSave = !!fields.hasta_id && activeBasliklar.length > 0 && fields.not.trim().length > 0 && !!fields.islem_tarihi;
  const notLabel = fields.tur === "Ameliyat" ? "Ameliyat Notu" : "Klinik İşlem Notu";
  const notPlaceholder = fields.tur === "Ameliyat"
    ? "Ameliyat bulguları, uygulanan teknik, intraoperatif gözlemler, postoperatif talimatlar..."
    : "Uygulama detayları, kullanılan ürün/doz, sonuç değerlendirmesi, takip önerileri...";

  function updateAmeliyatOps(newOps: string[]) { setAmeliyatOps(newOps); localStorage.setItem("ameliyat_islemler", JSON.stringify(newOps)); }
  function updateKlinikOps(newOps: string[]) { setKlinikOps(newOps); localStorage.setItem("klinik_islemler", JSON.stringify(newOps)); }

  function applyTemplate(basliklar: string, icerik: string) {
    const names = basliklar.split(",").map(s => s.trim()).filter(Boolean);
    if (fields.tur === "Ameliyat") {
      const extra = names.filter(n => !ameliyatOps.includes(n));
      if (extra.length) updateAmeliyatOps([...ameliyatOps, ...extra]);
      setAmeliyatSec(prev => [...new Set([...prev, ...names])]);
    } else {
      const extra = names.filter(n => !klinikOps.includes(n));
      if (extra.length) updateKlinikOps([...klinikOps, ...extra]);
      setKlinikSec(prev => [...new Set([...prev, ...names])]);
    }
    setFields(f => ({ ...f, not: f.not ? f.not + "\n\n" + icerik : icerik }));
    setDrawerOpen(false);
  }

  async function handleSaveAndContinue() {
    if (!onSaveAndContinue || !canSave) return;
    setSavingContinue(true);
    await onSaveAndContinue({ ...fields, basliklar: activeBasliklar });
    setSavingContinue(false);
    setAmeliyatSec([]);
    setKlinikSec([]);
    setFields(f => ({ ...f, islem_tarihi: new Date().toISOString().slice(0, 10), not: "", sf: { ...EMPTY_SF } }));
  }

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[94vh]">
          <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 flex-shrink-0">
            <h2 className="text-blue-900 text-xl font-extrabold flex items-center gap-2">
              {editNote ? <Pencil size={18} /> : <Plus size={18} />}
              {editNote ? "Notu Düzenle" : "Yeni Not Ekle"}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full transition"><X size={22} /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-7 py-5 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-blue-900 mb-1.5"><User size={14} />Hasta</label>
                <PatientCombobox value={fields.hasta_id} setValue={id => setFields(f => ({ ...f, hasta_id: id }))} patients={patients} />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-blue-900 mb-1.5"><CalendarIcon size={14} />İşlem Tarihi</label>
                <input type="date" className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 transition bg-white" value={fields.islem_tarihi} onChange={e => setFields(f => ({ ...f, islem_tarihi: e.target.value }))} />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-blue-900 mb-1.5"><FileText size={14} />Tür</label>
                <div className="flex gap-2">
                  {(["Ameliyat","Klinik İşlem"] as const).map(t => (
                    <button key={t} type="button" onClick={() => setFields(f => ({ ...f, tur: t }))} className={clsx("flex-1 py-2 rounded-lg font-semibold text-sm border transition", fields.tur === t ? t === "Ameliyat" ? "bg-rose-600 text-white border-rose-600" : "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300")}>{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-blue-900 mb-1.5"><FileText size={14} />İşlem(ler)</label>
                <MultiSelectCombobox
                  key={fields.tur}
                  selected={fields.tur === "Ameliyat" ? ameliyatSec : klinikSec}
                  setSelected={fields.tur === "Ameliyat" ? setAmeliyatSec : setKlinikSec}
                  options={fields.tur === "Ameliyat" ? ameliyatOps : klinikOps}
                  onUpdateOptions={fields.tur === "Ameliyat" ? updateAmeliyatOps : updateKlinikOps}
                />
              </div>
            </div>
            {fields.tur === "Ameliyat" && <StructuredFieldsPanel fields={fields.sf} setFields={sf => setFields(f => ({ ...f, sf }))} />}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-blue-900">{notLabel}</label>
                <button type="button" onClick={() => setDrawerOpen(true)} className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-full transition"><BookOpen size={12} />Şablonlar</button>
              </div>
              <textarea className="w-full border border-blue-200 rounded-xl px-4 py-3 outline-none bg-white min-h-[200px] resize-y text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition" placeholder={notPlaceholder} value={fields.not} onChange={e => setFields(f => ({ ...f, not: e.target.value }))} />
            </div>
            {saveError && <ErrorBanner msg={saveError} onClose={() => {}} />}
          </div>
          <div className="px-7 py-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-shrink-0">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">İptal</button>
            <div className="flex gap-2">
              {!editNote && onSaveAndContinue && (
                <button type="button" onClick={handleSaveAndContinue} disabled={!canSave || saving || savingContinue} className={clsx("flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition", (!canSave || saving || savingContinue) && "opacity-50 pointer-events-none")}>
                  {savingContinue ? <LoaderCircle size={14} className="animate-spin" /> : <Plus size={14} />}
                  Kaydet & Devam
                </button>
              )}
              <button type="button" onClick={() => onSave({ ...fields, basliklar: activeBasliklar })} disabled={!canSave || saving || savingContinue} className={clsx("flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm text-white bg-blue-700 hover:bg-blue-800 shadow transition", (!canSave || saving || savingContinue) && "opacity-50 pointer-events-none")}>
                {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
                {editNote ? "Güncelle" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <NoteTemplateDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} tur={fields.tur} currentBasliklar={activeBasliklar} currentNoteVal={fields.not} onApply={applyTemplate} hastaId={fields.hasta_id} />
    </>
  );
}

// ── Note Detail Drawer ────────────────────────────────────────────────────────

function NoteDetailDrawer({ note, onClose, onEdit, onDelete, deleting }: {
  note: IslemNotu | null; onClose: () => void; onEdit: (n: IslemNotu) => void; onDelete: (id: number) => void; deleting: boolean;
}) {
  if (!note) return null;
  const { not, sf } = parseRawNote(note.not);
  const ops = note.baslik ? note.baslik.split(",").map(s => s.trim()) : [];
  const hasStruct = Object.values(sf).some(v => v.trim());
  return (
    <>
      <div className="fixed inset-0 z-[55] bg-slate-900/25 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[560px] max-w-full z-[56] bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        <div className={clsx("px-6 py-5 border-b flex items-start justify-between gap-4 flex-shrink-0", note.tur === "Ameliyat" ? "bg-rose-50 border-rose-100" : "bg-blue-50 border-blue-100")}>
          <div>
            <div className={clsx("text-xs font-bold uppercase tracking-wider mb-1", note.tur === "Ameliyat" ? "text-rose-500" : "text-blue-500")}>{note.tur}</div>
            <div className="text-lg font-extrabold text-slate-800">{note.hastalar?.ad_soyad ?? "—"}</div>
            <div className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5"><CalendarIcon size={12} />{fmtDate(note.islem_tarihi)}</div>
            <div className="flex flex-wrap gap-1 mt-2">
              {ops.map(op => (<span key={op} className={clsx("px-2 py-0.5 rounded-full text-xs font-semibold border", note.tur === "Ameliyat" ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-blue-100 text-blue-700 border-blue-200")}>{op}</span>))}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full transition flex-shrink-0"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {hasStruct && (
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Ameliyat Detayları</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {sf.anestezi && <div className="text-sm"><span className="text-slate-400 font-medium">Anestezi:</span> <span className="font-semibold text-slate-700">{sf.anestezi}</span></div>}
                {sf.sure_dk  && <div className="text-sm"><span className="text-slate-400 font-medium">Süre:</span> <span className="font-semibold text-slate-700">{sf.sure_dk} dk</span></div>}
                {sf.asa      && <div className="text-sm"><span className="text-slate-400 font-medium">ASA:</span> <span className="font-semibold text-slate-700">{sf.asa}</span></div>}
                {sf.sigara   && <div className="text-sm"><span className="text-slate-400 font-medium">Sigara:</span> <span className={clsx("font-semibold", sf.sigara === "Evet" ? "text-red-600" : "text-emerald-600")}>{sf.sigara}</span></div>}
                {sf.komplikasyon && <div className="text-sm col-span-2"><span className="text-slate-400 font-medium">Komplikasyon:</span> <span className={clsx("font-semibold", sf.komplikasyon.toLowerCase() === "yok" ? "text-emerald-600" : "text-red-600")}>{sf.komplikasyon}</span></div>}
              </div>
            </div>
          )}
          <div className="px-6 py-5">
            {not ? <div className="whitespace-pre-line text-slate-700 text-sm leading-relaxed">{not}</div> : <div className="text-slate-400 text-sm">Not yok.</div>}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3 flex-shrink-0">
          <button type="button" onClick={() => onEdit(note)} className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition"><Pencil size={14} />Düzenle</button>
          <button type="button" disabled={deleting} onClick={() => { if (window.confirm("Bu notu silmek istediğinize emin misiniz?")) onDelete(note.id); }} className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition disabled:opacity-50">
            {deleting ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}Sil
          </button>
        </div>
      </div>
    </>
  );
}

// ── Statistics Panel ──────────────────────────────────────────────────────────

const STAT_PERIODS: { key: StatPeriod; label: string }[] = [
  { key: "today", label: "Bugün" }, { key: "week", label: "Bu Hafta" },
  { key: "month", label: "Bu Ay" }, { key: "year", label: "Yıl Başından Beri" },
  { key: "all", label: "Tüm Zamanlar" },
];

function StatisticsPanel({ notes }: { notes: IslemNotu[] }) {
  const [period, setPeriod] = useState<StatPeriod>("month");
  const s = useMemo(() => computeStats(filterByPeriod(notes, period)), [notes, period]);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <div className="flex items-center gap-1 px-4 py-3 border-b border-slate-100 overflow-x-auto">
        <BarChart2 size={15} className="text-blue-500 flex-shrink-0 mr-1" />
        {STAT_PERIODS.map(p => (<button key={p.key} onClick={() => setPeriod(p.key)} className={clsx("px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition", period === p.key ? "bg-blue-700 text-white" : "text-slate-500 hover:bg-slate-100")}>{p.label}</button>))}
      </div>
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        {[{ l: "Toplam Not", v: s.total, c: "text-slate-800" }, { l: "Ameliyat", v: s.ameliyat, c: "text-rose-600" }, { l: "Klinik İşlem", v: s.klinik, c: "text-blue-600" }].map(i => (
          <div key={i.l} className="px-5 py-4 text-center"><div className={clsx("text-2xl font-extrabold", i.c)}>{i.v}</div><div className="text-xs text-slate-400 font-medium mt-0.5">{i.l}</div></div>
        ))}
      </div>
      {s.opList.length > 0 ? (
        <div className="px-5 py-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">İşlem Dağılımı</div>
          <div className="flex flex-col gap-2.5">
            {s.opList.map(({ op, a, k, t }) => (
              <div key={op} className="flex items-center gap-3">
                <div className="w-28 text-xs font-semibold text-slate-600 truncate flex-shrink-0">{op}</div>
                <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden flex">
                  {a > 0 && <div className="bg-rose-400 h-full" style={{ width: `${(a / s.max) * 100}%` }} />}
                  {k > 0 && <div className="bg-blue-400 h-full" style={{ width: `${(k / s.max) * 100}%` }} />}
                </div>
                <div className="text-xs font-bold text-slate-700 w-5 text-right flex-shrink-0">{t}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded-full bg-rose-400 inline-block" />Ameliyat</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />Klinik İşlem</div>
          </div>
        </div>
      ) : <div className="py-8 text-center text-slate-400 text-sm">Bu dönemde kayıt bulunamadı</div>}
    </div>
  );
}

// ── Template Manager Drawer ───────────────────────────────────────────────────

type TForm = { basliklar: string; tur: "Ameliyat" | "Klinik İşlem"; icerik: string };
const ETF: TForm = { basliklar: "", tur: "Ameliyat", icerik: "" };

// Defined outside TemplateManagerDrawer to prevent remount-on-every-render bug
function TFormFields({ form, setForm }: { form: TForm; setForm: (f: TForm) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-xs font-semibold text-slate-500 mb-1 block">Etiket / İşlem Adı</label>
        <input
          type="text"
          placeholder="örn. Rinoplasti, Genel..."
          value={form.basliklar}
          onChange={e => setForm({ ...form, basliklar: e.target.value })}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>
      <div>
        <div className="flex gap-2">
          {(["Ameliyat","Klinik İşlem"] as const).map(t => (
            <button key={t} type="button" onClick={() => setForm({ ...form, tur: t })} className={clsx("flex-1 py-1.5 rounded-lg text-xs font-semibold border transition", form.tur === t ? t === "Ameliyat" ? "bg-rose-600 text-white border-rose-600" : "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200")}>{t}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 mb-1 block">İçerik</label>
        <textarea value={form.icerik} onChange={e => setForm({ ...form, icerik: e.target.value })} rows={6} placeholder="Şablon içeriğini yazın..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 resize-y" />
      </div>
    </div>
  );
}

function TemplateManagerDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [turF, setTurF] = useState<"Tümü" | "Ameliyat" | "Klinik İşlem">("Tümü");
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<TForm>({ ...ETF });
  const [editError, setEditError] = useState("");
  const [addNew, setAddNew] = useState(false);
  const [newForm, setNewForm] = useState<TForm>({ ...ETF });
  const [newError, setNewError] = useState("");
  const [delId, setDelId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const { data, error } = await supabase.from("not_sablonlari").select("*").order("created_at", { ascending: false });
    setLoading(false);
    if (error) { setLoadError(error.message); return; }
    setTemplates((data as NoteTemplate[]) || []);
  }, []);

  useEffect(() => {
    if (open) { load(); setAddNew(false); setEditId(null); setNewError(""); setEditError(""); }
  }, [open, load]);

  const visible = turF === "Tümü" ? templates : templates.filter(t => t.tur === turF);

  async function saveNew() {
    if (!newForm.basliklar.trim() || !newForm.icerik.trim()) return;
    setSaving(true);
    setNewError("");
    const { error } = await supabase.from("not_sablonlari").insert({ basliklar: newForm.basliklar.trim(), tur: newForm.tur, icerik: newForm.icerik.trim() });
    setSaving(false);
    if (error) { setNewError(error.message); return; }
    setAddNew(false);
    setNewForm({ ...ETF });
    load();
  }

  async function update(id: number) {
    if (!editForm.basliklar.trim() || !editForm.icerik.trim()) return;
    setSaving(true);
    setEditError("");
    const { error } = await supabase.from("not_sablonlari").update({ basliklar: editForm.basliklar.trim(), tur: editForm.tur, icerik: editForm.icerik.trim() }).eq("id", id);
    setSaving(false);
    if (error) { setEditError(error.message); return; }
    setEditId(null);
    load();
  }

  async function del(id: number) {
    if (!window.confirm("Bu şablonu silmek istediğinize emin misiniz?")) return;
    setDelId(id);
    const { error } = await supabase.from("not_sablonlari").delete().eq("id", id);
    setDelId(null);
    if (error) { alert("Silinemedi: " + error.message); return; }
    setTemplates(p => p.filter(t => t.id !== id));
  }

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-[70] bg-slate-900/25 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[480px] max-w-full z-[71] bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b flex-shrink-0">
          <div className="flex items-center gap-2 font-bold text-blue-900 text-lg"><Library size={18} />Şablon Kütüphanesi</div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full transition"><X size={22} /></button>
        </div>
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex gap-1">
            {(["Tümü","Ameliyat","Klinik İşlem"] as const).map(t => (
              <button key={t} onClick={() => setTurF(t)} className={clsx("px-3 py-1.5 rounded-lg text-xs font-semibold transition", turF === t ? t === "Ameliyat" ? "bg-rose-600 text-white" : t === "Klinik İşlem" ? "bg-blue-600 text-white" : "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{t}</button>
            ))}
          </div>
          <button onClick={() => { setAddNew(true); setEditId(null); setNewForm({ ...ETF }); setNewError(""); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition"><Plus size={14} />Yeni Şablon</button>
        </div>

        {loadError && (
          <div className="mx-4 mt-3">
            <ErrorBanner msg={"Yüklenemedi: " + loadError} onClose={() => setLoadError("")} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          {loading
            ? <div className="flex items-center justify-center py-16 text-blue-400"><LoaderCircle className="animate-spin" size={28} /></div>
            : visible.length === 0
              ? <div className="text-center py-16 text-slate-400 text-sm">Şablon bulunamadı</div>
              : visible.map(t => (
                  <div key={t.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    {editId === t.id
                      ? (
                          <div className="p-4 flex flex-col gap-3">
                            <TFormFields form={editForm} setForm={setEditForm} />
                            {editError && <ErrorBanner msg={editError} onClose={() => setEditError("")} />}
                            <div className="flex gap-2">
                              <button onClick={() => setEditId(null)} className="flex-1 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">İptal</button>
                              <button disabled={saving || !editForm.basliklar.trim() || !editForm.icerik.trim()} onClick={() => update(t.id)} className="flex-1 py-2 rounded-lg text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 transition disabled:opacity-50 flex items-center justify-center gap-2">
                                {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}Güncelle
                              </button>
                            </div>
                          </div>
                        )
                      : (
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div>
                                <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full", t.tur === "Ameliyat" ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700")}>{t.tur}</span>
                                <span className="text-xs text-slate-500 ml-2 font-semibold">{t.basliklar}</span>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => { setEditId(t.id); setEditForm({ basliklar: t.basliklar, tur: t.tur, icerik: t.icerik }); setEditError(""); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition"><Pencil size={14} /></button>
                                <button disabled={delId === t.id} onClick={() => del(t.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-40">
                                  {delId === t.id ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                </button>
                              </div>
                            </div>
                            <div className="text-slate-700 text-sm line-clamp-3 leading-relaxed">{t.icerik}</div>
                          </div>
                        )}
                  </div>
                ))}
        </div>
      </div>

      {/* Yeni Şablon Modal — centered popup on top of drawer */}
      {addNew && (
        <div className="fixed inset-0 z-[90] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={e => { if (e.target === e.currentTarget) setAddNew(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-blue-900 text-base flex items-center gap-2"><Plus size={16} />Yeni Şablon</h3>
              <button onClick={() => setAddNew(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-full transition"><X size={18} /></button>
            </div>
            <TFormFields form={newForm} setForm={setNewForm} />
            {newError && <ErrorBanner msg={newError} onClose={() => setNewError("")} />}
            <div className="flex gap-2">
              <button onClick={() => setAddNew(false)} className="flex-1 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">İptal</button>
              <button disabled={saving || !newForm.basliklar.trim() || !newForm.icerik.trim()} onClick={saveNew} className="flex-1 py-2 rounded-lg text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Note Card ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="relative bg-white rounded-2xl border border-slate-100 animate-pulse p-5 min-h-[130px] flex flex-col">
      <div className="absolute left-0 top-0 h-full w-1.5 rounded-l-2xl bg-slate-200" />
      <div className="h-4 bg-slate-200 rounded w-2/3 mb-3" />
      <div className="flex gap-2 mb-3"><div className="h-5 bg-slate-100 rounded-full w-20" /><div className="h-5 bg-slate-100 rounded-full w-16" /></div>
      <div className="h-3 bg-slate-100 rounded w-full mb-1.5" />
      <div className="h-3 bg-slate-100 rounded w-4/5" />
    </div>
  );
}

function NoteCard({ note, onClick }: { note: IslemNotu; onClick: () => void }) {
  const { not, sf } = parseRawNote(note.not);
  const ops = note.baslik ? note.baslik.split(",").map(s => s.trim()) : [];
  const preview = not.split("\n").filter(Boolean).slice(0, 2).join(" · ");
  return (
    <div onClick={onClick} className="relative bg-white rounded-2xl border border-slate-100 hover:shadow-md hover:border-slate-200 transition cursor-pointer p-5 flex flex-col min-h-[130px]">
      <div className={clsx("absolute left-0 top-0 h-full w-1.5 rounded-l-2xl", note.tur === "Ameliyat" ? "bg-rose-500" : "bg-blue-500")} />
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-sm truncate"><User size={13} className="text-slate-400 flex-shrink-0" />{note.hastalar?.ad_soyad ?? "—"}</div>
        <span className="text-xs text-slate-400 flex-shrink-0">{fmtDate(note.islem_tarihi)}</span>
      </div>
      <div className="flex flex-wrap gap-1 mb-2">
        {ops.map(op => (<span key={op} className={clsx("px-2 py-0.5 rounded-full text-xs font-semibold border", note.tur === "Ameliyat" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-blue-50 text-blue-700 border-blue-200")}>{op}</span>))}
      </div>
      {sf.anestezi && <div className="text-xs text-slate-400 mb-1.5">{sf.anestezi}{sf.sure_dk && ` · ${sf.sure_dk} dk`}{sf.asa && ` · ASA ${sf.asa}`}</div>}
      <div className="text-slate-500 text-sm leading-snug line-clamp-2 mt-auto">{preview || "—"}</div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AmeliyatIslemNotlariPage() {
  const [islemNotlari, setIslemNotlari] = useState<IslemNotu[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);

  const [search, setSearch]           = useState("");
  const [filterType, setFilterType]   = useState<"Tümü" | "Ameliyat" | "Klinik İşlem">("Tümü");
  const [filterOp, setFilterOp]       = useState("");
  const [filterHasta, setFilterHasta] = useState<number | "">("");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [sort, setSort]               = useState<SortOrder>("newest");
  const [advOpen, setAdvOpen]         = useState(false);
  const [showStats, setShowStats]     = useState(true);
  const [modalOpen, setModalOpen]     = useState(false);
  const [editNote, setEditNote]       = useState<IslemNotu | null>(null);
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState("");
  const [detailNote, setDetailNote]   = useState<IslemNotu | null>(null);
  const [deletingId, setDeletingId]   = useState<number | null>(null);
  const [tmOpen, setTmOpen]           = useState(false);

  const fetchData = useCallback(async () => {
    setFetchError("");
    const { data, error } = await supabase.from("islem_notlari").select("*, hastalar(id, ad_soyad)").order("islem_tarihi", { ascending: false });
    setLoading(false);
    if (error) { setFetchError(error.message); return; }
    setIslemNotlari(data as IslemNotu[]);
  }, []);

  const fetchPatients = useCallback(async () => {
    const { data } = await supabase.from("hastalar").select("id, ad_soyad").order("ad_soyad");
    setPatients((data as Patient[]) ?? []);
  }, []);

  useEffect(() => { fetchData(); fetchPatients(); }, [fetchData, fetchPatients]);

  const uniqueOps = useMemo(() => {
    const s = new Set<string>();
    islemNotlari.forEach(n => n.baslik?.split(",").forEach(b => b.trim() && s.add(b.trim())));
    return Array.from(s).sort((a, b) => a.localeCompare(b, "tr"));
  }, [islemNotlari]);

  const uniquePatients = useMemo(() => {
    const seen = new Map<number, string>();
    islemNotlari.forEach(n => { if (n.hasta_id && n.hastalar?.ad_soyad) seen.set(n.hasta_id, n.hastalar.ad_soyad); });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [islemNotlari]);

  const advFilterCount = [!!dateFrom, !!dateTo, !!filterOp, !!filterHasta].filter(Boolean).length;

  const filteredList = useMemo(() => islemNotlari.filter(n => {
    if (filterType !== "Tümü" && n.tur !== filterType) return false;
    if (filterHasta && n.hasta_id !== filterHasta) return false;
    if (filterOp && !n.baslik?.split(",").map(b => b.trim()).includes(filterOp)) return false;
    if (dateFrom && n.islem_tarihi < dateFrom) return false;
    if (dateTo   && n.islem_tarihi > dateTo)   return false;
    if (!search.trim()) return true;
    const q = search.toLocaleLowerCase("tr-TR");
    return (n.hastalar?.ad_soyad?.toLocaleLowerCase("tr-TR") ?? "").includes(q) || (n.baslik?.toLocaleLowerCase("tr-TR") ?? "").includes(q);
  }).sort((a, b) => {
    if (sort === "oldest") return a.islem_tarihi.localeCompare(b.islem_tarihi);
    if (sort === "az")     return (a.hastalar?.ad_soyad ?? "").localeCompare(b.hastalar?.ad_soyad ?? "", "tr");
    if (sort === "za")     return (b.hastalar?.ad_soyad ?? "").localeCompare(a.hastalar?.ad_soyad ?? "", "tr");
    return b.islem_tarihi.localeCompare(a.islem_tarihi);
  }), [islemNotlari, search, filterType, filterOp, filterHasta, dateFrom, dateTo, sort]);

  async function handleSave(fields: EditFields) {
    if (!fields.hasta_id || !fields.basliklar.length || !fields.islem_tarihi) return;
    setSaving(true);
    setSaveError("");
    const payload = { hasta_id: fields.hasta_id, baslik: fields.basliklar.join(","), tur: fields.tur, islem_tarihi: fields.islem_tarihi, not: serializeNote(fields.not, fields.sf) };
    const { error } = editNote
      ? await supabase.from("islem_notlari").update(payload).eq("id", editNote.id)
      : await supabase.from("islem_notlari").insert(payload);
    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    setModalOpen(false);
    setEditNote(null);
    setDetailNote(null);
    fetchData();
  }

  async function handleSaveAndContinue(fields: EditFields) {
    if (!fields.hasta_id || !fields.basliklar.length || !fields.islem_tarihi) return;
    setSaving(true);
    setSaveError("");
    const payload = { hasta_id: fields.hasta_id, baslik: fields.basliklar.join(","), tur: fields.tur, islem_tarihi: fields.islem_tarihi, not: serializeNote(fields.not, fields.sf) };
    const { error } = await supabase.from("islem_notlari").insert(payload);
    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    fetchData();
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    const { error } = await supabase.from("islem_notlari").delete().eq("id", id);
    setDeletingId(null);
    if (error) { alert("Silinemedi: " + error.message); return; }
    setDetailNote(null);
    fetchData();
  }

  function clearAdvFilters() { setDateFrom(""); setDateTo(""); setFilterOp(""); setFilterHasta(""); }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-blue-900"><FileText size={26} className="text-blue-700" />Ameliyat / İşlem Notları</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowStats(v => !v)} className={clsx("flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition", showStats ? "bg-blue-700 text-white border-blue-700" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}><BarChart2 size={15} />İstatistikler</button>
          <button onClick={() => setTmOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"><Library size={15} />Şablonlar</button>
          <button onClick={() => { setEditNote(null); setSaveError(""); setModalOpen(true); }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold shadow transition text-sm"><Plus size={16} />Yeni Not</button>
        </div>
      </div>

      {fetchError && (
        <div className="mb-4">
          <ErrorBanner msg={"Notlar yüklenemedi: " + fetchError} onClose={() => setFetchError("")} />
        </div>
      )}

      {showStats && <StatisticsPanel notes={islemNotlari} />}

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-2 mb-5">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Hasta adı veya işlem başlığı ara..." className="pl-10 pr-4 py-2.5 w-full rounded-xl border border-slate-200 outline-none bg-white text-sm text-slate-800 focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition" value={search} onChange={e => setSearch(e.target.value)} maxLength={50} />
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex gap-1">
            {(["Tümü","Ameliyat","Klinik İşlem"] as const).map(t => (
              <button key={t} onClick={() => setFilterType(t)} className={clsx("px-3 py-1.5 rounded-lg text-xs font-semibold border transition", filterType === t ? t === "Tümü" ? "bg-slate-700 text-white border-slate-700" : t === "Ameliyat" ? "bg-rose-600 text-white border-rose-600" : "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100")}>{t}</button>
            ))}
          </div>
          <div className="w-px h-5 bg-slate-200 hidden sm:block" />
          <div className="relative">
            <ArrowDownUp size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select value={sort} onChange={e => setSort(e.target.value as SortOrder)} className="pl-7 pr-7 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-300 appearance-none cursor-pointer font-medium">
              <option value="newest">Yeniden Eskiye</option>
              <option value="oldest">Eskiden Yeniye</option>
              <option value="az">Hasta A → Z</option>
              <option value="za">Hasta Z → A</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <div className="ml-auto">
            <button onClick={() => setAdvOpen(v => !v)} className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition relative", advOpen || advFilterCount > 0 ? "bg-blue-700 text-white border-blue-700" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100")}>
              <SlidersHorizontal size={13} />Gelişmiş Filtre
              {advFilterCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">{advFilterCount}</span>}
            </button>
          </div>
        </div>

        {advOpen && (
          <div className="bg-white border border-blue-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-blue-50 border-b border-blue-100">
              <span className="text-sm font-bold text-blue-800 flex items-center gap-2"><SlidersHorizontal size={14} />Gelişmiş Filtre</span>
              {advFilterCount > 0 && (
                <button onClick={clearAdvFilters} className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 transition"><X size={12} />Filtreleri Temizle ({advFilterCount})</button>
              )}
            </div>
            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Hasta</label>
                <select value={filterHasta} onChange={e => setFilterHasta(e.target.value ? Number(e.target.value) : "")} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                  <option value="">Tüm Hastalar</option>
                  {uniquePatients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">İşlem</label>
                <select value={filterOp} onChange={e => setFilterOp(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                  <option value="">Tüm İşlemler</option>
                  {uniqueOps.map(op => <option key={op} value={op}>{op}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Başlangıç Tarihi</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Bitiş Tarihi</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
              </div>
            </div>
          </div>
        )}
      </div>

      {!loading && <div className="text-xs text-slate-400 font-medium mb-4">{filteredList.length === islemNotlari.length ? `${islemNotlari.length} not` : `${filteredList.length} / ${islemNotlari.length} not gösteriliyor`}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : filteredList.length
            ? filteredList.map(note => <NoteCard key={note.id} note={note} onClick={() => setDetailNote(note)} />)
            : (
                <div className="col-span-full py-20 flex flex-col items-center text-slate-400 gap-3">
                  <FileText size={42} />
                  <div className="text-base font-semibold">Kayıt bulunamadı</div>
                  {(advFilterCount > 0 || filterType !== "Tümü" || search) && (
                    <button onClick={() => { setFilterType("Tümü"); clearAdvFilters(); setSearch(""); }} className="text-sm text-blue-600 hover:underline">Filtreleri Temizle</button>
                  )}
                </div>
              )}
      </div>

      <NoteModal open={modalOpen} onClose={() => { setModalOpen(false); setEditNote(null); setSaveError(""); }} onSave={handleSave} onSaveAndContinue={editNote ? undefined : handleSaveAndContinue} patients={patients} saving={saving} saveError={saveError} editNote={editNote} />
      <NoteDetailDrawer note={detailNote} onClose={() => setDetailNote(null)} onEdit={note => { setEditNote(note); setDetailNote(null); setSaveError(""); setModalOpen(true); }} onDelete={handleDelete} deleting={!!deletingId} />
      <TemplateManagerDrawer open={tmOpen} onClose={() => setTmOpen(false)} />
    </div>
  );
}
