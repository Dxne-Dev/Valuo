import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  BellRing,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  Download,
  Eye,
  EyeOff,
  Flame,
  KeyRound,
  MapPin,
  PackageOpen,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trophy,
  Upload,
  User,
  Users,
} from "lucide-react";
import { type ChangeEvent, useState } from "react";
import { avatarPresets, type UserProfile } from "@/data";
import { updateUserPassword } from "@/lib/api";
import { sanitizeInput, validatePassword } from "@/lib/security";
import Logo from "@/components/Logo";

export type OnboardingViewProps = {
  initialIdentifier?: string;
  onComplete: (profile: Partial<UserProfile>, selectedSquadMode: "auto" | "code" | "skip", squadCode?: string) => void;
  onInstall?: () => void;
  canInstall?: boolean;
};

export default function OnboardingView({ initialIdentifier, onComplete, onInstall, canInstall = false }: OnboardingViewProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  const initialName = initialIdentifier && initialIdentifier.includes("@")
    ? initialIdentifier.split("@")[0].charAt(0).toUpperCase() + initialIdentifier.split("@")[0].slice(1)
    : "";

  const [name, setName] = useState(initialName);
  const [city, setCity] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(avatarPresets[0].url);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pwdError, setPwdError] = useState("");

  const [squadChoice, setSquadChoice] = useState<"auto" | "code" | "skip">("auto");
  const [squadCodeInput, setSquadCodeInput] = useState("");

  const [notifGranted, setNotifGranted] = useState<boolean>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission === "granted";
    }
    return false;
  });
  const [installClicked, setInstallClicked] = useState(false);

  function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setCustomAvatar(reader.result);
          setSelectedAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  function handleValidatePasswordStep() {
    setPwdError("");
    if (password.trim()) {
      const validation = validatePassword(password.trim());
      if (!validation.isValid) {
        setPwdError(validation.error || "Mot de passe non valide.");
        return;
      }
      if (password !== confirmPassword) {
        setPwdError("Les deux mots de passe ne correspondent pas.");
        return;
      }
    }
    setStep(5);
  }

  async function handleRequestNotification() {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === "granted") {
          setNotifGranted(true);
        }
      } catch (err) {
        console.warn("Could not request notification permission:", err);
      }
    }
  }

  function handleTriggerInstall() {
    setInstallClicked(true);
    if (onInstall) {
      onInstall();
    }
  }

  async function handleFinish() {
    const chosenName = sanitizeInput(name.trim() || initialName || "Joueur VALUO");
    const chosenCity = sanitizeInput(city.trim() || "France");
    const chosenAvatar = selectedAvatar;

    await onComplete(
      {
        name: chosenName,
        city: chosenCity,
        avatar: chosenAvatar,
      },
      squadChoice,
      squadCodeInput.trim().toUpperCase(),
    );

    if (password.trim()) {
      try {
        await updateUserPassword(password.trim());
      } catch (err: any) {
        console.warn("Could not update password during onboarding:", err);
      }
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f0e5] p-3 sm:p-6 flex items-center justify-center">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[32px] bg-[#fbf8f1] p-6 sm:p-10 shadow-[0_30px_90px_-40px_rgba(23,63,53,.45)] border border-[#173f35]/8">
        <div className="flex items-center justify-between border-b border-[#173f35]/10 pb-5">
          <Logo />
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#7a8780]">
              Étape {step}/5
            </span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    s === step
                      ? "w-7 bg-[#e9683a]"
                      : s < step
                      ? "w-2 bg-[#173f35]"
                      : "w-2 bg-[#173f35]/15"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* STEP 1: CREATE PROFILE */}
        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="mt-6"
          >
            <div className="text-center sm:text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e9683a]/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#e9683a]">
                <User size={13} /> Profil du joueur
              </span>
              <h2 className="mt-2 font-display text-3xl font-semibold text-[#173f35] sm:text-4xl">
                Créons ton identité
              </h2>
              <p className="mt-1 text-sm text-[#6f7e76]">
                Choisis ton avatar ou téléverse ta propre photo, puis renseigne ta ville.
              </p>
            </div>

            <div className="mt-6">
              <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                Choisis ton avatar ou importe ta photo
              </label>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {customAvatar && (
                  <button
                    type="button"
                    onClick={() => setSelectedAvatar(customAvatar)}
                    className={`relative rounded-full p-0.5 transition hover:scale-105 ${
                      selectedAvatar === customAvatar
                        ? "ring-4 ring-[#e9683a] ring-offset-2 ring-offset-[#fbf8f1]"
                        : "opacity-75 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={customAvatar}
                      alt="Ma photo personnalisée"
                      className="h-14 w-14 rounded-full object-cover"
                    />
                    {selectedAvatar === customAvatar && (
                      <span className="absolute bottom-0 right-0 grid h-5 w-5 place-items-center rounded-full bg-[#e9683a] text-white">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                )}

                {avatarPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedAvatar(preset.url)}
                    className={`relative rounded-full p-0.5 transition hover:scale-105 ${
                      selectedAvatar === preset.url
                        ? "ring-4 ring-[#e9683a] ring-offset-2 ring-offset-[#fbf8f1]"
                        : "opacity-75 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                    {selectedAvatar === preset.url && (
                      <span className="absolute bottom-0 right-0 grid h-5 w-5 place-items-center rounded-full bg-[#e9683a] text-white">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                ))}

                <label className="flex h-14 cursor-pointer items-center gap-2 rounded-full border-2 border-dashed border-[#173f35]/25 bg-white/70 px-4 text-xs font-bold text-[#173f35] transition hover:border-[#e9683a] hover:bg-white hover:text-[#e9683a]">
                  <Upload size={16} />
                  <span>Importer photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="onboarding-name"
                  className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]"
                >
                  Ton prénom ou pseudo
                </label>
                <div className="relative mt-1.5">
                  <User className="pointer-events-none absolute left-4 top-3.5 text-[#173f35]/40" size={18} />
                  <input
                    id="onboarding-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Thomas, Sarah, Alex…"
                    className="w-full rounded-2xl border-2 border-[#173f35]/10 bg-white py-3.5 pl-11 pr-4 text-sm text-[#173f35] outline-none transition placeholder:text-[#173f35]/25 focus:border-[#e9683a] focus:ring-4 focus:ring-[#e9683a]/10"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="onboarding-city"
                  className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]"
                >
                  Ta ville ou région
                </label>
                <div className="relative mt-1.5">
                  <MapPin className="pointer-events-none absolute left-4 top-3.5 text-[#173f35]/40" size={18} />
                  <input
                    id="onboarding-city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: Bordeaux, Paris, Lyon, Marseille…"
                    className="w-full rounded-2xl border-2 border-[#173f35]/10 bg-white py-3.5 pl-11 pr-4 text-sm text-[#173f35] outline-none transition placeholder:text-[#173f35]/25 focus:border-[#e9683a] focus:ring-4 focus:ring-[#e9683a]/10"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={!name.trim() && !initialName}
              onClick={() => setStep(2)}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#e9683a] py-4 text-sm font-extrabold text-white transition hover:bg-[#d9582d] disabled:opacity-40 shadow-lg shadow-[#e9683a]/25"
            >
              Étape suivante <ArrowRight size={18} />
            </button>
          </motion.div>
        )}

        {/* STEP 2: HOW IT WORKS */}
        {step === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="mt-6"
          >
            <div className="text-center sm:text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#173f35]/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#173f35]">
                <Sparkles size={13} className="text-[#e9683a]" /> Le Concept
              </span>
              <h2 className="mt-2 font-display text-3xl font-semibold text-[#173f35] sm:text-4xl">
                Comment fonctionne VALUO ?
              </h2>
              <p className="mt-1 text-sm text-[#6f7e76]">
                3 rituels quotidiens simples pour aiguiser ton regard et triompher.
              </p>
            </div>

            <div className="mt-6 space-y-3.5">
              <div className="flex items-start gap-3.5 rounded-2xl border border-[#173f35]/10 bg-white p-4 transition hover:border-[#e9683a]/40">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fff0eb] text-[#e9683a]">
                  <Camera size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#173f35]">
                    1. Défi Photo Quotidien
                  </h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#68766e]">
                    Chaque jour à 8h, un nouveau thème visuel est lancé. Capture et partage ta photo avant minuit.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-2xl border border-[#173f35]/10 bg-white p-4 transition hover:border-[#e9683a]/40">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fbf4db] text-[#946914]">
                  <PackageOpen size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#173f35]">
                    2. Mystery Box & Juste Prix
                  </h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#68766e]">
                    Estime la valeur exacte de l'objet mystère du jour. Plus ton estimation est proche, plus tu cumules de points.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-2xl border border-[#173f35]/10 bg-white p-4 transition hover:border-[#e9683a]/40">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf7f2] text-[#488262]">
                  <Trophy size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#173f35]">
                    3. Survie en Escouade de 4
                  </h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#68766e]">
                    Tu joues avec 3 rivaux. Chaque samedi soir à 20h, le joueur avec le score le plus bas est éliminé du groupe !
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center justify-center gap-1.5 rounded-2xl border-2 border-[#173f35]/15 px-5 py-3.5 text-sm font-bold text-[#173f35] transition hover:bg-white"
              >
                <ChevronLeft size={18} /> Retour
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#e9683a] py-3.5 text-sm font-extrabold text-white transition hover:bg-[#d9582d] shadow-lg shadow-[#e9683a]/25"
              >
                Continuer <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: JOIN OR MATCH SQUAD */}
        {step === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="mt-6"
          >
            <div className="text-center sm:text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f3c969]/20 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#8a6311]">
                <Users size={13} /> Première Escouade
              </span>
              <h2 className="mt-2 font-display text-3xl font-semibold text-[#173f35] sm:text-4xl">
                Rejoins tes premiers rivaux
              </h2>
              <p className="mt-1 text-sm text-[#6f7e76]">
                Pour participer aux éliminations du samedi, forme ton escouade de 4 joueurs.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => setSquadChoice("auto")}
                className={`flex w-full items-start gap-4 rounded-2xl border-2 p-4 text-left transition ${
                  squadChoice === "auto"
                    ? "border-[#e9683a] bg-[#fffbf9] shadow-sm"
                    : "border-[#173f35]/10 bg-white hover:border-[#173f35]/25"
                }`}
              >
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${squadChoice === "auto" ? "bg-[#e9683a] text-white" : "bg-[#f5f0e5] text-[#173f35]"}`}>
                  <Flame size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-[#173f35]">
                      Matchmaking Automatique
                    </h3>
                    <span className="rounded-full bg-[#e9683a]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#e9683a]">
                      Recommandé
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#6e7c74]">
                    On te place instantanément dans une escouade équilibrée de 4 joueurs pour démarrer sans attendre.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSquadChoice("code")}
                className={`flex w-full items-start gap-4 rounded-2xl border-2 p-4 text-left transition ${
                  squadChoice === "code"
                    ? "border-[#e9683a] bg-[#fffbf9] shadow-sm"
                    : "border-[#173f35]/10 bg-white hover:border-[#173f35]/25"
                }`}
              >
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${squadChoice === "code" ? "bg-[#e9683a] text-white" : "bg-[#f5f0e5] text-[#173f35]"}`}>
                  <ShieldCheck size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-extrabold text-[#173f35]">
                    J'ai un code d'invitation
                  </h3>
                  <p className="mt-1 text-xs text-[#6e7c74]">
                    Rejoins l'escouade privée créée par tes amis avec leur code à 6 caractères.
                  </p>
                  {squadChoice === "code" && (
                    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={squadCodeInput}
                        onChange={(e) => setSquadCodeInput(e.target.value.toUpperCase())}
                        placeholder="Ex: VALUO-789"
                        className="w-full rounded-xl border border-[#173f35]/15 bg-white px-3.5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-[#173f35] outline-none focus:border-[#e9683a]"
                      />
                    </div>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSquadChoice("skip")}
                className={`flex w-full items-center gap-4 rounded-2xl border-2 p-3.5 text-left transition ${
                  squadChoice === "skip"
                    ? "border-[#e9683a] bg-[#fffbf9]"
                    : "border-transparent text-[#7a8780] hover:text-[#173f35]"
                }`}
              >
                <span className="text-xs font-bold">
                  Explorer en solo d'abord (rejoindre une escouade plus tard)
                </span>
              </button>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center justify-center gap-1.5 rounded-2xl border-2 border-[#173f35]/15 px-5 py-3.5 text-sm font-bold text-[#173f35] transition hover:bg-white"
              >
                <ChevronLeft size={18} /> Retour
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#e9683a] py-3.5 text-sm font-extrabold text-white transition hover:bg-[#d9582d] shadow-lg shadow-[#e9683a]/25"
              >
                Étape suivante <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 4: PERSONALIZE PASSWORD */}
        {step === 4 && (
          <motion.div
            key="step-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="mt-6"
          >
            <div className="text-center sm:text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e9683a]/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#e9683a]">
                <ShieldAlert size={13} /> Sécurité du compte · Étape 4/5
              </span>
              <h2 className="mt-2 font-display text-3xl font-semibold text-[#173f35] sm:text-4xl">
                Définis ton mot de passe
              </h2>
              <p className="mt-1 text-sm text-[#6f7e76]">
                Choisis un mot de passe personnel pour sécuriser ton compte et te reconnecter facilement.
              </p>
            </div>

            <div className="mt-5 rounded-2xl bg-[#f5f0e5] p-4 text-xs leading-relaxed text-[#506158] border border-[#173f35]/8">
              <p className="font-bold text-[#173f35] flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-[#488262]" /> Sécurise ton accès
              </p>
              <p className="mt-1">
                Définis un mot de passe robuste (au moins 8 caractères) pour protéger ton compte et pouvoir te connecter sur tous tes appareils.
              </p>
            </div>

            {pwdError && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 border border-red-200">
                {pwdError}
              </div>
            )}

            <div className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="onboarding-pwd"
                  className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]"
                >
                  Nouveau mot de passe
                </label>
                <div className="relative mt-1.5">
                  <KeyRound className="pointer-events-none absolute left-4 top-3.5 text-[#173f35]/40" size={17} />
                  <input
                    id="onboarding-pwd"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Au moins 8 caractères (lettres et chiffres)"
                    className="w-full rounded-2xl border-2 border-[#173f35]/10 bg-white py-3.5 pl-11 pr-11 text-sm text-[#173f35] outline-none transition focus:border-[#e9683a] focus:ring-4 focus:ring-[#e9683a]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Afficher"
                    className="absolute right-3.5 top-3.5 text-[#173f35]/40 hover:text-[#173f35]"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="onboarding-confirm"
                  className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]"
                >
                  Confirmer le mot de passe
                </label>
                <div className="relative mt-1.5">
                  <KeyRound className="pointer-events-none absolute left-4 top-3.5 text-[#173f35]/40" size={17} />
                  <input
                    id="onboarding-confirm"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Retape ton mot de passe"
                    className="w-full rounded-2xl border-2 border-[#173f35]/10 bg-white py-3.5 pl-11 pr-4 text-sm text-[#173f35] outline-none transition focus:border-[#e9683a] focus:ring-4 focus:ring-[#e9683a]/10"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center justify-center gap-1.5 rounded-2xl border-2 border-[#173f35]/15 px-5 py-3.5 text-sm font-bold text-[#173f35] transition hover:bg-white"
              >
                <ChevronLeft size={18} /> Retour
              </button>
              <button
                type="button"
                onClick={handleValidatePasswordStep}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#e9683a] py-3.5 text-sm font-extrabold text-white transition hover:bg-[#d9582d] shadow-lg shadow-[#e9683a]/25"
              >
                Dernière étape <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 5: NOTIFICATIONS & INSTALL APP */}
        {step === 5 && (
          <motion.div
            key="step-5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="mt-6"
          >
            <div className="text-center sm:text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f3c969]/30 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#7a580a]">
                <Sparkles size={13} className="text-[#e9683a]" /> Expérience Optimale · Étape 5/5
              </span>
              <h2 className="mt-2 font-display text-3xl font-semibold text-[#173f35] sm:text-4xl">
                Prépare ton jeu
              </h2>
              <p className="mt-1 text-sm text-[#6f7e76]">
                Pour ne rater aucun défi, active les alertes et installe l'application sur ton écran d'accueil.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {/* Card 1: Notifications */}
              <div className="rounded-2xl border-2 border-[#173f35]/10 bg-white p-5 transition hover:border-[#173f35]/20 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e9683a]/10 text-[#e9683a]">
                      <BellRing size={22} />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-[#173f35] flex items-center gap-1.5">
                        Activer les notifications
                        {notifGranted && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200">
                            <Check size={11} strokeWidth={3} /> Activé
                          </span>
                        )}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-[#68766e]">
                        Rappels à 08h00 pour le défi photo, 20h00 pour la Mystery Box et notifications en direct des actions de ton escouade.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end">
                  {notifGranted ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200">
                      <CheckCircle2 size={16} /> Alertes activées avec succès !
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestNotification}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#173f35] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#245b4c] shadow-sm active:scale-95"
                    >
                      <Bell size={14} /> Activer les alertes
                    </button>
                  )}
                </div>
              </div>

              {/* Card 2: Install App */}
              <div className="rounded-2xl border-2 border-[#e9683a]/30 bg-[#fffbf9] p-5 transition shadow-sm">
                <div className="flex items-start gap-3.5">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e9683a] text-white">
                    <Smartphone size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-[#173f35]">
                        Installer l'application
                      </h3>
                      <span className="rounded-full bg-[#e9683a]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#e9683a]">
                        Expérience recommandée
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[#68766e]">
                      Profite d'une meilleure fluidité, d'un affichage plein écran et d'un accès instantané sans passer par ton navigateur.
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <button
                    type="button"
                    onClick={handleTriggerInstall}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#e9683a] py-3 text-xs font-extrabold text-white transition hover:bg-[#d9582d] shadow-md shadow-[#e9683a]/20 active:scale-[0.99]"
                  >
                    <Download size={16} />
                    <span>
                      {canInstall
                        ? "👉 Clique ICI pour installer l'application"
                        : "👉 Clique ICI pour ajouter l'application"}
                    </span>
                  </button>

                  {/* Safari / iOS guide */}
                  <div className="flex items-center gap-2 rounded-xl bg-white p-2.5 text-[11px] font-medium text-[#68766e] border border-[#173f35]/10">
                    <Share2 size={14} className="shrink-0 text-[#e9683a]" />
                    <span>
                      <strong>Sur iPhone (Safari) :</strong> Clique sur <strong>Partager</strong> puis <strong>« Sur l'écran d'accueil »</strong>.
                    </span>
                  </div>

                  {installClicked && (
                    <p className="text-center text-[11px] font-bold text-[#173f35]/70">
                      {canInstall
                        ? "L'invitation d'installation a été ouverte sur ton appareil."
                        : "Suis les instructions de ton navigateur ou du menu Partager pour ajouter VALUO."}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex items-center justify-center gap-1.5 rounded-2xl border-2 border-[#173f35]/15 px-5 py-3.5 text-sm font-bold text-[#173f35] transition hover:bg-white"
              >
                <ChevronLeft size={18} /> Retour
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#173f35] py-3.5 text-sm font-extrabold text-white transition hover:bg-[#245b4c] shadow-lg shadow-[#173f35]/25 active:scale-[0.99]"
              >
                Entrer sur VALUO <Sparkles size={18} className="text-[#f3c969]" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}

