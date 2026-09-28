import { AnimatePresence, motion } from "framer-motion";
import { Check, Eye, EyeOff, KeyRound, Loader2, ShieldAlert, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { updateUserPassword } from "../lib/api";

type PasswordChangeModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function PasswordChangeModal({
  open,
  onClose,
  onSuccess,
}: PasswordChangeModalProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await updateUserPassword(password);
      if (res?.error) {
        setError(res.error.message || "Erreur lors de la mise à jour.");
      } else {
        localStorage.removeItem("valuo_temp_password_notice");
        onSuccess();
      }
    } catch (err: any) {
      setError(err?.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#102f27]/65 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Changer le mot de passe temporaire"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-[30px] bg-[#fbf8f1] p-6 shadow-2xl border border-[#173f35]/10 sm:p-8"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff0eb] text-[#e9683a]">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#e9683a]">
                    Sécurité du compte
                  </span>
                  <h2 className="font-display text-xl font-semibold text-[#173f35]">
                    Personnalise ton mot de passe
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="rounded-full bg-[#eee8dc] p-2 text-[#173f35] hover:bg-[#e3dccf]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 rounded-2xl bg-[#f5f0e5] p-3.5 text-xs leading-relaxed text-[#506158] border border-[#173f35]/8">
              <p className="font-bold text-[#173f35]">
                🔒 Mot de passe temporaire actif
              </p>
              <p className="mt-1">
                Tu es connecté avec un mot de passe temporaire envoyé par email. Celui-ci <strong className="text-[#e9683a]">expire dans 24h</strong>. Définis ton mot de passe définitif maintenant pour garder l'accès.
              </p>
            </div>

            {error && (
              <div className="mt-3 rounded-xl bg-red-50 p-2.5 text-xs font-bold text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="new-pwd"
                  className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]"
                >
                  Nouveau mot de passe
                </label>
                <div className="relative mt-1.5">
                  <KeyRound className="pointer-events-none absolute left-4 top-3.5 text-[#173f35]/40" size={17} />
                  <input
                    id="new-pwd"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Au moins 6 caractères"
                    className="w-full rounded-2xl border-2 border-[#173f35]/10 bg-white py-3 pl-11 pr-11 text-sm text-[#173f35] outline-none transition focus:border-[#e9683a] focus:ring-4 focus:ring-[#e9683a]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Afficher le mot de passe"
                    className="absolute right-3.5 top-3 text-[#173f35]/40 hover:text-[#173f35]"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-pwd"
                  className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]"
                >
                  Confirmer le mot de passe
                </label>
                <div className="relative mt-1.5">
                  <KeyRound className="pointer-events-none absolute left-4 top-3.5 text-[#173f35]/40" size={17} />
                  <input
                    id="confirm-pwd"
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Retape ton mot de passe"
                    className="w-full rounded-2xl border-2 border-[#173f35]/10 bg-white py-3 pl-11 pr-4 text-sm text-[#173f35] outline-none transition focus:border-[#e9683a] focus:ring-4 focus:ring-[#e9683a]/10"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-2xl border-2 border-[#173f35]/15 py-3 text-xs font-bold text-[#173f35] transition hover:bg-white"
                >
                  Plus tard
                </button>
                <button
                  type="submit"
                  disabled={!password || password.length < 6 || loading}
                  className="flex-[1.5] flex items-center justify-center gap-1.5 rounded-2xl bg-[#e9683a] py-3 text-xs font-extrabold text-white transition hover:bg-[#d9582d] disabled:opacity-40 shadow-lg shadow-[#e9683a]/25"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Check size={16} /> Enregistrer
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
