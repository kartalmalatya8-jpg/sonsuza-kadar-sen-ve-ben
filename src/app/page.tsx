"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://xmkcxppxmmgpbvrewoyv.supabase.co",
  "sb_publishable_Wb7VNR5HzmzHlAzRhYzCwQ_l2gxt-mL"
);

const ADMIN_EMAIL = "kartalmalatya8@gmail.com";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [mesajlar, setMesajlar] = useState<any[]>([]);
  const [yeniMesaj, setYeniMesaj] = useState("");

  const [anilar, setAnilar] = useState<any[]>([]);
  const [silinenAnilar, setSilinenAnilar] = useState<any[]>([]);
  const [baslik, setBaslik] = useState("");
  const [aciklama, setAciklama] = useState("");

  const [fotograflar, setFotograflar] = useState<any[]>([]);
  const [silinenFotograflar, setSilinenFotograflar] = useState<any[]>([]);
  const [seciliFoto, setSeciliFoto] = useState<File | null>(null);
  const [fotoAciklama, setFotoAciklama] = useState("");

  const [muzikCaliyor, setMuzikCaliyor] = useState(false);
  const [mektupAcik, setMektupAcik] = useState(false);

  const [time, setTime] = useState({
    gun: 0,
    saat: 0,
    dakika: 0,
    saniye: 0,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isAdmin = user?.email === ADMIN_EMAIL;

  const hearts = Array.from({ length: 35 });

  useEffect(() => {
    checkUser();
    getMesajlar();
    getAnilar();
    getFotograflar();

    const timer = setInterval(() => {
      const start = new Date("2026-04-08T00:00:00").getTime();
      const now = new Date().getTime();
      const diff = now - start;

      setTime({
        gun: Math.floor(diff / (1000 * 60 * 60 * 24)),
        saat: Math.floor((diff / (1000 * 60 * 60)) % 24),
        dakika: Math.floor((diff / (1000 * 60)) % 60),
        saniye: Math.floor((diff / 1000) % 60),
      });
    }, 1000);

    const channel = supabase
      .channel("mesajlar-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mesajlar" },
        () => getMesajlar()
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (isAdmin) {
      getSilinenAnilar();
      getSilinenFotograflar();
    }
  }, [user]);

  async function checkUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) setUser(session.user);
  }

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://sonsuza-kadar-sen-ve-ben.vercel.app",
        queryParams: { prompt: "select_account" },
      },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    location.reload();
  }

  async function getMesajlar() {
    const { data } = await supabase
      .from("mesajlar")
      .select("*")
      .order("created_at", { ascending: true });

    if (data) setMesajlar(data);
  }

  async function sendMesaj() {
    if (!yeniMesaj.trim()) return;

    await supabase.from("mesajlar").insert({
      user_email: user.email,
      mesaj: yeniMesaj,
    });

    setYeniMesaj("");
  }

  async function deleteMesaj(id: number) {
    await supabase.from("mesajlar").delete().eq("id", id);
    getMesajlar();
  }

  async function getAnilar() {
    const { data } = await supabase
      .from("anilar")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (data) setAnilar(data);
  }

  async function getSilinenAnilar() {
    const { data } = await supabase
      .from("anilar")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (data) setSilinenAnilar(data);
  }

  async function addAni() {
    if (!baslik.trim() || !aciklama.trim()) return;

    await supabase.from("anilar").insert({
      baslik,
      aciklama,
      user_email: user.email,
    });

    setBaslik("");
    setAciklama("");
    getAnilar();
  }

  async function deleteAni(ani: any) {
    await supabase
      .from("anilar")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.email,
      })
      .eq("id", ani.id);

    getAnilar();
    if (isAdmin) getSilinenAnilar();
  }

  async function geriYukleAni(ani: any) {
    await supabase
      .from("anilar")
      .update({
        deleted_at: null,
        deleted_by: null,
      })
      .eq("id", ani.id);

    getAnilar();
    getSilinenAnilar();
  }

  async function getFotograflar() {
    const { data } = await supabase
      .from("fotograflar")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (data) setFotograflar(data);
  }

  async function getSilinenFotograflar() {
    const { data } = await supabase
      .from("fotograflar")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (data) setSilinenFotograflar(data);
  }

  async function uploadFoto() {
    if (!seciliFoto) return;

    const fileName = `${Date.now()}-${seciliFoto.name}`;

    await supabase.storage.from("fotograflar").upload(fileName, seciliFoto);

    const { data } = supabase.storage
      .from("fotograflar")
      .getPublicUrl(fileName);

    await supabase.from("fotograflar").insert({
      image_url: data.publicUrl,
      aciklama: fotoAciklama,
      user_email: user.email,
    });

    setFotoAciklama("");
    setSeciliFoto(null);
    getFotograflar();
  }

  async function deleteFoto(foto: any) {
    await supabase
      .from("fotograflar")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.email,
      })
      .eq("id", foto.id);

    getFotograflar();
    if (isAdmin) getSilinenFotograflar();
  }

  async function geriYukleFoto(foto: any) {
    await supabase
      .from("fotograflar")
      .update({
        deleted_at: null,
        deleted_by: null,
      })
      .eq("id", foto.id);

    getFotograflar();
    getSilinenFotograflar();
  }

  function toggleMusic() {
    if (!audioRef.current) return;

    if (muzikCaliyor) {
      audioRef.current.pause();
      setMuzikCaliyor(false);
    } else {
      audioRef.current.play();
      setMuzikCaliyor(true);
    }
  }

  if (!user) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-black text-white flex items-center justify-center px-6">
        <Background hearts={hearts} />

        <div className="relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-black text-red-500 drop-shadow-[0_0_25px_rgba(255,0,70,0.8)]">
            Sonsuza Kadar
          </h1>

          <h2 className="mt-4 text-4xl md:text-6xl font-extrabold">
            Sen ve Ben
          </h2>

          <button
            onClick={signIn}
            className="mt-10 rounded-2xl bg-red-600 px-8 py-4 text-xl font-bold hover:bg-red-700 shadow-[0_0_30px_rgba(255,0,70,0.5)]"
          >
            Google ile Giriş Yap ❤️
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white px-5 py-10">
      <audio ref={audioRef} src="/kisa-mesafe.mp3" loop />
      <Background hearts={hearts} />

      <button
        onClick={signOut}
        className="fixed right-6 top-6 z-30 rounded-xl border border-red-500 px-5 py-2 text-red-200 bg-black/70 hover:bg-red-700"
      >
        Çıkış Yap
      </button>

      <section className="relative z-10 mx-auto max-w-6xl text-center">
        <h1 className="text-5xl md:text-7xl font-black text-red-500 drop-shadow-[0_0_25px_rgba(255,0,70,0.8)]">
          Sonsuza Kadar
        </h1>

        <h2 className="mt-3 text-4xl md:text-6xl font-extrabold">
          Sen ve Ben
        </h2>

        <p className="mt-6 text-gray-300">Hoş geldin, {user.email}</p>

        {isAdmin && (
          <p className="mt-2 font-bold text-yellow-400">Admin paneli aktif 👑</p>
        )}

        <div className="mt-8 flex flex-col items-center gap-4">
          <button
            onClick={toggleMusic}
            className="rounded-2xl bg-red-600 px-8 py-4 text-xl font-bold hover:bg-red-700 shadow-[0_0_30px_rgba(255,0,70,0.5)]"
          >
            {muzikCaliyor ? "Müziği Durdur 🎵" : "Kısa Mesafe Çal 🎵"}
          </button>

          <button
            onClick={() => setMektupAcik(!mektupAcik)}
            className="rounded-2xl border border-red-500 px-8 py-4 text-xl font-bold hover:bg-red-900/60"
          >
            {mektupAcik ? "Gizli Mektubu Kapat 💌" : "Gizli Mektubu Aç 💌"}
          </button>
        </div>

        {mektupAcik && (
          <div className="mx-auto mt-8 max-w-3xl rounded-3xl border border-red-500 bg-red-950/40 p-8 text-left">
            <h2 className="mb-5 text-center text-3xl font-bold text-red-400">
              Sana Gizli Mektubum 💌
            </h2>
            <p className="text-lg leading-8 text-gray-200">
              Sen benim en güzel tesadüfümsün. Bu siteyi sadece bir proje değil,
              bizim anılarımız sonsuza kadar yaşasın diye yaptım. Her fotoğraf,
              her anı ve her mesaj burada bizim küçük dünyamız olarak kalacak. ❤️
            </p>
          </div>
        )}

        <div className="mt-12 rounded-[32px] border border-red-500/70 bg-red-950/30 p-6 md:p-10 shadow-[0_0_45px_rgba(255,0,70,0.2)]">
          <h2 className="mb-8 text-3xl md:text-5xl font-black text-red-400">
            Birlikte Geçen Zaman ⏳
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TimeCard value={time.gun} label="Gün" />
            <TimeCard value={time.saat} label="Saat" />
            <TimeCard value={time.dakika} label="Dakika" />
            <TimeCard value={time.saniye} label="Saniye" />
          </div>
        </div>

        <div className="mt-12 rounded-3xl border border-red-500 bg-red-950/30 p-6 md:p-8">
          <h2 className="mb-6 text-3xl font-black text-red-400">
            Özel Sohbet 💬
          </h2>

          <div className="h-[330px] overflow-y-auto rounded-2xl border border-red-900 bg-black/40 p-5 text-left space-y-4">
            {mesajlar.map((m) => {
              const benim = m.user_email === user.email;

              return (
                <div
                  key={m.id}
                  className={`flex ${benim ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                      benim
                        ? "bg-red-600"
                        : "border border-red-500 bg-red-950"
                    }`}
                  >
                    <p>{m.mesaj}</p>
                    <p className="mt-2 text-xs text-gray-300">
                      {m.user_email}
                    </p>

                    {benim && (
                      <button
                        onClick={() => deleteMesaj(m.id)}
                        className="mt-2 text-xs underline"
                      >
                        Mesajı Sil
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex gap-3">
            <input
              value={yeniMesaj}
              onChange={(e) => setYeniMesaj(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMesaj();
              }}
              placeholder="Mesaj yaz..."
              className="flex-1 rounded-xl border border-red-500 bg-black p-4 outline-none"
            />

            <button
              onClick={sendMesaj}
              className="rounded-xl bg-red-600 px-6 font-bold hover:bg-red-700"
            >
              Gönder
            </button>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="mb-8 text-4xl font-black text-red-400">
            Başlangıç Fotoğraflarımız ❤️
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <img src="/girl1.jpg" className="h-[390px] w-full rounded-3xl border border-red-500 object-cover" />
            <img src="/girl2.jpg" className="h-[390px] w-full rounded-3xl border border-red-500 object-cover" />
            <img src="/me.jpg" className="h-[390px] w-full rounded-3xl border border-red-500 object-cover" />
          </div>
        </div>

        <div className="mt-12 rounded-3xl border border-red-500 bg-red-950/30 p-8">
          <h2 className="mb-6 text-3xl font-black text-red-400">
            Fotoğraf Yükle 📸
          </h2>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setSeciliFoto(e.target.files?.[0] || null)}
            className="mb-4 w-full rounded-xl border border-red-500 bg-black p-4"
          />

          <input
            value={fotoAciklama}
            onChange={(e) => setFotoAciklama(e.target.value)}
            placeholder="Fotoğraf açıklaması"
            className="mb-4 w-full rounded-xl border border-red-500 bg-black p-4 outline-none"
          />

          <button
            onClick={uploadFoto}
            className="rounded-xl bg-red-600 px-8 py-4 font-bold hover:bg-red-700"
          >
            Fotoğrafı Kaydet
          </button>
        </div>

        <div className="mt-12">
          <h2 className="mb-8 text-4xl font-black text-red-400">
            Fotoğraflarımız 📸
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {fotograflar.map((foto) => (
              <div
                key={foto.id}
                className="overflow-hidden rounded-3xl border border-red-500 bg-red-950/30"
              >
                <img
                  src={foto.image_url}
                  className="h-[390px] w-full object-cover"
                />

                <div className="p-5 text-left">
                  <p>{foto.aciklama}</p>
                  <button
                    onClick={() => deleteFoto(foto)}
                    className="mt-4 rounded-xl bg-red-600 px-4 py-2 hover:bg-red-700"
                  >
                    Fotoğrafı Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 rounded-3xl border border-red-500 bg-red-950/30 p-8">
          <h2 className="mb-6 text-3xl font-black text-red-400">
            Yeni Anı ❤️
          </h2>

          <input
            value={baslik}
            onChange={(e) => setBaslik(e.target.value)}
            placeholder="Başlık"
            className="mb-4 w-full rounded-xl border border-red-500 bg-black p-4 outline-none"
          />

          <textarea
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            placeholder="Anı yaz..."
            className="h-36 w-full rounded-xl border border-red-500 bg-black p-4 outline-none"
          />

          <button
            onClick={addAni}
            className="mt-4 rounded-xl bg-red-600 px-8 py-4 font-bold hover:bg-red-700"
          >
            Anıyı Kaydet
          </button>
        </div>

        <div className="mt-12">
          <h2 className="mb-8 text-4xl font-black text-red-400">
            Anılarımız ❤️
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {anilar.map((ani) => (
              <div
                key={ani.id}
                className="rounded-3xl border border-red-500 bg-red-950/30 p-6"
              >
                <h3 className="text-2xl font-bold text-red-300">
                  {ani.baslik}
                </h3>

                <p className="mt-4">{ani.aciklama}</p>

                <button
                  onClick={() => deleteAni(ani)}
                  className="mt-4 rounded-xl bg-red-600 px-4 py-2 hover:bg-red-700"
                >
                  Anıyı Sil
                </button>
              </div>
            ))}
          </div>
        </div>

        {isAdmin && (
          <div className="mt-16 rounded-3xl border-2 border-yellow-500 bg-yellow-950/20 p-8">
            <h2 className="mb-8 text-4xl font-black text-yellow-400">
              Admin Paneli 👑 Silinenler
            </h2>

            <h3 className="mb-5 text-2xl font-bold text-yellow-300">
              Silinen Fotoğraflar
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {silinenFotograflar.map((foto) => (
                <div
                  key={foto.id}
                  className="overflow-hidden rounded-3xl border border-yellow-500 bg-black/40"
                >
                  <img
                    src={foto.image_url}
                    className="h-[280px] w-full object-cover opacity-60"
                  />

                  <div className="p-5 text-left">
                    <p>{foto.aciklama}</p>
                    <p className="mt-2 text-sm text-gray-400">
                      Silen: {foto.deleted_by}
                    </p>

                    <button
                      onClick={() => geriYukleFoto(foto)}
                      className="mt-4 rounded-xl bg-yellow-600 px-4 py-2 hover:bg-yellow-700"
                    >
                      Geri Yükle
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="mb-5 text-2xl font-bold text-yellow-300">
              Silinen Anılar
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              {silinenAnilar.map((ani) => (
                <div
                  key={ani.id}
                  className="rounded-3xl border border-yellow-500 bg-black/40 p-6"
                >
                  <h4 className="text-2xl font-bold text-yellow-300">
                    {ani.baslik}
                  </h4>

                  <p className="mt-4">{ani.aciklama}</p>

                  <p className="mt-4 text-sm text-gray-400">
                    Silen: {ani.deleted_by}
                  </p>

                  <button
                    onClick={() => geriYukleAni(ani)}
                    className="mt-4 rounded-xl bg-yellow-600 px-4 py-2 hover:bg-yellow-700"
                  >
                    Geri Yükle
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function Background({ hearts }: { hearts: any[] }) {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute left-1/2 top-[-180px] h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-red-600/25 blur-[160px]" />
      <div className="absolute bottom-[-200px] right-[-120px] h-[460px] w-[460px] rounded-full bg-red-800/20 blur-[150px]" />

      {hearts.map((_, i) => (
        <span
          key={i}
          className="absolute heart-float text-red-500/40"
          style={{
            left: `${(i * 37) % 100}%`,
            fontSize: `${14 + ((i * 7) % 28)}px`,
            animationDuration: `${7 + ((i * 3) % 10)}s`,
            animationDelay: `${(i % 8) * 0.7}s`,
          }}
        >
          ❤️
        </span>
      ))}
    </div>
  );
}

function TimeCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-red-500/70 bg-black/40 p-6">
      <div className="text-4xl md:text-6xl font-black text-red-400">
        {value}
      </div>
      <div className="mt-2 text-lg md:text-xl text-gray-200">{label}</div>
    </div>
  );
}