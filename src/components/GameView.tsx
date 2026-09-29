import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Clock3, Info, PackageOpen, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { type GroupData, media, type UserProfile } from "../data";

const realPrice = 68;

type GameViewProps = {
  group?: GroupData | null;
  currentUser?: UserProfile;
  onOpenGroup: () => void;
};

export default function GameView({ group, currentUser, onOpenGroup }: GameViewProps) {
  const [estimate, setEstimate] = useState("");
  const [revealed, setRevealed] = useState(false);
  const amount = Number(estimate.replace(",", ".")) || 0;

  const members = useMemo(() => {
    if (group?.members && group.members.length > 0) {
      return group.members;
    }
    return [
      {
        id: 1,
        name: currentUser?.name?.split(" ")[0] || "Moi",
        avatar: currentUser?.avatar || "https://images.pexels.com/photos/14842170/pexels-photo-14842170.jpeg",
        points: 0,
        change: 0,
        estimate: null,
      },
    ];
  }, [group, currentUser]);

  const results = useMemo(() => {
    return members
      .map((member) => ({ ...member, estimate: member.id === 1 ? amount : member.estimate ?? 0 }))
      .sort((a, b) => Math.abs((a.estimate ?? 0) - realPrice) - Math.abs((b.estimate ?? 0) - realPrice));
  }, [members, amount]);

  const userRank = results.findIndex((member) => member.id === 1) + 1;
  const earned = Math.max(0, 50 - Math.round(Math.abs(amount - realPrice) * 2));

  function submitEstimate(event: FormEvent) {
    event.preventDefault();
    if (amount > 0) setRevealed(true);
  }

  function resetGame() {
    setEstimate("");
    setRevealed(false);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} className="mx-auto max-w-5xl">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#e9683a]">
            <PackageOpen size={15} /> Mystery Box · Estimation du jour
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-[#173f35] sm:text-4xl">
            {revealed ? "Le juste prix" : "À combien l'estimes-tu ?"}
          </h1>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-[#efe7d8] px-4 py-2 text-xs font-bold text-[#66766d]">
          <Clock3 size={15} /> Révélation à 20 h
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!revealed ? (
          <motion.div
            key="estimate"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid overflow-hidden rounded-[32px] bg-white shadow-[0_24px_70px_-40px_rgba(23,63,53,.45)] md:grid-cols-[1.08fr_.92fr]"
          >
            <div className="relative min-h-[430px] overflow-hidden bg-[#d9d0bf] md:min-h-[590px]">
              <img src={media.mystery} alt="Vase en faïence, objet mystère du jour" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-6 pt-24 text-white md:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f3c969]">Indice du jour</p>
                <p className="mt-2 max-w-md font-display text-xl font-semibold">Une pièce décorative qui a traversé au moins trois générations.</p>
              </div>
            </div>

            <div className="flex flex-col justify-center p-6 sm:p-9 md:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e9683a]">Objet du jour</p>
              <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-[#173f35]">Vase en faïence à décor floral</h2>
              <p className="mt-4 text-sm leading-7 text-[#66766d]">
                Hauteur 31 cm. Signature partiellement visible sous la base. Quelques traces du temps, sans éclat majeur.
              </p>

              <div className="my-7 h-px bg-[#173f35]/10" />

              <form onSubmit={submitEstimate}>
                <label htmlFor="estimate" className="text-sm font-extrabold text-[#173f35]">Ton estimation</label>
                <div className="mt-3 flex items-center rounded-2xl border-2 border-[#173f35]/15 bg-[#fbf8f1] px-5 transition focus-within:border-[#e9683a] focus-within:ring-4 focus-within:ring-[#e9683a]/10">
                  <input
                    id="estimate"
                    type="number"
                    min="1"
                    max="9999"
                    inputMode="decimal"
                    value={estimate}
                    onChange={(event) => setEstimate(event.target.value)}
                    placeholder="00"
                    autoFocus
                    className="min-w-0 flex-1 bg-transparent py-4 font-display text-3xl font-semibold text-[#173f35] outline-none placeholder:text-[#173f35]/20"
                  />
                  <span className="font-display text-2xl font-semibold text-[#173f35]/45">€</span>
                </div>
                <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-[#8a958f]">
                  <Info className="mt-0.5 shrink-0" size={14} /> Ton estimation reste secrète jusqu'à la révélation.
                </p>
                <button
                  type="submit"
                  disabled={!amount}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#e9683a] px-5 py-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#d9582d] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  Valider mon estimation <Check size={17} />
                </button>
              </form>

              {group && (
                <div className="mt-7 flex items-center justify-between border-t border-[#173f35]/10 pt-5">
                  <div className="flex -space-x-2">
                    {members.slice(0, 4).map((member) => (
                      <img key={member.id} src={member.avatar} alt="" className="h-8 w-8 rounded-full border-2 border-white object-cover" />
                    ))}
                  </div>
                  <p className="text-xs font-semibold text-[#76837c]">Escouade « {group.name} »</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 180, damping: 22 }}>
            <section className="relative overflow-hidden rounded-[32px] bg-[#173f35] px-6 py-10 text-center text-white sm:px-10 sm:py-14">
              <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-[#f3c969]/12 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-[#e9683a]/20 blur-2xl" />
              <motion.div
                initial={{ rotate: -12, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 220 }}
                className="relative mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#f3c969] text-[#173f35]"
              >
                {userRank === 1 ? <Trophy size={28} /> : <Sparkles size={28} />}
              </motion.div>
              <p className="relative mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#f3c969]">Prix réel constaté</p>
              <p className="relative mt-2 font-display text-7xl font-semibold tracking-[-0.05em]">{realPrice} €</p>
              <p className="relative mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/65">
                {userRank === 1
                  ? `Avec ${amount} €, tu es le/la plus proche ! Tu remportes ${earned} points pour ton escouade.`
                  : `Ton estimation de ${amount} € te place en ${userRank}e position. Tu remportes ${earned} points.`}
              </p>
            </section>

            <section className="mx-auto -mt-5 max-w-3xl rounded-[28px] bg-white p-5 shadow-[0_24px_70px_-40px_rgba(23,63,53,.55)] sm:p-8">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-[#173f35]">Résultat du jour</h2>
                <span className="rounded-full bg-[#f2eadb] px-3 py-1.5 text-xs font-extrabold text-[#173f35]">+{earned} pts pour toi</span>
              </div>
              <div className="divide-y divide-[#173f35]/8">
                {results.map((member, index) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.18 + index * 0.08 }}
                    className="flex items-center gap-3 py-3.5"
                  >
                    <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-extrabold ${index === 0 ? "bg-[#f3c969] text-[#173f35]" : "bg-[#f2eee5] text-[#758078]"}`}>
                      {index + 1}
                    </span>
                    <img src={member.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[#173f35]">{member.name}{member.id === 1 ? " (toi)" : ""}</p>
                      <p className="text-xs text-[#8a958f]">Écart de {Math.abs((member.estimate ?? 0) - realPrice)} €</p>
                    </div>
                    <p className="font-display text-lg font-semibold text-[#173f35]">{member.estimate} €</p>
                  </motion.div>
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={onOpenGroup} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#e9683a] px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#d9582d]">
                  Voir mon escouade <ArrowLeft className="rotate-180" size={16} />
                </button>
                <button type="button" onClick={resetGame} className="flex items-center justify-center gap-2 rounded-full border border-[#173f35]/15 px-5 py-3.5 text-sm font-extrabold text-[#173f35] transition hover:bg-[#f5f0e5]">
                  <RotateCcw size={15} /> Recommencer
                </button>
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}