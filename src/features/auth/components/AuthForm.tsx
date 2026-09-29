import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, Sparkles, User } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export type AuthFormProps = {
  onSuccess?: (email: string, isTemp?: boolean) => void;
  onDemoLogin?: () => void;
};

export default function AuthForm({ onSuccess, onDemoLogin }: AuthFormProps) {
  const [tab, setTab] = useState<"register" | "login">("register");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { login, register, forgotPassword } = useAuth();

  async function handleRegister(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;

    setMessage(null);
    setLocalLoading(true);

    try {
      const res = await register(email.trim(), name.trim());
      if (res.error) {
        setMessage({ type: "error", text: res.error.message || "Erreur lors de l'inscription." });
      } else {
        setMessage({
          type: "success",
          text: "Un mot de passe temporaire a été envoyé à votre adresse email.",
        });
        setTab("login");
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Une erreur est survenue." });
    } finally {
      setLocalLoading(false);
    }
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setMessage(null);
    setLocalLoading(true);

    try {
      const res = await login(email.trim(), password.trim());
      if (!res.success) {
        setMessage({ type: "error", text: res.error?.message || "Identifiants incorrects." });
      } else {
        const isTemp = Boolean(res.data?.user?.user_metadata?.needs_password_change);
        onSuccess?.(email.trim(), isTemp);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Erreur de connexion." });
    } finally {
      setLocalLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setMessage({ type: "error", text: "Veuillez renseigner votre email ci-dessus." });
      return;
    }

    setMessage(null);
    setLocalLoading(true);
    try {
      await forgotPassword(email.trim());
      setMessage({
        type: "success",
        text: `Un lien de réinitialisation a été envoyé à ${email.trim()}.`,
      });
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Erreur d'envoi du lien." });
    } finally {
      setLocalLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto rounded-3xl bg-white p-6 sm:p-8 border border-[#173f35]/10 shadow-lg">
      <div className="flex rounded-2xl bg-[#eee8dc] p-1.5 mb-6">
        <button
          type="button"
          onClick={() => {
            setTab("register");
            setMessage(null);
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
            setMessage(null);
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-extrabold transition ${
            tab === "login" ? "bg-white text-[#173f35] shadow-sm" : "text-[#7d8882] hover:text-[#173f35]"
          }`}
        >
          <Lock size={14} /> Connexion
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-xl p-3 text-xs font-bold ${
            message.type === "error"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-[#edf7f2] text-[#173f35] border border-[#488262]/20"
          }`}
        >
          {message.text}
        </div>
      )}

      {tab === "register" ? (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="authform-name" className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
              Nom ou Pseudo
            </label>
            <div className="relative mt-1.5">
              <User className="pointer-events-none absolute left-4 top-3.5 text-[#173f35]/40" size={17} />
              <input
                id="authform-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Léa Martin"
                className="w-full rounded-2xl border-2 border-[#173f35]/10 bg-[#fbf8f1] py-3.5 pl-11 pr-4 text-sm text-[#173f35] outline-none transition focus:border-[#e9683a] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="authform-email" className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
              Adresse email
            </label>
            <div className="relative mt-1.5">
              <Mail className="pointer-events-none absolute left-4 top-3.5 text-[#173f35]/40" size={17} />
              <input
                id="authform-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="lea@exemple.fr"
                className="w-full rounded-2xl border-2 border-[#173f35]/10 bg-[#fbf8f1] py-3.5 pl-11 pr-4 text-sm text-[#173f35] outline-none transition focus:border-[#e9683a] focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!email.trim() || localLoading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#e9683a] px-5 py-4 text-sm font-extrabold text-white transition hover:bg-[#d9582d] disabled:opacity-40 shadow-lg shadow-[#e9683a]/25"
          >
            {localLoading ? <Loader2 size={18} className="animate-spin" /> : <>S'inscrire <ArrowRight size={17} /></>}
          </button>
        </form>
      ) : (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="authform-login-email" className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
              Adresse email
            </label>
            <div className="relative mt-1.5">
              <Mail className="pointer-events-none absolute left-4 top-3.5 text-[#173f35]/40" size={17} />
              <input
                id="authform-login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="lea@exemple.fr"
                className="w-full rounded-2xl border-2 border-[#173f35]/10 bg-[#fbf8f1] py-3.5 pl-11 pr-4 text-sm text-[#173f35] outline-none transition focus:border-[#e9683a] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="authform-login-pwd" className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                Mot de passe
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
                id="authform-login-pwd"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border-2 border-[#173f35]/10 bg-[#fbf8f1] py-3.5 pl-11 pr-11 text-sm text-[#173f35] outline-none transition focus:border-[#e9683a] focus:bg-white"
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
            disabled={!email.trim() || !password.trim() || localLoading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#173f35] px-5 py-4 text-sm font-extrabold text-white transition hover:bg-[#245b4c] disabled:opacity-40 shadow-lg shadow-[#173f35]/25"
          >
            {localLoading ? <Loader2 size={18} className="animate-spin" /> : <>Me connecter <ArrowRight size={17} /></>}
          </button>
        </form>
      )}

      {onDemoLogin && (
        <div className="mt-6 border-t border-[#173f35]/10 pt-4 text-center">
          <button
            type="button"
            onClick={onDemoLogin}
            className="text-xs font-bold text-[#738078] hover:text-[#e9683a] underline underline-offset-2"
          >
            Tester en mode Démo rapide (avec données mock)
          </button>
        </div>
      )}
    </div>
  );
}
