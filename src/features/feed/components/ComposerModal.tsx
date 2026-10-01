import { AnimatePresence, motion } from "framer-motion";
import { Camera, Clock, ImagePlus, Loader2, Lock, Sparkles, X } from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { uploadImage, type ChallengeData } from "../services/feedService";
import { useCountdown } from "@/lib/useCountdown";

export type ComposerModalProps = {
  open: boolean;
  onClose: () => void;
  onPublish: (photo: string, caption: string) => void;
  challenge?: ChallengeData | null;
  isAdmin?: boolean;
};

export default function ComposerModal({
  open,
  onClose,
  onPublish,
  challenge,
  isAdmin = false,
}: ComposerModalProps) {
  const [photo, setPhoto] = useState("");
  const [fileObject, setFileObject] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const countdown = useCountdown(challenge?.ends_at);
  const isExpired = Boolean(challenge && countdown.isExpired);
  const isBlocked = isExpired && !isAdmin;

  useEffect(() => {
    if (!open) {
      setPhoto("");
      setFileObject(null);
      setCaption("");
      setUploading(false);
    }
  }, [open]);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    if (isBlocked) return;
    const file = event.target.files?.[0];
    if (!file) return;
    setFileObject(file);
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!photo || isBlocked) return;

    setUploading(true);
    let finalPhotoUrl = photo;

    if (fileObject) {
      const publicUrl = await uploadImage(fileObject, "posts");
      if (publicUrl) {
        finalPhotoUrl = publicUrl;
      }
    }

    setUploading(false);
    onPublish(
      finalPhotoUrl,
      caption || `Ma photo pour le défi : ${challenge?.theme || "du jour"}.`
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#102f27]/60 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Publier une photo"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            onMouseDown={(event) => event.stopPropagation()}
            className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-t-[30px] bg-[#fbf8f1] p-5 sm:rounded-[30px] sm:p-7 shadow-2xl"
          >
            {/* Header with dynamic challenge info */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#e9683a]/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#e9683a]">
                    <Sparkles size={11} /> {isExpired ? "Défi Terminé" : "Défi Photo du Jour"}
                  </span>
                  {countdown.formatted && !isExpired && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#173f35]/10 px-2.5 py-0.5 text-[10px] font-extrabold text-[#173f35]">
                      <Clock size={11} /> Fin dans {countdown.formatted}
                    </span>
                  )}
                </div>
                <h2 className="mt-1.5 font-display text-2xl sm:text-3xl font-semibold text-[#173f35]">
                  {challenge?.theme || "Défi photo du jour"}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="rounded-full bg-[#eee8dc] p-2 text-[#173f35] hover:bg-[#e3dccf] transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Dynamic Brief */}
            {challenge?.brief && (
              <div className="mt-3.5 rounded-2xl bg-[#f5f0e5] p-3.5 text-xs leading-relaxed text-[#506158] border border-[#173f35]/8">
                <span className="font-bold text-[#173f35]">Consigne du jour : </span>
                {challenge.brief}
              </div>
            )}

            {isBlocked && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-red-50 p-3.5 text-xs font-bold text-red-600 border border-red-200">
                <Lock size={16} className="shrink-0" />
                <span>Le temps imparti pour ce défi est écoulé. Les publications sont verrouillées.</span>
              </div>
            )}

            <form onSubmit={submit} className="mt-5">
              {photo ? (
                <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-[#eee8dc] border border-[#173f35]/10 shadow-sm">
                  <img
                    src={photo}
                    alt="Aperçu de la publication"
                    className="h-full w-full object-cover"
                  />
                  <label className="absolute bottom-3 right-3 cursor-pointer rounded-full bg-white px-4 py-2 text-xs font-extrabold text-[#173f35] shadow-lg transition hover:bg-[#f3c969] active:scale-95">
                    Changer de photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={chooseFile}
                      className="sr-only"
                    />
                  </label>
                </div>
              ) : (
                <div className="grid aspect-[4/3] place-items-center rounded-[22px] border-2 border-dashed border-[#173f35]/20 bg-[#f3eee4] p-6 text-center transition hover:border-[#e9683a]/40">
                  <div>
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f3c969] text-[#173f35] shadow-sm">
                      <Camera size={26} />
                    </div>
                    <p className="mt-4 font-display text-xl font-semibold text-[#173f35]">
                      Prends ta photo ou importe depuis ta galerie
                    </p>
                    <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-[#7d8982]">
                      Capture un objet qui répond au thème « <strong>{challenge?.theme || "du jour"}</strong> » et valide ton rituel quotidien.
                    </p>
                    <div className="mt-5 flex justify-center">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[#e9683a] px-6 py-3.5 text-xs font-extrabold text-white transition hover:bg-[#d9582d] shadow-md shadow-[#e9683a]/25 active:scale-95">
                        <ImagePlus size={16} /> Prendre ou choisir une photo
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={chooseFile}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <label
                htmlFor="caption"
                className="mt-5 block text-xs font-extrabold uppercase tracking-wider text-[#53655b]"
              >
                Légende de ta photo (optionnel)
              </label>
              <textarea
                id="caption"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder={`Raconte l'anecdote de ton cliché pour le défi "${challenge?.theme || "du jour"}"…`}
                rows={3}
                className="mt-1.5 w-full rounded-2xl border border-[#173f35]/15 bg-white p-3.5 text-sm text-[#173f35] outline-none placeholder:text-[#8a958f] focus:border-[#e9683a] focus:ring-4 focus:ring-[#e9683a]/10"
              />

              <div className="mt-3 flex items-center justify-between rounded-xl bg-[#173f35]/5 p-3 text-xs text-[#506158] border border-[#173f35]/5">
                <span className="flex items-center gap-1.5 font-bold text-[#173f35]">
                  <Sparkles size={14} className="text-[#e9683a]" /> +20 points VALUO
                </span>
                <span className="text-[#6e7c74]">Validation instantanée du rituel</span>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-2xl border-2 border-[#173f35]/15 bg-white py-3.5 text-xs font-extrabold text-[#173f35] hover:bg-[#f5f0e5] transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!photo || uploading}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#173f35] py-3.5 text-xs font-extrabold text-white shadow-lg shadow-[#173f35]/20 transition hover:bg-[#245b4c] disabled:opacity-40"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Envoi…
                    </>
                  ) : (
                    "Publier sur le Feed 🚀"
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
