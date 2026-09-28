import { motion } from "framer-motion";
import { Bot, CalendarDays, Crown, Share2, ShieldAlert, UsersRound } from "lucide-react";
import { groupMembers, weekHistory } from "../data";

type GroupViewProps = {
  onShare: () => void;
};

export default function GroupView({ onShare }: GroupViewProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} className="mx-auto max-w-5xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#e9683a]">Groupe actif · Semaine 38</p>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-[#173f35] sm:text-4xl">La Bande à Dédé</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-[#76837c]"><UsersRound size={16} /> 3 joueurs et 1 brocanteur virtuel</p>
        </div>
        <button
          type="button"
          onClick={onShare}
          className="inline-flex items-center gap-2 rounded-full border border-[#173f35]/15 bg-white px-5 py-3 text-sm font-extrabold text-[#173f35] transition hover:-translate-y-0.5 hover:border-[#173f35]/30"
        >
          <Share2 size={16} /> Partager le groupe
        </button>
      </div>

      <section className="mb-8 rounded-[28px] bg-[#173f35] p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f3c969]">Progression de la semaine</p>
            <p className="mt-2 font-display text-2xl font-semibold">Plus que 2 objets avant le verdict</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-white/60"><CalendarDays size={16} /> Verdict samedi à 20 h</div>
        </div>
        <div className="mt-7 grid grid-cols-6 gap-2 sm:gap-3">
          {["L", "M", "M", "J", "V", "S"].map((day, index) => (
            <div key={`${day}-${index}`} className="text-center">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: index * 0.06 }}
                className={`h-2 origin-left rounded-full ${index < 3 ? "bg-[#f3c969]" : index === 3 ? "bg-[#e9683a]" : "bg-white/15"}`}
              />
              <p className={`mt-2 text-[10px] font-extrabold ${index === 3 ? "text-[#e9683a]" : "text-white/45"}`}>{day}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_330px]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold text-[#173f35]">Classement général</h2>
            <span className="text-xs font-bold text-[#8a958f]">Après 3 manches</span>
          </div>
          <div className="overflow-hidden rounded-[26px] border border-[#173f35]/8 bg-white">
            {groupMembers.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
                className={`relative flex items-center gap-4 border-b border-[#173f35]/8 p-4 last:border-0 sm:p-5 ${index === groupMembers.length - 1 ? "bg-[#fff5f0]" : ""}`}
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-base font-semibold ${index === 0 ? "bg-[#f3c969] text-[#173f35]" : "bg-[#f3efe6] text-[#7b8780]"}`}>
                  {index === 0 ? <Crown size={17} fill="currentColor" /> : index + 1}
                </span>
                <img src={member.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-extrabold text-[#173f35]">{member.name}{member.id === 1 ? " (toi)" : ""}</p>
                    {member.isNpc && <span className="inline-flex items-center gap-1 rounded-full bg-[#e9e5dc] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#748079]"><Bot size={10} /> PNJ</span>}
                  </div>
                  <p className={`mt-1 text-xs font-bold ${member.change >= 0 ? "text-[#478463]" : "text-[#c66748]"}`}>
                    {member.change >= 0 ? "+" : ""}{member.change} pts cette semaine
                  </p>
                </div>
                <p className="font-display text-2xl font-semibold text-[#173f35]">{member.points}<span className="ml-1 font-sans text-[10px] font-bold uppercase text-[#8a958f]">pts</span></p>
                {index === groupMembers.length - 1 && <span className="absolute bottom-0 left-0 top-0 w-1 bg-[#e9683a]" />}
              </motion.div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-[#fff0e9] p-4 text-[#a1482b]">
            <ShieldAlert className="mt-0.5 shrink-0" size={18} />
            <p className="text-xs leading-relaxed"><strong>Zone d'exclusion :</strong> le dernier du classement quittera le groupe samedi soir. En cas d'égalité, la dernière manche départagera les joueurs.</p>
          </div>
        </section>

        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold text-[#173f35]">Cette semaine</h2>
          <div className="space-y-3">
            {weekHistory.map((item, index) => (
              <motion.div
                key={item.day}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06 }}
                className="flex items-center gap-3 rounded-2xl bg-white p-3"
              >
                <img src={item.image} alt="" className="h-14 w-14 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#e9683a]">{item.day} · {item.price} €</p>
                  <p className="truncate text-sm font-extrabold text-[#173f35]">{item.object}</p>
                  <p className="text-xs text-[#8a958f]">Gagné par {item.winner}</p>
                </div>
              </motion.div>
            ))}
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-[#173f35]/20 p-3">
              <div className="grid h-14 w-14 place-items-center rounded-xl bg-[#efe9dd] font-display text-xl font-semibold text-[#87918b]">J4</div>
              <div>
                <p className="text-sm font-extrabold text-[#173f35]">Vase en faïence</p>
                <p className="text-xs text-[#8a958f]">Estimation en cours</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}