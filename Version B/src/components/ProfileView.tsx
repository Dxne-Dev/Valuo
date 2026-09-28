import { motion } from "framer-motion";
import { Download, Edit3, Gamepad2, Heart, LogOut, MapPin, Trophy } from "lucide-react";
import { avatars, initialPosts, media } from "../data";

type ProfileViewProps = {
  onLogout: () => void;
  onInstall: () => void;
};

export default function ProfileView({ onLogout, onInstall }: ProfileViewProps) {
  const gallery = [initialPosts[0].photo, media.camera, media.dishes, media.figurines, media.phone, media.market];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} className="mx-auto max-w-5xl">
      <section className="relative overflow-hidden rounded-[30px] bg-[#173f35] px-6 pb-7 pt-24 text-white sm:px-10 sm:pb-9 sm:pt-28">
        <div className="absolute inset-x-0 top-0 h-36 overflow-hidden opacity-40">
          <img src={media.market} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#173f35]" />
        </div>
        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-end">
          <img src={avatars.lea} alt="Léa Martin" className="h-24 w-24 rounded-full border-4 border-[#173f35] object-cover shadow-xl" />
          <div className="flex-1">
            <h1 className="font-display text-3xl font-semibold">Léa Martin</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/60"><MapPin size={14} /> Bordeaux · Membre depuis septembre 2026</p>
          </div>
          <button type="button" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-xs font-extrabold transition hover:bg-white hover:text-[#173f35]">
            <Edit3 size={14} /> Modifier
          </button>
        </div>
      </section>

      <div className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div className="mb-10 grid grid-cols-3 divide-x divide-[#173f35]/10 border-y border-[#173f35]/10 py-5 text-center">
            <div>
              <p className="font-display text-3xl font-semibold text-[#173f35]">12</p>
              <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-[#8a958f]">Objets estimés</p>
            </div>
            <div>
              <p className="font-display text-3xl font-semibold text-[#173f35]">3</p>
              <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-[#8a958f]">Victoires</p>
            </div>
            <div>
              <p className="font-display text-3xl font-semibold text-[#173f35]">248</p>
              <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-[#8a958f]">Points</p>
            </div>
          </div>

          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#173f35]">Mon cabinet de curiosités</h2>
              <p className="mt-1 text-sm text-[#8a958f]">6 contributions aux défis photo</p>
            </div>
            <Heart size={19} className="text-[#e9683a]" />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {gallery.map((photo, index) => (
              <motion.div key={`${photo}-${index}`} whileHover={{ scale: 0.98 }} className="aspect-square overflow-hidden rounded-[18px] bg-[#e9e3d8]">
                <img src={photo} alt="Contribution au défi photo" className="h-full w-full object-cover transition duration-500 hover:scale-105" />
              </motion.div>
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[24px] bg-[#f3c969] p-5 text-[#173f35]">
            <Trophy size={22} />
            <h2 className="mt-4 font-display text-xl font-semibold">Œil de lynx</h2>
            <p className="mt-2 text-xs leading-relaxed text-[#173f35]/65">Ton estimation moyenne se situe à seulement 14 € du juste prix. Tu es dans le top 18 %.</p>
          </section>

          <section className="divide-y divide-[#173f35]/8 border-y border-[#173f35]/8">
            <button type="button" onClick={onInstall} className="flex w-full items-center gap-3 py-4 text-left text-sm font-extrabold text-[#173f35] transition hover:text-[#e9683a]">
              <Download size={18} /> Installer l'application
            </button>
            <button type="button" className="flex w-full items-center gap-3 py-4 text-left text-sm font-extrabold text-[#173f35] transition hover:text-[#e9683a]">
              <Gamepad2 size={18} /> Historique des parties
            </button>
            <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 py-4 text-left text-sm font-extrabold text-[#b15437] transition hover:text-[#e9683a]">
              <LogOut size={18} /> Se déconnecter
            </button>
          </section>
        </aside>
      </div>
    </motion.div>
  );
}