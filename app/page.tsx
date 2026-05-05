export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-white via-blue-100 to-blue-300 font-sans">
      <section className="bg-white/95 border border-blue-100 rounded-2xl shadow-2xl flex flex-col items-center px-14 py-20 max-w-lg w-full">
        <div className="mb-10 flex flex-col items-center">
          {/* Şık plastik cerrahi temalı logo */}
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
            <circle cx="36" cy="36" r="34" fill="#E3ECFA" stroke="#B5CCE8" strokeWidth="2"/>
            <path d="M22 44C32 24 40 24 50 44" stroke="#2571C9" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
            <ellipse cx="36" cy="36" rx="8" ry="13" fill="#fff" stroke="#2571C9" strokeWidth="1.6"/>
            <path d="M33.5 38c0 2 3 2 3 0" stroke="#2571C9" strokeWidth="1.2" strokeLinecap="round"/>
            <ellipse cx="33" cy="33" rx="1.3" ry="1.8" fill="#2571C9" opacity="0.16"/>
            <ellipse cx="39" cy="33" rx="1.3" ry="1.8" fill="#2571C9" opacity="0.16"/>
          </svg>
        </div>
        <h1 className="text-4xl font-extrabold text-blue-800 text-center mb-4 tracking-tight">
          Estetik Asistan
        </h1>
        <p className="text-lg text-blue-700 text-center mb-10 max-w-md font-medium">
          Güven veren, profesyonel, akıllı klinik yönetim asistanınız.<br />Her zaman yanınızda.
        </p>
        <a
          href="genel-bakis"
          className="transition-all duration-200 bg-blue-700 hover:bg-blue-800 text-white px-10 py-3 rounded-full text-xl font-bold shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Doktor Girişi
        </a>
      </section>
    </main>
  );
}
