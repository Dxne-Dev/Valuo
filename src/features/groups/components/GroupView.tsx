import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  CalendarDays,
  Check,
  Copy,
  Crown,
  Eye,
  Plus,
  QrCode,
  Radio,
  Share2,
  ShieldAlert,
  Sparkles,
  UserPlus,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { type GroupData, type UserProfile } from "@/data";
import { fetchAllMysteryBoxesList, type MysteryItemData } from "@/lib/api";

export type GroupViewProps = {
  group: GroupData | null;
  friends: string[];
  currentUser?: UserProfile;
  mysteryItem?: MysteryItemData | null;
  onCreateGroup: (name: string, invitedFriends: string[]) => void;
  onJoinGroup: (code: string) => void;
  onAutoMatch: () => void;
  onLeaveGroup: () => void;
  onShare: () => void;
  onNotice: (msg: string) => void;
  onRepublishRecruitment?: () => void;
};

export default function GroupView({
  group,
  friends,
  mysteryItem,
  onCreateGroup,
  onJoinGroup,
  onAutoMatch,
  onLeaveGroup,
  onShare,
  onNotice,
  onRepublishRecruitment,
}: GroupViewProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const [groupName, setGroupName] = useState("Les As du Flair");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [hoveredHistoryIndex, setHoveredHistoryIndex] = useState<number | null>(null);
  const [weeklyMysteryBoxes, setWeeklyMysteryBoxes] = useState<MysteryItemData[]>([]);

  useEffect(() => {
    fetchAllMysteryBoxesList().then((list) => {
      if (list && list.length > 0) {
        setWeeklyMysteryBoxes(list);
      }
    });
  }, []);

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!groupName.trim()) return;
    onCreateGroup(groupName.trim(), selectedFriends);
    setCreateOpen(false);
    setSelectedFriends([]);
  }

  function handleJoin(event: FormEvent) {
    event.preventDefault();
    if (!joinCodeInput.trim()) return;
    onJoinGroup(joinCodeInput.trim().toUpperCase());
    setJoinOpen(false);
    setJoinCodeInput("");
  }

  function toggleFriendSelection(friend: string) {
    setSelectedFriends((prev) =>
      prev.includes(friend) ? prev.filter((f) => f !== friend) : [...prev, friend],
    );
  }

  function copyGroupCode() {
    if (!group) return;
    navigator.clipboard?.writeText(group.code);
    onNotice(`Code ${group.code} copié dans le presse-papier !`);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} className="mx-auto max-w-5xl">
      {/* Header avec Actions */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#e9683a]">
            {group ? `Escouade active · Semaine ${group.week}` : "Escouade de jeu"}
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-[#173f35] sm:text-4xl">
            {group ? group.name : "Rejoins ou crée une escouade"}
          </h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-[#76837c]">
            <UsersRound size={16} />
            {group
              ? `${group.members.length} joueurs en duel cette semaine`
              : "3 à 4 joueurs par escouade · 1 éliminé par semaine"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {group ? (
            <>
              {group.members.length < 4 && onRepublishRecruitment && (
                <button
                  type="button"
                  onClick={onRepublishRecruitment}
                  className="inline-flex items-center gap-2 rounded-full border border-[#e9683a]/30 bg-[#fff6f2] px-4 py-2.5 text-xs font-extrabold text-[#e9683a] transition hover:bg-[#e9683a] hover:text-white"
                >
                  <Radio size={15} /> Recruter sur le Feed
                </button>
              )}
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-[#173f35]/15 bg-white px-4 py-2.5 text-xs font-extrabold text-[#173f35] transition hover:border-[#173f35]/30 hover:bg-[#f5f0e5]"
              >
                <UserPlus size={15} /> Inviter des amis
              </button>
              <button
                type="button"
                onClick={onShare}
                className="inline-flex items-center gap-2 rounded-full bg-[#173f35] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#245b4c]"
              >
                <Share2 size={15} /> Partager
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setJoinOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-[#173f35]/15 bg-white px-5 py-3 text-sm font-extrabold text-[#173f35] transition hover:bg-[#f5f0e5]"
              >
                <QrCode size={16} /> Rejoindre par code
              </button>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[#e9683a] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#e9683a]/25 transition hover:bg-[#d9582d]"
              >
                <Plus size={16} /> Créer une escouade
              </button>
            </>
          )}
        </div>
      </div>

      {/* Si pas de groupe actif */}
      {!group ? (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-[28px] border-2 border-dashed border-[#173f35]/15 bg-white p-7">
            <div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f3c969] text-[#173f35]">
                <Radio size={24} />
              </div>
              <h2 className="mt-4 font-display text-2xl font-semibold text-[#173f35]">
                Matchmaking instantané
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#76837c]">
                Trouve instantanément 3 coéquipiers (joueurs actifs ou rivaux IA) et commence le duel de la semaine sans attendre.
              </p>
            </div>
            <button
              type="button"
              onClick={onAutoMatch}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#173f35] py-3.5 text-xs font-extrabold text-white transition hover:bg-[#245b4c]"
            >
              <Sparkles size={15} /> Lancer le matchmaking (1 clic)
            </button>
          </div>

          <div className="flex flex-col justify-between rounded-[28px] bg-gradient-to-br from-[#173f35] to-[#102c25] p-7 text-white">
            <div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e9683a] text-white">
                <Users size={24} />
              </div>
              <h2 className="mt-4 font-display text-2xl font-semibold text-white">
                Créer une escouade privée
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Choisis le nom de ta bande, invite tes amis en direct avec un code secret et défiez-vous sur chaque Mystery Box.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#f3c969] py-3.5 text-xs font-extrabold text-[#173f35] transition hover:bg-white"
            >
              <Plus size={15} /> Configurer mon escouade
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Progression de la semaine */}
          {(() => {
            const currentDayOfWeek = new Date().getDay();
            const activeDayIndex = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
            const remainingObjects = activeDayIndex >= 6 ? 0 : Math.max(0, 5 - activeDayIndex);
            const progressHeadline =
              activeDayIndex === 5
                ? "Dernier objet aujourd'hui avant le verdict !"
                : activeDayIndex >= 6
                ? "Semaine terminée · Clôture de la ligue"
                : `Plus que ${remainingObjects} objet${remainingObjects > 1 ? "s" : ""} avant le verdict`;
            const completedRounds = Math.min(activeDayIndex, 6);

            const daysConfig = [
              { short: "L", name: "Lundi" },
              { short: "M", name: "Mardi" },
              { short: "M", name: "Mercredi" },
              { short: "J", name: "Jeudi" },
              { short: "V", name: "Vendredi" },
              { short: "S", name: "Samedi" },
            ];

            return (
              <>
                <section className="mb-8 rounded-[28px] bg-[#173f35] p-6 text-white sm:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f3c969]">
                        Progression de la semaine · Code : <span className="font-mono">{group.code}</span>
                      </p>
                      <p className="mt-2 font-display text-2xl font-semibold">{progressHeadline}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-white/60">
                      <CalendarDays size={16} /> Élimination samedi à 20 h
                    </div>
                  </div>

                  <div className="mt-7 grid grid-cols-6 gap-2 sm:gap-3">
                    {daysConfig.map((day, index) => {
                      const isPast = index < activeDayIndex;
                      const isToday = index === activeDayIndex;

                      return (
                        <div key={`${day.short}-${index}`} className="text-center">
                          <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ delay: index * 0.06 }}
                            className={`h-2 origin-left rounded-full transition-colors ${
                              isPast
                                ? "bg-[#f3c969]"
                                : isToday
                                ? "bg-[#e9683a] ring-2 ring-[#e9683a]/30 ring-offset-1 ring-offset-[#173f35]"
                                : "bg-white/15"
                            }`}
                          />
                          <p
                            className={`mt-2 text-[10px] font-extrabold ${
                              isToday
                                ? "text-[#e9683a]"
                                : isPast
                                ? "text-[#f3c969]"
                                : "text-white/45"
                            }`}
                          >
                            {day.short}
                          </p>
                          {isToday && (
                            <span className="hidden sm:inline-block text-[9px] font-semibold text-[#e9683a]">
                              En cours
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Classement & Historique */}
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_330px]">
                  <section>
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="font-display text-2xl font-semibold text-[#173f35]">Classement de l'escouade</h2>
                      <span className="text-xs font-bold text-[#8a958f]">
                        {completedRounds === 0
                          ? "Manche 1 en cours"
                          : `Après ${completedRounds} manche${completedRounds > 1 ? "s" : ""}`}
                      </span>
                    </div>
                    <div className="overflow-hidden rounded-[26px] border border-[#173f35]/8 bg-white">
                      {group.members.map((member, index) => (
                        <motion.div
                          key={member.id}
                          initial={{ opacity: 0, x: -18 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.08 }}
                          className={`relative flex items-center gap-4 border-b border-[#173f35]/8 p-4 last:border-0 sm:p-5 ${
                            group.members.length === 4 && index === group.members.length - 1 ? "bg-[#fff5f0]" : ""
                          }`}
                        >
                          <span
                            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-base font-semibold ${
                              index === 0 ? "bg-[#f3c969] text-[#173f35]" : "bg-[#f3efe6] text-[#7b8780]"
                            }`}
                          >
                            {index === 0 ? <Crown size={17} fill="currentColor" /> : index + 1}
                          </span>
                          <img src={member.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-extrabold text-[#173f35]">
                                {member.name}
                                {member.id === 1 ? " (toi)" : ""}
                              </p>
                              {member.isNpc && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#e9e5dc] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#748079]">
                                  <Bot size={10} /> IA
                                </span>
                              )}
                            </div>
                            <p className={`mt-1 text-xs font-bold ${member.change >= 0 ? "text-[#478463]" : "text-[#c66748]"}`}>
                              {member.change >= 0 ? "+" : ""}
                              {member.change} pts cette semaine
                            </p>
                          </div>
                          <p className="font-display text-2xl font-semibold text-[#173f35]">
                            {member.points}
                            <span className="ml-1 font-sans text-[10px] font-bold uppercase text-[#8a958f]">pts</span>
                          </p>
                          {group.members.length === 4 && index === group.members.length - 1 && (
                            <span className="absolute bottom-0 left-0 top-0 w-1 bg-[#e9683a]" />
                          )}
                        </motion.div>
                      ))}

                      {/* Empty slots for private squad */}
                      {Array.from({ length: Math.max(0, 4 - group.members.length) }).map((_, emptyIdx) => {
                        const slotNumber = group.members.length + emptyIdx + 1;
                        return (
                          <div
                            key={`empty-slot-${slotNumber}`}
                            className="flex items-center justify-between border-b border-[#173f35]/8 p-4 last:border-0 sm:p-5 bg-[#faf8f4]/60"
                          >
                            <div className="flex items-center gap-4">
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e8e4dc] font-display text-sm font-bold text-[#8a958f]">
                                {slotNumber}
                              </span>
                              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-dashed border-[#173f35]/20 bg-white text-[#173f35]/40">
                                <UserPlus size={18} />
                              </div>
                              <div>
                                <p className="font-extrabold text-sm text-[#173f35]/70">Place libre #{slotNumber}</p>
                                <p className="text-xs text-[#76837c]">En attente d'un ami…</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={copyGroupCode}
                              className="inline-flex items-center gap-1.5 rounded-full border border-[#173f35]/15 bg-white px-3.5 py-1.5 text-xs font-extrabold text-[#173f35] shadow-sm transition hover:bg-[#173f35] hover:text-white"
                            >
                              <Copy size={13} /> Inviter
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex items-start gap-3 rounded-2xl bg-[#fff0e9] p-4 text-[#a1482b]">
                      <ShieldAlert className="mt-0.5 shrink-0" size={18} />
                      <p className="text-xs leading-relaxed">
                        <strong>Zone d'élimination :</strong> le joueur en 4e position quittera l'escouade samedi à 20 h et devra rejoindre un nouveau groupe pour la semaine suivante.
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-[#173f35]/10 pt-4">
                      <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="text-xs font-bold text-[#6a7972] hover:text-[#173f35]"
                      >
                        + Créer une autre escouade
                      </button>
                      <button
                        type="button"
                        onClick={onLeaveGroup}
                        className="text-xs font-bold text-[#b15437] hover:underline"
                      >
                        Quitter cette escouade
                      </button>
                    </div>
                  </section>

                  <section>
                    <h2 className="mb-4 font-display text-2xl font-semibold text-[#173f35]">Historique de la semaine</h2>
                    <div className="space-y-3">
                      {daysConfig.map((day, idx) => {
                        const isPast = idx < activeDayIndex;
                        const isToday = idx === activeDayIndex;
                        const dayNum = idx + 1;

                        const matchedBox =
                          (isToday && mysteryItem) ||
                          weeklyMysteryBoxes.find((b) => b.dayNumber === dayNum);

                        const hasBox = Boolean(matchedBox && matchedBox.image);
                        const boxTitle = matchedBox?.title || `Mystery Box ${day.name}`;
                        const boxPhoto = matchedBox?.image;
                        const formattedPrice = matchedBox?.realPrice
                          ? `${Number(matchedBox.realPrice).toLocaleString("fr-FR")} FCFA`
                          : "Non renseigné";

                        if (isToday) {
                          return (
                            <div
                              key={`hist-${day.short}-${idx}`}
                              onMouseEnter={() => setHoveredHistoryIndex(idx)}
                              onMouseLeave={() => setHoveredHistoryIndex(null)}
                              className="relative group flex items-center justify-between gap-3 rounded-2xl border border-dashed border-[#e9683a]/40 bg-[#fff6f2] p-4 transition-all duration-200 hover:border-[#e9683a] hover:shadow-md cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#e9683a] font-display text-lg font-semibold text-white">
                                  J{dayNum}
                                </div>
                                <div>
                                  <p className="text-sm font-extrabold text-[#173f35]">{day.name} · Mystery Box du jour</p>
                                  <p className="text-xs font-semibold text-[#e9683a]">Estimation ouverte jusqu'à 20 h</p>
                                </div>
                              </div>

                              {hasBox && (
                                <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#e9683a] shadow-sm border border-[#e9683a]/20">
                                  <Eye size={11} /> Aperçu
                                </span>
                              )}

                              <AnimatePresence>
                                {hoveredHistoryIndex === idx && hasBox && boxPhoto && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 8 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 8 }}
                                    transition={{ duration: 0.18, ease: "easeOut" }}
                                    className="pointer-events-none absolute bottom-full right-0 mb-3 z-30 hidden md:block w-48 overflow-hidden rounded-2xl border border-[#173f35]/15 bg-white p-2 shadow-2xl"
                                  >
                                    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#d9d0bf]">
                                      <img
                                        src={boxPhoto}
                                        alt={boxTitle}
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                      <div className="absolute bottom-2 left-2 right-2 text-white">
                                        <p className="text-[9px] font-extrabold uppercase tracking-wider text-[#f3c969]">
                                          Mystery Box J{dayNum}
                                        </p>
                                        <p className="truncate text-xs font-bold">{boxTitle}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between px-1.5 pt-2 text-[11px] font-bold text-[#173f35]">
                                      <span className="text-[#76837c]">Prix révélé à 20 h</span>
                                      <span className="font-extrabold text-[#e9683a]">Secret</span>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        }

                        if (isPast) {
                          return (
                            <div
                              key={`hist-${day.short}-${idx}`}
                              onMouseEnter={() => hasBox && setHoveredHistoryIndex(idx)}
                              onMouseLeave={() => setHoveredHistoryIndex(null)}
                              className="relative group flex items-center justify-between gap-3 rounded-2xl border border-[#173f35]/8 bg-white p-4 transition-all duration-200 hover:border-[#173f35]/25 hover:shadow-md cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#f3c969]/30 font-display text-lg font-semibold text-[#173f35]">
                                  J{dayNum}
                                </div>
                                <div>
                                  <p className="text-sm font-extrabold text-[#173f35]">
                                    {day.name} {hasBox ? `· ${boxTitle}` : ""}
                                  </p>
                                  <p className="text-xs text-[#76837c]">
                                    {hasBox ? `Manche clôturée · ${formattedPrice}` : "Manche clôturée"}
                                  </p>
                                </div>
                              </div>

                              {hasBox && (
                                <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-[#fbf8f1] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#76837c] group-hover:text-[#173f35] group-hover:bg-[#f5f0e5] transition border border-[#173f35]/8">
                                  <Eye size={11} /> Voir
                                </span>
                              )}

                              <AnimatePresence>
                                {hoveredHistoryIndex === idx && hasBox && boxPhoto && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 8 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 8 }}
                                    transition={{ duration: 0.18, ease: "easeOut" }}
                                    className="pointer-events-none absolute bottom-full right-0 mb-3 z-30 hidden md:block w-48 overflow-hidden rounded-2xl border border-[#173f35]/15 bg-white p-2 shadow-2xl"
                                  >
                                    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#d9d0bf]">
                                      <img
                                        src={boxPhoto}
                                        alt={boxTitle}
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                      <div className="absolute bottom-2 left-2 right-2 text-white">
                                        <p className="text-[9px] font-extrabold uppercase tracking-wider text-[#f3c969]">
                                          Manche clôturée J{dayNum}
                                        </p>
                                        <p className="truncate text-xs font-bold">{boxTitle}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between px-1.5 pt-2 text-[11px] font-bold text-[#173f35]">
                                      <span className="text-[#76837c]">Prix réel</span>
                                      <span className="font-extrabold text-[#173f35]">{formattedPrice}</span>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        }

                        return (
                          <div key={`hist-${day.short}-${idx}`} className="flex items-center gap-3 rounded-2xl border border-[#173f35]/5 bg-[#fbf8f1]/60 p-4 opacity-60">
                            <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#173f35]/5 font-display text-lg font-semibold text-[#76837c]">
                              J{idx + 1}
                            </div>
                            <div>
                              <p className="text-sm font-extrabold text-[#76837c]">{day.name}</p>
                              <p className="text-xs text-[#9aa59f]">À venir · Débloqué à 08 h</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </>
            );
          })()}
        </>
      )}

      {/* Modal Créer une escouade */}
      <AnimatePresence>
        {createOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCreateOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl sm:p-8"
            >
              <div className="flex items-center justify-between border-b border-[#173f35]/8 pb-4">
                <div className="flex items-center gap-2">
                  <Users size={20} className="text-[#e9683a]" />
                  <h3 className="font-display text-2xl font-semibold text-[#173f35]">Créer une escouade</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-full p-2 text-[#76837c] hover:bg-[#f5f0e5]"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="mt-5 space-y-5">
                <div>
                  <label htmlFor="group-name" className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                    Nom de l'escouade
                  </label>
                  <input
                    id="group-name"
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    required
                    placeholder="Ex: Les As du Flair"
                    className="mt-1.5 w-full rounded-2xl border border-[#173f35]/15 bg-[#fbf8f1] px-4 py-3 text-sm font-semibold text-[#173f35] outline-none focus:border-[#e9683a] focus:ring-4 focus:ring-[#e9683a]/10"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                      Inviter des amis ({selectedFriends.length}/3)
                    </label>
                    <span className="text-[11px] text-[#76837c]">Code secret unique à partager</span>
                  </div>

                  {friends.length === 0 ? (
                    <p className="mt-2 rounded-2xl bg-[#f5f0e5] p-4 text-xs text-[#76837c] leading-relaxed">
                      Aucun ami dans ta liste pour l'instant. L'escouade sera créée avec toi comme seul membre (1/4) et tu obtiendras un code secret unique à leur partager pour qu'ils te rejoignent.
                    </p>
                  ) : (
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
                      {friends.map((friend) => {
                        const isSelected = selectedFriends.includes(friend);
                        return (
                          <button
                            key={friend}
                            type="button"
                            onClick={() => toggleFriendSelection(friend)}
                            className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition ${
                              isSelected
                                ? "border-[#e9683a] bg-[#fff6f2]"
                                : "border-[#173f35]/10 bg-white hover:bg-[#fbf8f1]"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#173f35] text-xs font-bold text-white">
                                {friend[0]}
                              </span>
                              <span className="text-sm font-bold text-[#173f35]">{friend}</span>
                            </div>
                            <span
                              className={`grid h-6 w-6 place-items-center rounded-full border ${
                                isSelected
                                  ? "border-[#e9683a] bg-[#e9683a] text-white"
                                  : "border-[#173f35]/20 text-transparent"
                              }`}
                            >
                              <Check size={14} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl bg-[#f5f0e5] p-4 text-xs leading-relaxed text-[#506158]">
                  <strong>Règle du jeu :</strong> Chaque jour, les membres de l'escouade reçoivent le même objet mystère à estimer. Le samedi soir, le dernier au classement est éliminé !
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateOpen(false)}
                    className="flex-1 rounded-full border border-[#173f35]/15 bg-white py-3.5 text-xs font-extrabold text-[#173f35] hover:bg-[#f5f0e5]"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-full bg-[#e9683a] py-3.5 text-xs font-extrabold text-white shadow-lg shadow-[#e9683a]/25 transition hover:bg-[#d9582d]"
                  >
                    Créer et démarrer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Rejoindre par code */}
      <AnimatePresence>
        {joinOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setJoinOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl sm:p-8"
            >
              <div className="flex items-center justify-between border-b border-[#173f35]/8 pb-4">
                <div className="flex items-center gap-2">
                  <QrCode size={20} className="text-[#173f35]" />
                  <h3 className="font-display text-2xl font-semibold text-[#173f35]">Rejoindre une escouade</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setJoinOpen(false)}
                  className="rounded-full p-2 text-[#76837c] hover:bg-[#f5f0e5]"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleJoin} className="mt-5 space-y-5">
                <div>
                  <label htmlFor="join-code" className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                    Code d'invitation (6-10 caractères)
                  </label>
                  <input
                    id="join-code"
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value)}
                    required
                    placeholder="Ex: VALUO-789"
                    className="mt-1.5 w-full uppercase font-mono rounded-2xl border border-[#173f35]/15 bg-[#fbf8f1] px-4 py-3 text-base font-bold text-[#173f35] outline-none tracking-widest focus:border-[#e9683a] focus:ring-4 focus:ring-[#e9683a]/10"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setJoinOpen(false)}
                    className="flex-1 rounded-full border border-[#173f35]/15 bg-white py-3.5 text-xs font-extrabold text-[#173f35] hover:bg-[#f5f0e5]"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-full bg-[#173f35] py-3.5 text-xs font-extrabold text-white transition hover:bg-[#245b4c]"
                  >
                    Rejoindre
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Inviter des amis / Partager le code */}
      <AnimatePresence>
        {inviteOpen && group && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInviteOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl sm:p-8"
            >
              <div className="flex items-center justify-between border-b border-[#173f35]/8 pb-4">
                <div className="flex items-center gap-2">
                  <UserPlus size={20} className="text-[#e9683a]" />
                  <h3 className="font-display text-2xl font-semibold text-[#173f35]">Inviter des amis</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  className="rounded-full p-2 text-[#76837c] hover:bg-[#f5f0e5]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <p className="text-sm text-[#506158]">
                  Partage ce code à tes amis pour qu'ils rejoignent directement l'escouade <strong>{group.name}</strong> :
                </p>

                <div className="flex items-center justify-between rounded-2xl bg-[#f5f0e5] p-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#76837c]">Code d'invitation</p>
                    <p className="font-mono text-2xl font-extrabold text-[#173f35] tracking-wider">{group.code}</p>
                  </div>
                  <button
                    type="button"
                    onClick={copyGroupCode}
                    className="flex items-center gap-1.5 rounded-full bg-[#173f35] px-4 py-2 text-xs font-extrabold text-white transition hover:bg-[#245b4c]"
                  >
                    <Copy size={13} /> Copier
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onShare}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#e9683a] py-3.5 text-xs font-extrabold text-white shadow-lg shadow-[#e9683a]/25 transition hover:bg-[#d9582d]"
                  >
                    <Share2 size={15} /> Partager le lien d'invitation
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
