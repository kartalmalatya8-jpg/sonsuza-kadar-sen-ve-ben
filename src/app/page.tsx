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
  const [hikaye, setHikaye] = useState<any>(null);
  const [anilar, setAnilar] = useState<any[]>([]);
  const [fotograflar, setFotograflar] = useState<any[]>([]);
  const [silinenAnilar, setSilinenAnilar] = useState<any[]>([]);
  const [silinenFotograflar, setSilinenFotograflar] = useState<any[]>([]);
  const [mesajlar, setMesajlar] = useState<any[]>([]);

  const [baslik, setBaslik] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [fotoAciklama, setFotoAciklama] = useState("");
  const [seciliFoto, setSeciliFoto] = useState<File | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [muzikCaliyor, setMuzikCaliyor] = useState(false);
  const [mektupAcik, setMektupAcik] = useState(false);
  const [yeniMesaj, setYeniMesaj] = useState("");

  const [gecenZaman, setGecenZaman] = useState({
    gun: 0,
    saat: 0,
    dakika: 0,
    saniye: 0,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    checkUser();
    getStory();
    getAnilar();
    getFotograflar();
    getMesajlar();

    const channel = supabase
      .channel("mesajlar-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mesajlar" },
        () => getMesajlar()
      )
      .subscribe();

    const timer = setInterval(() => {
      const baslangic = new Date("2026-04-08T00:00:00").getTime();
      const simdi = new Date().getTime();
      const fark = simdi - baslangic;

      setGecenZaman({
        gun: Math.floor(fark / (1000 * 60 * 60 * 24)),
        saat: Math.floor((fark / (1000 * 60 * 60)) % 24),
        dakika: Math.floor((fark / (1000 * 60)) % 60),
        saniye: Math.floor((fark / 1000) % 60),
      });
    }, 1000);

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
    const { data: { session } } = await supabase.auth.getSession();
    if (session) setUser(session.user);
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3000",
        queryParams: { prompt: "select_account" },
      },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  async function getStory() {
    const { data } = await supabase.from("hikayeler").select("*").single();
    setHikaye(data);
  }

  async function getAnilar() {
    const { data } = await supabase
      .from("anilar")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (data) setAnilar(data);
  }

  async function getFotograflar() {
    const { data } = await supabase
      .from("fotograflar")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (data) setFotograflar(data);
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

    const { error } = await supabase.from("mesajlar").insert({
      user_email: user.email,
      mesaj: yeniMesaj,
    });

    if (error) {
      alert("Mesaj gönderilemedi: " + error.message);
      return;
    }

    setYeniMesaj("");
  }

  async function deleteMesaj(mesaj: any) {
    if (!confirm("Bu mesajı silmek istediğine emin misin?")) return;

    const { error } = await supabase
      .from("mesajlar")
      .delete()
      .eq("id", mesaj.id);

    if (error) {
      alert("Mesaj silinemedi: " + error.message);
      return;
    }

    getMesajlar();
  }

  async function getSilinenAnilar() {
    const { data } = await supabase
      .from("anilar")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (data) setSilinenAnilar(data);
  }

  async function getSilinenFotograflar() {
    const { data } = await supabase
      .from("fotograflar")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (data) setSilinenFotograflar(data);
  }

  async function addAni() {
    if (!baslik.trim() || !aciklama.trim()) {
      alert("Başlık ve açıklama yazmalısın ❤️");
      return;
    }

    const { error } = await supabase.from("anilar").insert({
      user_email: user.email,
      baslik,
      aciklama,
    });

    if (error) {
      alert("Anı eklenemedi: " + error.message);
      return;
    }

    setBaslik("");
    setAciklama("");
    getAnilar();
  }

  async function uploadFoto() {
    if (!seciliFoto) {
      alert("Önce bir fotoğraf seçmelisin ❤️");
      return;
    }

    setYukleniyor(true);
    const dosyaAdi = `${Date.now()}-${seciliFoto.name}`;

    const { error: uploadError } = await supabase.storage
      .from("fotograflar")
      .upload(dosyaAdi, seciliFoto);

    if (uploadError) {
      setYukleniyor(false);
      alert("Fotoğraf yüklenemedi: " + uploadError.message);
      return;
    }

    const { data } = supabase.storage
      .from("fotograflar")
      .getPublicUrl(dosyaAdi);

    const { error: dbError } = await supabase.from("fotograflar").insert({
      user_email: user.email,
      image_url: data.publicUrl,
      aciklama: fotoAciklama,
    });

    if (dbError) {
      setYukleniyor(false);
      alert("Fotoğraf kaydedilemedi: " + dbError.message);
      return;
    }

    setSeciliFoto(null);
    setFotoAciklama("");
    setYukleniyor(false);
    getFotograflar();
  }

  async function deleteFoto(foto: any) {
    if (!confirm("Bu fotoğrafı silmek istediğine emin misin?")) return;

    const { error } = await supabase
      .from("fotograflar")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.email,
      })
      .eq("id", foto.id);

    if (error) {
      alert("Fotoğraf silinemedi: " + error.message);
      return;
    }

    getFotograflar();
    if (isAdmin) getSilinenFotograflar();
  }

  async function deleteAni(ani: any) {
    if (!confirm("Bu anıyı silmek istediğine emin misin?")) return;

    const { error } = await supabase
      .from("anilar")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.email,
      })
      .eq("id", ani.id);

    if (error) {
      alert("Anı silinemedi: " + error.message);
      return;
    }

    getAnilar();
    if (isAdmin) getSilinenAnilar();
  }

  async function geriYukleAni(ani: any) {
    await supabase
      .from("anilar")
      .update({ deleted_at: null, deleted_by: null })
      .eq("id", ani.id);

    getAnilar();
    getSilinenAnilar();
  }

  async function geriYukleFoto(foto: any) {
    await supabase
      .from("fotograflar")
      .update({ deleted_at: null, deleted_by: null })
      .eq("id", foto.id);

    getFotograflar();
    getSilinenFotograflar();
  }

  function toggleMuzik() {
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
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
        <h1 className="text-5xl md:text-7xl font-bold text-red-500">
          Sonsuza Kadar
        </h1>

        <h2 className="text-4xl md:text-6xl font-semibold mt-4">
          Sen ve Ben
        </h2>

        <button
          onClick={signInWithGoogle}
          className="mt-10 bg-red-600 hover:bg-red-700 px-8 py-4 rounded-2xl text-xl font-semibold"
        >
          Google ile Giriş Yap ❤️
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-16">
      <audio ref={audioRef} src="/kisa-mesafe.mp3" loop />

      <section className="max-w-6xl mx-auto text-center relative">
        <button
          onClick={signOut}
          className="absolute right-0 top-0 border border-red-500 px-5 py-3 rounded-xl text-red-300"
        >
          Çıkış Yap
        </button>

        <h1 className="text-5xl md:text-7xl font-bold text-red-500">
          Sonsuza Kadar
        </h1>

        <h2 className="text-4xl md:text-6xl font-semibold mt-4">
          Sen ve Ben
        </h2>

        <p className="mt-8 text-gray-300">Hoş geldin, {user.email}</p>

        {isAdmin && (
          <p className="mt-3 text-yellow-400 font-bold">
            Admin paneli aktif 👑
          </p>
        )}

        <button
          onClick={toggleMuzik}
          className="mt-8 bg-red-600 hover:bg-red-700 px-8 py-4 rounded-2xl text-xl font-semibold"
        >
          {muzikCaliyor ? "Müziği Durdur 🎵" : "Kısa Mesafe Çal 🎵"}
        </button>

        <div className="mt-8">
          <button
            onClick={() => setMektupAcik(!mektupAcik)}
            className="border border-red-500 hover:bg-red-950/40 px-8 py-4 rounded-2xl text-xl font-semibold text-red-300"
          >
            {mektupAcik ? "Gizli Mektubu Kapat 💌" : "Gizli Mektubu Aç 💌"}
          </button>
        </div>

        {mektupAcik && (
          <div className="mt-8 border border-red-500 rounded-3xl p-8 bg-red-950/30 text-left max-w-3xl mx-auto">
            <h2 className="text-red-400 text-3xl font-bold mb-5 text-center">
              Sana Gizli Mektubum 💌
            </h2>
            <p className="text-gray-200 text-lg leading-8">
              Sen benim en güzel tesadüfüm, en özel hikayemsin. Bu siteyi bizim
              anılarımız burada yaşasın diye yapıyorum. Her fotoğraf, her anı,
              her saniye bizim için saklı kalsın istiyorum. İyi ki varsın. ❤️
            </p>
          </div>
        )}

        <div className="mt-14 border border-red-500 rounded-3xl p-8 bg-red-950/20">
          <h2 className="text-red-400 text-3xl font-bold mb-6">
            Birlikte Geçen Zaman ⏳
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border border-red-500 rounded-2xl p-5">
              <p className="text-4xl font-bold text-red-400">{gecenZaman.gun}</p>
              <p>Gün</p>
            </div>

            <div className="border border-red-500 rounded-2xl p-5">
              <p className="text-4xl font-bold text-red-400">{gecenZaman.saat}</p>
              <p>Saat</p>
            </div>

            <div className="border border-red-500 rounded-2xl p-5">
              <p className="text-4xl font-bold text-red-400">{gecenZaman.dakika}</p>
              <p>Dakika</p>
            </div>

            <div className="border border-red-500 rounded-2xl p-5">
              <p className="text-4xl font-bold text-red-400">{gecenZaman.saniye}</p>
              <p>Saniye</p>
            </div>
          </div>
        </div>

        <div className="mt-16 border border-red-500 rounded-3xl p-8 bg-red-950/20">
          <h2 className="text-red-400 text-3xl font-bold mb-6">
            Özel Sohbet 💬
          </h2>

          <div className="h-[350px] overflow-y-auto border border-red-900 rounded-2xl p-5 bg-black/40 text-left space-y-4">
            {mesajlar.map((m) => {
              const benim = m.user_email === user.email;

              return (
                <div
                  key={m.id}
                  className={`flex ${benim ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-5 py-3 ${
                      benim ? "bg-red-600" : "bg-red-950 border border-red-500"
                    }`}
                  >
                    <p>{m.mesaj}</p>
                    <p className="mt-2 text-xs text-gray-300">{m.user_email}</p>

                    {benim && (
                      <button
                        onClick={() => deleteMesaj(m)}
                        className="mt-2 text-xs underline text-white/80 hover:text-white"
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
              className="flex-1 p-4 rounded-xl bg-black border border-red-500 text-white outline-none"
            />

            <button
              onClick={sendMesaj}
              className="bg-red-600 hover:bg-red-700 px-6 py-4 rounded-xl font-semibold"
            >
              Gönder
            </button>
          </div>
        </div>

        {hikaye && (
          <div className="mt-14 border border-red-500 rounded-3xl p-8 bg-red-950/20">
            <h2 className="text-red-400 text-2xl font-bold mb-4">
              {hikaye.baslik}
            </h2>
            <p className="text-xl">{hikaye.aciklama}</p>
          </div>
        )}

        <div className="mt-16">
          <h2 className="text-red-400 text-3xl font-bold mb-8">
            Başlangıç Fotoğraflarımız
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <img src="/girl1.jpg" className="w-full h-[400px] object-cover rounded-3xl border border-red-500" />
            <img src="/girl2.jpg" className="w-full h-[400px] object-cover rounded-3xl border border-red-500" />
            <img src="/me.jpg" className="w-full h-[400px] object-cover rounded-3xl border border-red-500" />
          </div>
        </div>

        <div className="mt-16 border border-red-500 rounded-3xl p-8 bg-red-950/20">
          <h2 className="text-red-400 text-3xl font-bold mb-6">
            Yeni Fotoğraf Ekle 📸
          </h2>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setSeciliFoto(e.target.files?.[0] || null)}
            className="w-full mb-4 p-4 rounded-xl bg-black border border-red-500 text-white"
          />

          <input
            value={fotoAciklama}
            onChange={(e) => setFotoAciklama(e.target.value)}
            placeholder="Fotoğraf açıklaması"
            className="w-full mb-4 p-4 rounded-xl bg-black border border-red-500 text-white outline-none"
          />

          <button
            onClick={uploadFoto}
            disabled={yukleniyor}
            className="bg-red-600 hover:bg-red-700 px-8 py-4 rounded-2xl text-xl font-semibold disabled:opacity-50"
          >
            {yukleniyor ? "Yükleniyor..." : "Fotoğrafı Kaydet"}
          </button>
        </div>

        <div className="mt-16">
          <h2 className="text-red-400 text-3xl font-bold mb-8">
            Yüklenen Fotoğraflarımız
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {fotograflar.map((foto) => (
              <div
                key={foto.id}
                className="border border-red-500 rounded-3xl overflow-hidden bg-red-950/20"
              >
                <img
                  src={foto.image_url}
                  className="w-full h-[400px] object-cover"
                />

                <div className="p-5 text-left">
                  <p className="text-gray-200">{foto.aciklama}</p>
                  <p className="mt-3 text-sm text-gray-500">
                    {foto.user_email}
                  </p>

                  <button
                    onClick={() => deleteFoto(foto)}
                    className="mt-4 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl"
                  >
                    Fotoğrafı Sil 🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 border border-red-500 rounded-3xl p-8 bg-red-950/20">
          <h2 className="text-red-400 text-3xl font-bold mb-6">
            Yeni Anı Ekle ❤️
          </h2>

          <input
            value={baslik}
            onChange={(e) => setBaslik(e.target.value)}
            placeholder="Anı başlığı"
            className="w-full mb-4 p-4 rounded-xl bg-black border border-red-500 text-white outline-none"
          />

          <textarea
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            placeholder="Bu anıyı yaz..."
            className="w-full h-32 mb-4 p-4 rounded-xl bg-black border border-red-500 text-white outline-none"
          />

          <button
            onClick={addAni}
            className="bg-red-600 hover:bg-red-700 px-8 py-4 rounded-2xl text-xl font-semibold"
          >
            Anıyı Kaydet
          </button>
        </div>

        <div className="mt-16">
          <h2 className="text-red-400 text-3xl font-bold mb-8">Anılarımız</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {anilar.map((ani) => (
              <div
                key={ani.id}
                className="border border-red-500 rounded-3xl p-6 bg-red-950/20"
              >
                <h3 className="text-red-300 text-2xl font-bold">
                  {ani.baslik}
                </h3>
                <p className="mt-4 text-gray-200">{ani.aciklama}</p>
                <p className="mt-4 text-sm text-gray-500">{ani.user_email}</p>

                <button
                  onClick={() => deleteAni(ani)}
                  className="mt-4 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl"
                >
                  Anıyı Sil 🗑
                </button>
              </div>
            ))}
          </div>
        </div>

        {isAdmin && (
          <div className="mt-20 border-2 border-yellow-500 rounded-3xl p-8 bg-yellow-950/20">
            <h2 className="text-yellow-400 text-4xl font-bold mb-8">
              Admin Paneli 👑 Silinenler
            </h2>

            <h3 className="text-yellow-300 text-2xl font-bold mb-6">
              Silinen Fotoğraflar
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {silinenFotograflar.map((foto) => (
                <div
                  key={foto.id}
                  className="border border-yellow-500 rounded-3xl overflow-hidden bg-black/40"
                >
                  <img
                    src={foto.image_url}
                    className="w-full h-[300px] object-cover opacity-60"
                  />

                  <div className="p-5 text-left">
                    <p>{foto.aciklama}</p>
                    <p className="mt-2 text-sm text-gray-500">
                      Silen: {foto.deleted_by}
                    </p>

                    <button
                      onClick={() => geriYukleFoto(foto)}
                      className="mt-4 bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-xl"
                    >
                      Geri Yükle
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="text-yellow-300 text-2xl font-bold mb-6">
              Silinen Anılar
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              {silinenAnilar.map((ani) => (
                <div
                  key={ani.id}
                  className="border border-yellow-500 rounded-3xl p-6 bg-black/40"
                >
                  <h4 className="text-yellow-300 text-2xl font-bold">
                    {ani.baslik}
                  </h4>
                  <p className="mt-4">{ani.aciklama}</p>
                  <p className="mt-4 text-sm text-gray-500">
                    Silen: {ani.deleted_by}
                  </p>

                  <button
                    onClick={() => geriYukleAni(ani)}
                    className="mt-4 bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-xl"
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