import { AnimatePresence, motion } from "framer-motion";
import { Camera, ImagePlus, Sparkles, X } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { media } from "../data";

type ComposerModalProps = {
  open: boolean;
  onClose: () => void;
  onPublish: (photo: string, caption: string) => void;
};

export default function ComposerModal({ open, onClose, onPublish }: ComposerModalProps) {
  const [photo, setPhoto] = useState("");
  const [caption, setCaption] = useState("");

  useEffect(() => {
    if (!open) {
      setPhoto("");
      setCaption("");
    }
  }, [open]);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!photo) return;
    onPublish(photo, caption || "Ma photo pour le défi du jour : une touche de rouge.");
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-[#102f27]/60 p-0 backdrop-blur-sm sm:items-center sm:p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Publier une photo"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            onMouseDown={(event) => event.stopPropagation()}
            className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-t-[30px] bg-[#fbf8f1] p-5 sm:rounded-[30px] sm:p-7"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#e9683a]">Défi du jour</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-[#173f35]">Une touche de rouge</h2>
              </div>
              <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-full bg-[#eee8dc] p-2 text-[#173f35] hover:bg-[#e3dccf]"><X size={18} /></button>
            </div>

            <form onSubmit={submit} className="mt-6">
              {photo ? (
                <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-[#eee8dc]">
                  <img src={photo} alt="Aperçu de la publication" className="h-full w-full object-cover" />
                  <label className="absolute bottom-3 right-3 cursor-pointer rounded-full bg-white px-4 py-2 text-xs font-extrabold text-[#173f35] shadow-lg transition hover:bg-[#f3c969]">
                    Changer
                    <input type="file" accept="image/*" capture="environment" onChange={chooseFile} className="sr-only" />
                  </label>
                </div>
              ) : (
                <div className="grid aspect-[4/3] place-items-center rounded-[22px] border-2 border-dashed border-[#173f35]/20 bg-[#f3eee4] p-6 text-center">
                  <div>
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f3c969] text-[#173f35]"><Camera size={25} /></div>
                    <p className="mt-4 font-display text-xl font-semibold text-[#173f35]">Montre-nous ta trouvaille</p>
                    <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-[#7d8982]">Prends une photo maintenant ou choisis-en une dans ta galerie.</p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#173f35] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#245b4c]">
                        <ImagePlus size={15} /> Choisir une photo
                        <input type="file" accept="image/*" capture="environment" onChange={chooseFile} className="sr-only" />
                      </label>
                      <button type="button" onClick={() => setPhoto(media.redPhone)} className="rounded-full border border-[#173f35]/15 px-4 py-2.5 text-xs font-extrabold text-[#173f35] hover:bg-white">Essayer avec un exemple</button>
                    </div>
                  </div>
                </div>
              )}

              <label htmlFor="caption" className="mt-5 block text-xs font-extrabold uppercase tracking-wider text-[#53655b]">Raconte son histoire</label>
              <textarea
                id="caption"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Où l'as-tu trouvé ? Pourquoi cet objet compte pour toi ?"
                rows={3}
                className="mt-2 w-full resize-none rounded-2xl border-2 border-[#173f35]/10 bg-white px-4 py-3 text-sm leading-relaxed text-[#173f35] outline-none transition placeholder:text-[#173f35]/25 focus:border-[#e9683a]"
              />
              <button type="submit" disabled={!photo} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#e9683a] px-5 py-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#d9582d] disabled:opacity-40 disabled:hover:translate-y-0">
                <Sparkles size={17} /> Publier ma trouvaille
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}