import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MailCheck,
  PackageOpen,
  Sparkles,
  Trophy,
  User,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

import { media } from "@/data";
import {
  isSupabaseConfigured,
  registerWithTemporaryPassword,
  resetPasswordForEmail,
  signInWithPassword,
} from "@/lib/api";
import { sanitizeInput } from "@/lib/security";
import Logo from "@/components/Logo";

type AuthScreenProps = {
  onAuth: (identifier?: string, userId?: string, isTempPassword?: boolean, isDemo?: boolean) => void;
};

export default function AuthScreen({ onAuth }: AuthScreenProps) {
  const [tab, setTab] = useState<"register" | "login">("register");
  const [viewState, setViewState] = useState<"form" | "verification">("form");

  // Form states
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Flow states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // URL query params listener (e.g. ?email=user@test.fr&mode=login)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get("email");
      const modeParam = params.get("mode");
      if (emailParam) {
        setEmail(emailParam);
      }
      if (modeParam === "login" || emailParam) {
        setTab("login");
      }
    }
  }, []);

  // 1. REGISTER FLOW
  async function handleRegister(event: FormEvent) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = sanitizeInput(name.trim());
    if (!cleanEmail) return;

    setErrorMsg("");
    setLoading(true);

    try {
      const res = await registerWithTemporaryPassword(cleanEmail, cleanName);

      if (res.error) {
        setErrorMsg(res.error.message || "Erreur lors de l'inscription.");
      } else {
        setViewState("verification");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  // 2. LOGIN FLOW
  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    if (!cleanEmail || !cleanPassword) return;

    setErrorMsg("");
    setLoading(true);

    try {
      if (!isSupabaseConfigured) {
        onAuth(cleanEmail, undefined, true, false);
        return;
      }

      const res = await signInWithPassword(cleanEmail, cleanPassword);
      if (res.error) {
        setErrorMsg(res.error.message || "Email ou mot de passe incorrect.");
      } else if (res.data?.user) {
        const isTemp = Boolean(res.data.user.user_metadata?.needs_password_change);
        onAuth(cleanEmail, res.data.user.id, isTemp, false);
      } else {
        onAuth(cleanEmail, undefined, false, false);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  }

  // 3. FORGOT PASSWORD
  async function handleForgotPassword() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg("Veuillez saisir votre email ci-dessus d'abord.");
      return;
    }
    setLoading(true);
    try {
      await resetPasswordForEmail(cleanEmail);
      setSuccessMsg(`Un lien de réinitialisation a été envoyé à ${cleanEmail}.`);
    } catch (err: any) {
      setErrorMsg(err?.message || "Erreur lors de l'envoi du lien.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f0e5] p-3 sm:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-24px)] max-w-7xl overflow-hidden rounded-[32px] bg-[#fbf8f1] shadow-[0_30px_100px_-45px_rgba(23,63,53,.5)] sm:min-h-[calc(100vh-48px)] lg:grid-cols-[1.1fr_.9fr]">
        {/* Visual Hero Panel */}
        <section className="relative hidden min-h-[650px] overflow-hidden lg:flex lg:flex-col lg:justify-between p-12">
          <img
            src={media.authHero}
            alt="Design, objets collectors et curiosités"
            className="absolute inset-0 h-full w-full object-cover scale-105 transition-transform duration-1000 hover:scale-100"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e2720]/95 via-[#173f35]/40 to-[#173f35]/20" />

          {/* Top floating pill */}
          <div className="relative z-10 flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-extrabold text-white backdrop-blur-md w-fit border border-white/20">
            <Sparkles size={14} className="text-[#f3c969]" />
            <span>Le jeu social des curieux et passionnés de design</span>
          </div>

          {/* Bottom highlight content */}
          <div className="relative z-10 max-w-xl text-white">
            <div className="mb-4 inline-flex items-center gap-2 rounded-xl bg-[#e9683a] px-3.5 py-1.5 text-[11px] font-extrabold tracking-wider text-white uppercase">
              <Trophy size={14} /> Saison 2026
            </div>
            <h1 className="font-display text-5xl font-semibold leading-[0.98] tracking-[-0.04em] xl:text-6xl">
              As-tu l'œil pour dénicher les pépites ?
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/75">
              1 défi photo par jour. 1 estimation de Mystery Box en escouade de 4. Développe ton flair et grimpe au classement !
            </p>

            <div className="mt-8 flex items-center gap-4">
              <div className="flex -space-x-2">
                <img className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" src="https://images.pexels.com/photos/14842170/pexels-photo-14842170.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=100&w=100" alt="" />
                <img className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" src="https://images.pexels.com/photos/20144196/pexels-photo-20144196.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=100&w=100" alt="" />
                <img className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" src="https://images.pexels.com/photos/27243814/pexels-photo-27243814.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=100&w=100" alt="" />
              </div>
              <span className="text-xs font-semibold text-white/80">+1 240 joueurs actifs cette semaine</span>
            </div>
          </div>
        </section>

        {/* Form Panel */}
        <section className="flex min-h-[680px] flex-col p-6 sm:p-10 lg:p-14 justify-between">
          <div className="flex items-center justify-between">
            <Logo />
            <span className="hidden sm:inline-block rounded-full bg-[#f3c969]/20 px-3 py-1 text-[11px] font-extrabold text-[#8a6311]">
              Accès Anticipé
            </span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="my-auto py-6"
          >
            {/* SCREEN 1: VERIFICATION SCREEN AFTER REGISTER */}
            {viewState === "verification" ? (
              <div className="rounded-3xl border border-[#488262]/20 bg-[#edf7f2] p-6 sm:p-8 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#173f35] text-[#f3c969] shadow-lg">
                  <MailCheck size={32} />
                </div>

                <span className="mt-4 inline-block text-[11px] font-extrabold uppercase tracking-widest text-[#488262]">
                  Vérification du compte
                </span>
                <h2 className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-[#173f35]">
                  Vérifie ta boîte mail
                </h2>

                <p className="mx-auto mt-3 max-w-md text-xs sm:text-sm leading-relaxed text-[#4f6057]">
                  Un email d'activation a été envoyé à <strong className="text-[#173f35]">{email}</strong>.
                </p>

                <div className="mx-auto mt-5 max-w-md rounded-2xl bg-white p-4 text-left border border-[#173f35]/10 shadow-sm">
                  <p className="text-xs font-bold text-[#173f35] flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#e9683a]" /> Comment activer ton compte :
                  </p>
                  <ul className="mt-2 space-y-1.5 text-xs text-[#6e7c74]">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-[#488262]" /> Ouvre l'email reçu dans ta boîte mail
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-[#488262]" /> Clique sur le bouton « Activer mon compte »
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-[#488262]" /> Connexion automatique & accès immédiat à l'arène
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTab("login");
                    setViewState("form");
                  }}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#173f35] py-4 text-sm font-extrabold text-white transition hover:bg-[#245b4c] shadow-lg shadow-[#173f35]/20"
                >
                  Revenir à la connexion <ArrowRight size={18} />
                </button>
              </div>
            ) : (
              <>
                {/* Mode Switcher: Inscription / Connexion */}
                <div className="flex rounded-2xl bg-[#eee8dc] p-1.5 mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setTab("register");
                      setErrorMsg("");
                      setSuccessMsg("");
                    }}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-extrabold transition ${
                      tab === "register" ? "bg-white text-[#173f35] shadow-sm" : "text-[#7d8882] hover:text-[#173f35]"
                    }`}
                  >
                    <Sparkles size={14} className={tab === "register" ? "text-[#e9683a]" : ""} /> Inscription
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTab("login");
                      setErrorMsg("");
                      setSuccessMsg("");
                    }}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-extrabold transition ${
                      tab === "login" ? "bg-white text-[#173f35] shadow-sm" : "text-[#7d8882] hover:text-[#173f35]"
                    }`}
                  >
                    <Lock size={14} /> Connexion
                  </button>
                </div>

                <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[#e9683a]">
                  {tab === "register" ? "Nouveau compte" : "Déjà membre"}
                </p>
                <h2 className="font-display text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#173f35] sm:text-4xl">
                  {tab === "register" ? "Rejoins l'arène VALUO" : "Connecte-toi à ton compte"}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#6e7c74]">
                  {tab === "register"
                    ? "Inscris-toi : reçois ton lien d'activation sécurisé en 1 clic par email."
                    : "Saisis ton email et ton mot de passe pour accéder à ton espace."}
                </p>

                {errorMsg && (
                  <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 border border-red-200">
                    {errorMsg}
                  </div>
                )}

                {successMsg && (
                  <div className="mt-4 rounded-xl bg-[#edf7f2] p-3 text-xs font-bold text-[#173f35] border border-[#488262]/20">
                    {successMsg}
                  </div>
                )}

                {/* TAB: REGISTER */}
                {tab === "register" && (
                  <form onSubmit={handleRegister} className="mt-5 space-y-3.5">
                    <div>
                      <label htmlFor="reg-name" className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                        Nom ou Pseudo
                      </label>
                      <div className="relative mt-1.5">
                        <User className="pointer-events-none absolute left-4 top-3.5 text-[#173f35]/40" size={17} />
                        <input
                          id="reg-name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ex: Léa Martin"
                          className="w-full rounded-2xl border-2 border-[#173f35]/10 bg-white py-3.5 pl-11 pr-4 text-sm text-[#173f35] outline-none transition placeholder:text-[#173f35]/25 focus:border-[#e9683a] focus:ring-4 focus:ring-[#e9683a]/10"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="reg-email" className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                        Adresse email
                      </label>
                      <div className="relative mt-1.5">
                        <Mail className="pointer-events-none absolute left-4 top-3.5 text-[#173f35]/40" size={17} />
                        <input
                          id="reg-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="lea@exemple.fr"
                          className="w-full rounded-2xl border-2 border-[#173f35]/10 bg-white py-3.5 pl-11 pr-4 text-sm text-[#173f35] outline-none transition placeholder:text-[#173f35]/25 focus:border-[#e9683a] focus:ring-4 focus:ring-[#e9683a]/10"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!email.trim() || loading}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#e9683a] px-5 py-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#d9582d] disabled:opacity-40 disabled:hover:translate-y-0 shadow-lg shadow-[#e9683a]/25"
                    >
                      {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <>
                          S'inscrire <ArrowRight size={17} />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* TAB: LOGIN */}
                {tab === "login" && (
                  <form onSubmit={handleLogin} className="mt-5 space-y-3.5">
                    <div>
                      <label htmlFor="login-email" className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                        Adresse email
                      </label>
                      <div className="relative mt-1.5">
                        <Mail className="pointer-events-none absolute left-4 top-3.5 text-[#173f35]/40" size={17} />
                        <input
                          id="login-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="lea@exemple.fr"
                          className="w-full rounded-2xl border-2 border-[#173f35]/10 bg-white py-3.5 pl-11 pr-4 text-sm text-[#173f35] outline-none transition placeholder:text-[#173f35]/25 focus:border-[#e9683a] focus:ring-4 focus:ring-[#e9683a]/10"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label htmlFor="login-pwd" className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                          Mot de passe temporaire ou défini
                        </label>
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-[11px] font-bold text-[#e9683a] hover:underline"
                        >
                          Oublié ?
                        </button>
                      </div>
                      <div className="relative mt-1.5">
                        <KeyRound className="pointer-events-none absolute left-4 top-3.5 text-[#173f35]/40" size={17} />
                        <input
                          id="login-pwd"
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-2xl border-2 border-[#173f35]/10 bg-white py-3.5 pl-11 pr-11 text-sm text-[#173f35] outline-none transition placeholder:text-[#173f35]/25 focus:border-[#e9683a] focus:ring-4 focus:ring-[#e9683a]/10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label="Afficher le mot de passe"
                          className="absolute right-3.5 top-3.5 text-[#173f35]/40 hover:text-[#173f35]"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!email.trim() || !password.trim() || loading}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#173f35] px-5 py-4 text-sm font-extrabold text-white transition hover:bg-[#245b4c] disabled:opacity-40 shadow-lg shadow-[#173f35]/25"
                    >
                      {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <>
                          Me connecter <ArrowRight size={17} />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </>
            )}

            {/* Quick Demo Mode: explicitly injects mock data */}
            <div className="mt-6 border-t border-[#173f35]/10 pt-4 text-center">
              <button
                type="button"
                onClick={() => onAuth("lea@demo.valuo", undefined, false, true)}
                className="text-xs font-bold text-[#738078] hover:text-[#e9683a] underline underline-offset-2"
              >
                Tester en mode Démo rapide (avec données mock)
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#738078]">
              <div className="flex items-center gap-2 rounded-xl bg-white/70 p-2.5 border border-[#173f35]/5">
                <Check size={16} className="text-[#488262] shrink-0" />
                <span>Session persistante et synchronisée</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white/70 p-2.5 border border-[#173f35]/5">
                <PackageOpen size={16} className="text-[#e9683a] shrink-0" />
                <span>1 duel d'estimation / jour</span>
              </div>
            </div>
          </motion.div>

          <p className="text-[11px] leading-relaxed text-[#949c97]">
            En continuant, tu acceptes nos conditions d'utilisation et notre politique de confidentialité.
          </p>
        </section>
      </div>
    </main>
  );
}
