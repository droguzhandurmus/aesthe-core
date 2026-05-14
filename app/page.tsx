export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-white via-blue-100 to-blue-300 font-sans">
      <section className="bg-white/95 border border-blue-100 rounded-2xl shadow-2xl flex flex-col items-center px-14 py-20 max-w-lg w-full">
        <div className="mb-8 flex flex-col items-center">
          <img src="/aesthecore-logo.PNG" alt="AestheCore" className="w-32 h-32 object-contain" />
        </div>
        <h1 className="text-4xl font-extrabold text-blue-800 text-center mb-2 tracking-tight">
          AestheCore
        </h1>
        <p className="text-sm font-semibold text-blue-500 text-center mb-4 uppercase tracking-widest">
          Innovation & Harmony
        </p>
        <p className="text-lg text-blue-700 text-center mb-10 max-w-md font-medium">
          Güven veren, profesyonel, akıllı klinik yönetim asistanınız.<br />Her zaman yanınızda.
        </p>
        <a
          href="/login"
          className="transition-all duration-200 bg-blue-700 hover:bg-blue-800 text-white px-10 py-3 rounded-full text-xl font-bold shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Doktor Girişi
        </a>
      </section>
    </main>
  );
}
