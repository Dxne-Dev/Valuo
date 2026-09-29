import { AnimatePresence, motion } from "framer-motion";
import { Check, Eye, EyeOff, KeyRound, Loader2, ShieldAlert, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { updateUserPassword } from "@/lib/api";
import { validatePassword } from "@/lib/security";

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
    const validation = validatePassword(password);
    if (!validation.isValid) {
      setError(validation.error || "Le mot de passe ne respecte pas les critères de sécurité.");
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
            className="relative w-full max-w-md overflow-hidden rounded-[28px] bg-white p-6 shadow-2xl sm:p-8"
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-2 text-[#76837c] hover:bg-[#f5f0e5]"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e9683a]/10 text-[#e9683a]">
                <KeyRound size={22} />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#e9683a]">
                  Sécurité du compte
                </p>
                <h3 className="font-display text-xl font-semibold text-[#173f35]">
                  Définir votre mot de passe
                </h3>
              </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-[#68766e]">
              Vous vous êtes connecté avec un mot de passe temporaire. Définissez votre mot de passe personnel définitif pour sécuriser votre compte.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-2xl bg-[#fff0eb] p-3 text-xs font-semibold text-[#b54323]">
                  <ShieldAlert size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                  Nouveau mot de passe
                </label>
                <div className="relative mt-1.5 flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-[#173f35]/15 bg-[#fbf8f1] px-4 py-3 pr-10 text-sm font-semibold text-[#173f35] outline-none transition focus:border-[#e9683a] focus:bg-white focus:ring-4 focus:ring-[#e9683a]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-[#8a958f] hover:text-[#173f35]"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-[#76837c]">8 caractères minimum avec majuscule et chiffre.</p>
              </div>

              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                  Confirmer le mot de passe
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1.5 w-full rounded-2xl border border-[#173f35]/15 bg-[#fbf8f1] px-4 py-3 text-sm font-semibold text-[#173f35] outline-none transition focus:border-[#e9683a] focus:bg-white focus:ring-4 focus:ring-[#e9683a]/10"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-full border border-[#173f35]/15 bg-white py-3.5 text-xs font-extrabold text-[#173f35] hover:bg-[#f5f0e5]"
                >
                  Plus tard
                </button>
                <button
                  type="submit"
                  disabled={loading || !password || !confirm}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#e9683a] py-3.5 text-xs font-extrabold text-white shadow-lg shadow-[#e9683a]/25 transition hover:bg-[#d9582d] disabled:opacity-40"
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
