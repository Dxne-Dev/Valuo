import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  Check,
  Edit3,
  Flag,
  Flame,
  Heart,
  Loader2,
  Lock,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pin,
  PinOff,
  Radio,
  Send,
  Share2,
  Sparkles,
  Timer,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { type FeedPost, type UserProfile } from "@/data";
import { type ChallengeData } from "../services/feedService";
import { useCountdown } from "@/lib/useCountdown";

export type FeedFilter = "recents" | "friends" | "popular";

export type FeedViewProps = {
  posts: FeedPost[];
  friends: string[];
  currentUser: UserProfile;
  challenge?: ChallengeData | null;
  onToggleLike: (id: number | string) => void;
  onToggleFriend: (author: string) => void;
  onOpenComposer: () => void;
  onShare: (post: FeedPost) => void;
  onAddComment: (postId: number | string, text: string) => void;
  onJoinSquad?: (code: string) => void;
  onDeletePost?: (postId: string | number) => void;
  onUpdatePost?: (postId: string | number, updates: { caption?: string; photo?: string }) => void;
  onTogglePinPost?: (postId: string | number, currentPinStatus: boolean) => void;
};

const filters: { id: FeedFilter; label: string }[] = [
  { id: "recents", label: "Récents" },
  { id: "friends", label: "Amis" },
  { id: "popular", label: "Populaires" },
];

