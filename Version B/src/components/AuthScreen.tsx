import { motion } from "framer-motion";
import { ArrowRight, Camera, Check, Mail, Smartphone } from "lucide-react";
import { FormEvent, useState } from "react";
import { media } from "../data";
import Logo from "./Logo";

export default function AuthScreen({ onAuth }: { onAuth: () => void }) {
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [value, setValue] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (value.trim()) onAuth();
  }

  return (
    <main className="min-h-screen bg-[#f5f0e5] p-3 sm:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-24px)] max-w-7xl overflow-hidden rounded-[30px] bg-[#fbf8f1] shadow-[0_30px_100px_-45px_rgba(23,63,53,.5)] sm:min-h-[calc(100vh-48px)] lg:grid-cols-[1.08fr_.92fr]">
        <section className="relative hidden min-h-[650px] overflow-hidden lg:block">
          <img src={media.market} alt="Étal de brocante rempli d'objets anciens" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#102f27]/95 via-[#173f35]/25 to-transparent" />
          <div className="absolute bottom-0 max-w-2xl p-14 text-white">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#f3c969]">Chiner · Estimer · Partager</p>
            <h1 className="font-display text-6xl font-semibold leading-[0.94] tracking-[-0.05em]">Chaque objet cache une histoire.</h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-white/68">Affûte ton œil, défie ta bande et donne une seconde vie aux trouvailles du quotidien.</p>
          </div>
        </section>

        <section className="flex min-h-[680px] flex-col p-6 sm:p-10 lg:p-14">
          <Logo />
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="my-auto py-14">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#e9683a]">Bienvenue dans la bande</p>
            <h2 className="font-display text-4xl font-semibold leading-tight tracking-[-0.04em] text-[#173f35] sm:text-5xl">Prêt à tester ton flair ?</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-[#6e7c74]">Rejoins une communauté de curieux et estime un nouvel objet mystère chaque jour.</p>

            <div className="mt-8 flex rounded-full bg-[#eee8dc] p-1">
              <button type="button" onClick={() => setMethod("email")} className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-extrabold transition ${method === "email" ? "bg-white text-[#173f35] shadow-sm" : "text-[#7d8882]"}`}>
                <Mail size={15} /> Email
              </button>
              <button type="button" onClick={() => setMethod("phone")} className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-extrabold transition ${method === "phone" ? "bg-white text-[#173f35] shadow-sm" : "text-[#7d8882]"}`}>
                <Smartphone size={15} /> Téléphone
              </button>
            </div>

            <form onSubmit={submit} className="mt-5">
              <label htmlFor="auth-field" className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">{method === "email" ? "Ton adresse email" : "Ton numéro de téléphone"}</label>
              <input
                id="auth-field"
                type={method === "email" ? "email" : "tel"}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={method === "email" ? "lea@exemple.fr" : "06 12 34 56 78"}
                className="mt-2 w-full rounded-2xl border-2 border-[#173f35]/10 bg-white px-4 py-4 text-sm text-[#173f35] outline-none transition placeholder:text-[#173f35]/25 focus:border-[#e9683a] focus:ring-4 focus:ring-[#e9683a]/10"
              />
              <button type="submit" disabled={!value.trim()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#e9683a] px-5 py-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#d9582d] disabled:opacity-40 disabled:hover:translate-y-0">
                Continuer <ArrowRight size={17} />
              </button>
            </form>

            <div className="mt-7 space-y-3 text-xs text-[#738078]">
              <p className="flex items-center gap-2"><Check size={15} className="text-[#488262]" /> Gratuit, sans achat intégré au lancement</p>
              <p className="flex items-center gap-2"><Camera size={15} className="text-[#488262]" /> Un défi photo et un objet mystère par jour</p>
            </div>
          </motion.div>
          <p className="text-[10px] leading-relaxed text-[#949c97]">En continuant, tu acceptes nos conditions d'utilisation et notre politique de confidentialité.</p>
        </section>
      </div>
    </main>
  );
}