export default function FeedView({
  posts,
  friends,
  currentUser,
  challenge,
  onToggleLike,
  onToggleFriend,
  onOpenComposer,
  onShare,
  onAddComment,
  onJoinSquad,
  onDeletePost,
  onUpdatePost,
  onTogglePinPost,
}: FeedViewProps) {
  const [filter, setFilter] = useState<FeedFilter>("recents");
  const [openComments, setOpenComments] = useState<number | string | null>(null);
  const [drafts, setDrafts] = useState<Record<string | number, string>>({});

  // Dropdown menu & modals state
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | number | null>(null);
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editPhoto, setEditPhoto] = useState("");
  const [deleteConfirmPost, setDeleteConfirmPost] = useState<FeedPost | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionNotice, setActionNotice] = useState("");

  const isAdmin = Boolean(currentUser.isAdmin || currentUser.name === "Dxne - Admin");

  // Dynamic live countdown
  const countdown = useCountdown(challenge?.ends_at);
  const isChallengeExpired = Boolean(challenge && countdown.isExpired);
  const isUploadBlocked = isChallengeExpired && !isAdmin;

  function handleTriggerComposer() {
    if (isUploadBlocked) {
      setActionNotice("Le défi du jour est clos. Les uploads sont temporairement verrouillés.");
      return;
    }
    onOpenComposer();
  }

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside() {
      setActiveMenuPostId(null);
    }
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Notice auto dismiss
  useEffect(() => {
    if (!actionNotice) return;
    const timer = setTimeout(() => setActionNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [actionNotice]);

  function handleOpenEdit(post: FeedPost) {
    setEditingPost(post);
    setEditCaption(post.caption || "");
    setEditPhoto(post.photo || "");
    setActiveMenuPostId(null);
  }

  function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setEditPhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingPost) return;

    setSavingEdit(true);
    try {
      await onUpdatePost?.(editingPost.id, {
        caption: editCaption.trim(),
        photo: editPhoto,
      });
      setEditingPost(null);
      setActionNotice("Publication mise à jour avec succès !");
    } catch {
      setActionNotice("Erreur lors de la mise à jour.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteConfirmPost) return;
    try {
      await onDeletePost?.(deleteConfirmPost.id);
      setDeleteConfirmPost(null);
      setActionNotice("Publication supprimée.");
    } catch {
      setActionNotice("Erreur lors de la suppression.");
    }
  }

  const visiblePosts = useMemo(() => {
    // 1. Pinned posts ALWAYS remain at index 0 on top and cannot be pushed down
    const pinned = posts.filter((p) => p.isPinned);
    let unpinned = posts.filter((p) => !p.isPinned);

    if (filter === "friends") {
      unpinned = unpinned.filter(
        (post) =>
          post.isRecruitment ||
          friends.includes(post.author) ||
          post.author === currentUser.name,
      );
    } else if (filter === "popular") {
      unpinned = [...unpinned].sort((a, b) => b.likes - a.likes);
    }

    return [...pinned, ...unpinned];
  }, [filter, posts, friends, currentUser.name]);

  function submitComment(event: FormEvent, postId: number | string) {
    event.preventDefault();
    const text = drafts[postId]?.trim();
    if (!text) return;
    onAddComment(postId, text);
    setDrafts((current) => ({ ...current, [postId]: "" }));
    setOpenComments(postId);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} className="mx-auto max-w-[680px]">
      {challenge && (
        <section className={`relative overflow-hidden rounded-[28px] transition-all duration-300 text-white ${
          isChallengeExpired ? "bg-[#2d1b18] border-2 border-red-500/30" : "bg-[#173f35]"
        }`}>
          <div className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-2xl ${
            isChallengeExpired ? "bg-red-500/20" : "bg-[#e9683a]/25"
          }`} />
          <div className="pointer-events-none absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-[#f3c969]/20 blur-2xl" />
          
          <div className="relative p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className={`flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] ${
                isChallengeExpired ? "text-red-400" : "text-[#f3c969]"
              }`}>
                <Sparkles size={14} /> {isChallengeExpired ? "Défi clos · En attente du prochain" : "Défi photo du jour"}
              </div>

              {/* Dynamic Live Timer Badge */}
              <div className="flex items-center gap-2">
                {isChallengeExpired ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-[11px] font-extrabold text-red-300 border border-red-500/30">
                    <Lock size={12} /> Défi Expiré (00:00:00)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-mono font-black text-[#f3c969] border border-white/15 shadow-inner backdrop-blur-md">
                    <Timer size={14} className="animate-pulse text-[#e9683a]" />
                    <span>{countdown.formatted}</span>
                    <span className="text-[10px] font-sans font-bold text-white/70">restantes</span>
                  </span>
                )}
                {isAdmin && (
                  <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-extrabold text-amber-300 border border-amber-400/30">
                    Admin
                  </span>
                )}
              </div>
            </div>

            <p className="mt-4 font-display text-[34px] font-semibold leading-[0.95] tracking-[-0.04em] sm:text-5xl">
              {challenge.theme}
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">{challenge.brief}</p>
            
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {isUploadBlocked ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-xs font-bold text-white/60 border border-white/10">
                  <Lock size={15} /> Upload verrouillé (défi terminé)
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleTriggerComposer}
                  className="inline-flex items-center gap-2 rounded-full bg-[#f3c969] px-5 py-3 text-sm font-extrabold text-[#173f35] transition hover:-translate-y-0.5 hover:bg-white shadow-lg shadow-black/10"
                >
                  <Camera size={16} /> Poster ma photo {isChallengeExpired && isAdmin && "(Admin)"}
                </button>
              )}
              <p className="text-xs font-semibold text-white/55">{posts.filter((p) => !p.isPinned).length} photos de joueurs</p>
            </div>
          </div>
        </section>
      )}

      {/* COMPOSER TRIGGER BAR */}
      <div className={`${challenge ? "mt-4" : "mt-1"} overflow-hidden rounded-[24px] border border-[#173f35]/8 bg-white transition`}>
        <button
          type="button"
          onClick={handleTriggerComposer}
          className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition ${
            isUploadBlocked ? "cursor-not-allowed opacity-75 hover:bg-white" : "hover:bg-[#fbf8f1]"
          }`}
        >
          <img src={currentUser.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
          <span className="flex-1 flex items-center justify-between rounded-full bg-[#f5f0e5] px-4 py-2.5 text-sm text-[#8a958f]">
            <span>
              {isUploadBlocked 
                ? "Le défi du jour est clos · En attente du prochain défi" 
                : (challenge ? "Partage ta photo du défi…" : "Partage une photo dans le feed…")}
            </span>
            {isUploadBlocked && <Lock size={14} className="text-[#8a958f]" />}
          </span>
          <span className={`hidden rounded-full px-3 py-2 text-xs font-extrabold sm:inline ${
            isUploadBlocked ? "bg-[#8a958f]/20 text-[#8a958f]" : "bg-[#173f35] text-white"
          }`}>
            {isUploadBlocked ? "Verrouillé" : "Publier"}
          </span>
        </button>
      </div>

      <div className="mt-6 mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-2xl font-semibold text-[#173f35]">Feed</h2>
          {filter === "friends" && (
            <span className="rounded-full bg-[#173f35]/10 px-2.5 py-0.5 text-xs font-bold text-[#173f35]">
              {friends.length} ami{friends.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-full bg-[#efe9dd] p-1">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                filter === item.id ? "bg-white text-[#173f35] shadow-sm" : "text-[#7a8780] hover:text-[#173f35]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filter === "friends" && friends.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[26px] border border-[#173f35]/10 bg-white p-7 text-center"
          >
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#edf7f2] text-[#488262]">
              <UserPlus size={24} />
            </div>
            <h3 className="mt-3 font-display text-lg font-semibold text-[#173f35]">
              Aucun ami pour le moment
            </h3>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-[#6f7e76]">
              Ajoute des créateurs en cliquant sur le bouton <span className="font-bold text-[#173f35]">+ Ami</span> sur leurs publications dans l'onglet Récents pour suivre leurs photos et leurs défis !
            </p>
            <button
              type="button"
              onClick={() => setFilter("recents")}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#173f35] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#245b4c]"
            >
              Découvrir les publications récentes
            </button>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {visiblePosts.map((post, index) => {
            const commentsOpen = openComments === post.id;
            const isUser = Boolean(
              currentUser.name &&
              (post.author === currentUser.name ||
               post.author.split(" ")[0] === currentUser.name.split(" ")[0] ||
               post.author === "Léa M." ||
               post.author === "Léa")
            );
            const canManage = isUser || isAdmin;
            const isFriend = friends.includes(post.author);
            const isMenuOpen = activeMenuPostId === post.id;

            return (
              <motion.article
                key={post.id}
                id={`post-${post.id}`}
                layout
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, delay: Math.min(index, 4) * 0.04 }}
                className={`overflow-hidden rounded-[26px] bg-white transition relative ${
                  post.isPinned
                    ? "border-2 border-[#f3c969] shadow-[0_16px_40px_-18px_rgba(243,201,105,.55)] ring-4 ring-[#f3c969]/10"
                    : "border border-[#173f35]/8"
                }`}
              >
                {post.isPinned && (
                  <div className="flex items-center justify-between bg-gradient-to-r from-[#173f35] via-[#1e4e42] to-[#173f35] px-4 py-2 text-[11px] font-bold text-white">
                    <span className="flex items-center gap-1.5 text-[#f3c969]">
                      <Pin size={13} className="fill-[#f3c969]" /> Post Épinglé · Game Master
                    </span>
                    <span className="flex items-center gap-1 text-white/75">
                      <Flame size={13} className="text-[#e9683a]" /> Défi Quotidien
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="relative">
                    {post.isRecruitment ? (
                      <div className="grid h-11 w-11 place-items-center rounded-full bg-[#173f35] text-[#f3c969] border border-[#f3c969]/30">
                        <Users size={18} />
                      </div>
                    ) : (
                      <img src={post.avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
                    )}
                    {post.isOfficial && (
                      <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-[#f3c969] text-[#173f35]">
                        <Sparkles size={10} fill="currentColor" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-extrabold text-[#173f35]">{post.author}</p>
                      {post.isOfficial && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-[#f3c969]/20 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#8a6311]">
                          Officiel
                        </span>
                      )}
                      {post.isRecruitment && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-[#173f35]/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#173f35]">
                          Matchmaking
                        </span>
                      )}
                      {isUser && !post.isRecruitment && (
                        <span className="rounded-full bg-[#173f35]/10 px-2 py-0.5 text-[10px] font-bold text-[#173f35]">
                          Toi
                        </span>
                      )}
                    </div>
                    <p className="flex items-center gap-1 text-[11px] text-[#8c968f]">
                      <MapPin size={10} /> {post.city} · {post.time}
                    </p>
                  </div>

                  {!isUser && !post.isOfficial && !post.isRecruitment && (
                    <button
                      type="button"
                      onClick={() => onToggleFriend(post.author)}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition ${
                        isFriend
                          ? "border border-[#488262]/30 bg-[#eef7f2] text-[#3b7254] hover:bg-[#e0f0e7]"
                          : "border border-[#173f35]/15 bg-white text-[#173f35] hover:border-[#e9683a] hover:bg-[#fff6f2] hover:text-[#e9683a]"
                      }`}
                    >
                      {isFriend ? (
                        <>
                          <Check size={12} strokeWidth={2.5} /> Ami
                        </>
                      ) : (
                        <>
                          <UserPlus size={12} strokeWidth={2.5} /> Ajouter
                        </>
                      )}
                    </button>
                  )}

                  <span className="hidden rounded-full bg-[#fff1e8] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#e9683a] sm:inline">
                    {post.isRecruitment ? "Escouade" : (challenge?.theme || "Défi photo")}
                  </span>

                  {/* 3-DOTS OPTIONS DROPDOWN MENU */}
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      aria-label="Plus d'options"
                      onClick={() => setActiveMenuPostId(isMenuOpen ? null : post.id)}
                      className="rounded-full p-2 text-[#8c968f] hover:bg-[#f5f0e5] transition"
                    >
                      <MoreHorizontal size={17} />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-52 rounded-2xl border border-[#173f35]/10 bg-white p-1.5 shadow-2xl z-30 divide-y divide-[#173f35]/8">
                        <div className="space-y-0.5 pb-1">
                          {canManage && !post.isRecruitment && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(post)}
                              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#173f35] transition hover:bg-[#f5efe6]"
                            >
                              <Edit3 size={14} className="text-[#173f35]" /> Modifier la publication
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuPostId(null);
                                onTogglePinPost?.(post.id, Boolean(post.isPinned));
                              }}
                              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#173f35] transition hover:bg-[#f5efe6]"
                            >
                              {post.isPinned ? <PinOff size={14} className="text-[#e9683a]" /> : <Pin size={14} className="text-[#f3c969]" />}
                              {post.isPinned ? "Désépingler du feed" : "Épingler en tête"}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuPostId(null);
                              onShare(post);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#173f35] transition hover:bg-[#f5efe6]"
                          >
                            <Share2 size={14} /> Partager le post
                          </button>
                        </div>

                        <div className="space-y-0.5 pt-1">
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuPostId(null);
                                setDeleteConfirmPost(post);
                              }}
                              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50"
                            >
                              <Trash2 size={14} /> Supprimer la publication
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuPostId(null);
                                setActionNotice("Publication signalée aux modérateurs.");
                              }}
                              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-neutral-600 transition hover:bg-neutral-100"
                            >
                              <Flag size={14} /> Signaler cette publication
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* POST BODY: RECRUITMENT BANNER (NO PHOTO) OR REGULAR PHOTO */}
                {post.isRecruitment ? (
                  <div className="mx-4 my-2 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#173f35] via-[#1b463b] to-[#0e2720] p-5 text-white shadow-md border border-[#f3c969]/20">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f3c969]/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#f3c969]">
                          <Radio size={12} /> Avis de Recrutement
                        </span>
                        {post.squadCode && (
                          <span className="font-mono text-xs font-bold text-white/80">
                            {post.squadCode}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-white/60">
                        Semaine en cours
                      </span>
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-display text-2xl font-bold text-white tracking-tight">
                          {post.squadName || "Escouade de duel"}
                        </h4>
                        <p className="mt-1 text-xs text-white/75 max-w-sm leading-relaxed">
                          {post.caption || "Recherche 3 coéquipiers pour relever les défis de la semaine. Rejoins l'escouade en 1 clic !"}
                        </p>
                      </div>

                      {post.squadCode && (
                        <button
                          type="button"
                          onClick={() => onJoinSquad?.(post.squadCode!)}
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#e9683a] px-5 py-3 text-xs font-extrabold text-white shadow-lg shadow-[#e9683a]/30 transition hover:bg-[#d9582d] hover:scale-[1.02]"
                        >
                          <UserPlus size={15} /> Rejoindre l'escouade
                        </button>
                      )}
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-white/60">
                      <div className="flex items-center gap-1.5">
                        <Users size={14} className="text-[#f3c969]" />
                        <span>Places : 4 joueurs max</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-emerald-400" />
                        <span className="text-emerald-300 text-[11px] font-bold">1 clic pour intégrer</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group aspect-[4/5] overflow-hidden bg-[#eee7da] sm:aspect-[4/4.3]">
                    <img src={post.photo} alt={post.caption} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
                  </div>
                )}

                <div className="px-4 py-4">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onToggleLike(post.id)}
                      aria-label={post.liked ? "Retirer le j'aime" : "Aimer"}
                      className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-bold transition ${
                        post.liked ? "text-[#e9683a]" : "text-[#607168] hover:text-[#e9683a]"
                      }`}
                    >
                      <Heart size={20} fill={post.liked ? "currentColor" : "none"} /> {post.likes}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenComments(commentsOpen ? null : post.id)}
                      className="flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-bold text-[#607168] transition hover:text-[#173f35]"
                    >
                      <MessageCircle size={20} /> {post.comments.length}
                    </button>
                    <button
                      type="button"
                      onClick={() => onShare(post)}
                      className="ml-auto rounded-full p-2 text-[#607168] transition hover:bg-[#f5f0e5] hover:text-[#173f35]"
                      aria-label="Partager"
                    >
                      <Share2 size={18} />
                    </button>
                  </div>

                  {!post.isRecruitment && (
                    <p className="mt-2 text-[14px] leading-relaxed text-[#4f6057]">
                      <span className="font-extrabold text-[#173f35]">{post.author.split(" ")[0]} </span>
                      {post.caption}
                    </p>
                  )}

                  {post.comments.length > 0 && !commentsOpen && (
                    <button
                      type="button"
                      onClick={() => setOpenComments(post.id)}
                      className="mt-2 text-xs font-bold text-[#8a958f] hover:text-[#173f35]"
                    >
                      Voir les {post.comments.length} commentaire{post.comments.length > 1 ? "s" : ""}
                    </button>
                  )}

                  <AnimatePresence>
                    {commentsOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 space-y-3 border-t border-[#173f35]/8 pt-4">
                          {post.comments.length === 0 && (
                            <p className="text-xs text-[#8a958f]">Aucun commentaire pour l'instant.</p>
                          )}
                          {post.comments.map((comment) => (
                            <div key={comment.id} className="flex items-start gap-2.5">
                              <img src={comment.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                              <p className="rounded-2xl bg-[#f5f0e5] px-3 py-2 text-[13px] leading-relaxed text-[#4f6057]">
                                <span className="font-extrabold text-[#173f35]">{comment.author} </span>
                                {comment.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={(event) => submitComment(event, post.id)} className="mt-4 flex items-center gap-2">
                    <img src={currentUser.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                    <input
                      value={drafts[post.id] ?? ""}
                      onChange={(event) => setDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                      onFocus={() => setOpenComments(post.id)}
                      placeholder="Écrire un commentaire…"
                      className="min-w-0 flex-1 rounded-full bg-[#f5f0e5] px-4 py-2.5 text-sm text-[#173f35] outline-none placeholder:text-[#8a958f] focus:ring-2 focus:ring-[#e9683a]/20"
                    />
                    <button
                      type="submit"
                      aria-label="Envoyer"
                      disabled={!drafts[post.id]?.trim()}
                      className="grid h-9 w-9 place-items-center rounded-full bg-[#173f35] text-white transition hover:bg-[#245b4c] disabled:opacity-30"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>

        {visiblePosts.length === 0 && (
          <div className="rounded-[28px] border border-dashed border-[#173f35]/20 bg-white/70 p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e9683a]/10 text-[#e9683a]">
              <Camera size={26} />
            </div>
            <h3 className="mt-4 font-display text-xl font-semibold text-[#173f35]">Aucune photo pour le moment</h3>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-[#6f7e76]">
              Sois le premier de ton escouade à relever le défi photo du jour !
            </p>
            <button
              type="button"
              onClick={onOpenComposer}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#e9683a] px-5 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#d9582d]"
            >
              <Camera size={15} /> Partager une photo
            </button>
          </div>
        )}
      </div>

      {/* EDIT POST MODAL */}
      <AnimatePresence>
        {editingPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingPost(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              className="relative w-full max-w-lg overflow-hidden rounded-[32px] bg-white p-6 sm:p-8 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between border-b border-[#173f35]/10 pb-4">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#173f35] text-white">
                    <Edit3 size={15} />
                  </span>
                  <h3 className="font-display text-xl font-bold text-[#173f35]">Modifier la publication</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="grid h-8 w-8 place-items-center rounded-full text-[#7a8780] hover:bg-[#f5f0e5]"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="mt-5 space-y-4">
                {editPhoto && (
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-wider text-[#526259]">Photo</label>
                    <div className="mt-2 flex items-center gap-4">
                      <img src={editPhoto} alt="Aperçu" className="h-20 w-20 rounded-2xl object-cover border border-[#173f35]/10 shadow-sm" />
                      <label className="flex cursor-pointer items-center gap-2 rounded-full border-2 border-dashed border-[#173f35]/20 bg-[#fbf8f1] px-4 py-2.5 text-xs font-extrabold text-[#173f35] transition hover:border-[#e9683a] hover:bg-white hover:text-[#e9683a]">
                        <Upload size={14} /> Changer la photo
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                      </label>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#526259]">Légende / Message</label>
                  <textarea
                    rows={4}
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    placeholder="Votre légende…"
                    className="mt-1.5 w-full rounded-2xl border-2 border-[#173f35]/10 bg-[#fbf8f1] p-4 text-sm text-[#173f35] outline-none transition focus:border-[#e9683a] focus:bg-white"
                  />
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-[#173f35]/10">
                  <button
                    type="button"
                    onClick={() => setEditingPost(null)}
                    className="rounded-full px-5 py-2.5 text-xs font-bold text-[#6f7e76] hover:bg-[#f5f0e5]"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit || !editCaption.trim()}
                    className="flex items-center gap-2 rounded-full bg-[#e9683a] px-6 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-[#e9683a]/25 transition hover:bg-[#d9582d] disabled:opacity-50"
                  >
                    {savingEdit ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Enregistrement…
                      </>
                    ) : (
                      "Enregistrer les modifications"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteConfirmPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmPost(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              className="relative w-full max-w-md overflow-hidden rounded-[32px] bg-white p-6 sm:p-8 shadow-2xl z-10 text-center"
            >
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-100 text-red-600">
                <Trash2 size={26} />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-[#173f35]">Supprimer cette publication ?</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#6f7e76]">
                Cette publication sera définitivement supprimée du feed. Cette action est irréversible.
              </p>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmPost(null)}
                  className="rounded-full border border-[#173f35]/15 bg-white px-5 py-2.5 text-xs font-bold text-[#173f35] hover:bg-[#f5f0e5]"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="rounded-full bg-red-600 px-6 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-red-600/25 transition hover:bg-red-700"
                >
                  Supprimer définitivement
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
