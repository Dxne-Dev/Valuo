import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Edit3,
  LayoutDashboard,
  MessageSquare,
  PackageOpen,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  Upload,
  Users,
  X,
} from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { type FeedPost, media } from "@/data";
import {
  type AdminMetrics,
  type AdminSquadSummary,
  type ChallengeData,
  createOfficialPost,
  deactivateActiveChallenge,
  deleteFeedPost,
  deleteSquadAdmin,
  fetchAdminMetrics,
  fetchAdminSquadsList,
  type MysteryItemData,
  saveActiveChallenge,
  saveMysteryItem,
  togglePinPost,
  updateFeedPost,
} from "../services/adminService";

export type AdminViewProps = {
  currentUserId?: string | null;
  activeChallenge?: ChallengeData | null;
  mysteryItem: MysteryItemData;
  posts: FeedPost[];
  onChallengeUpdated: (challenge: ChallengeData | null) => void;
  onMysteryUpdated: (item: MysteryItemData) => void;
  onPostCreated: () => void;
  onPostDeleted: (postId: string | number) => void;
  onNotice: (msg: string) => void;
};

export type AdminSubTab = "overview" | "challenge" | "announcement" | "mystery" | "posts" | "squads";

function getAdminSubTabFromPathname(pathname: string): AdminSubTab {
  const parts = pathname.toLowerCase().split("/").filter(Boolean);
  if (parts[0] === "admin" && parts[1]) {
    const sub = parts[1];
    if (sub === "challenge" || sub === "defi") return "challenge";
    if (sub === "announcement" || sub === "annonce" || sub === "post") return "announcement";
    if (sub === "mystery" || sub === "boite") return "mystery";
    if (sub === "posts" || sub === "moderation") return "posts";
    if (sub === "squads" || sub === "escouades") return "squads";
  }
  return "overview";
}

export default function AdminView({
  currentUserId,
  activeChallenge,
  mysteryItem,
  posts,
  onChallengeUpdated,
  onMysteryUpdated,
  onPostCreated,
  onPostDeleted,
  onNotice,
}: AdminViewProps) {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const tab = getAdminSubTabFromPathname(location.pathname);

  function handleTabClick(subTab: AdminSubTab) {
    const targetPath = subTab === "overview" ? "/admin" : `/admin/${subTab}`;
    if (location.pathname !== targetPath) {
      routerNavigate(targetPath);
    }
  }

  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalPlayers: 1,
    totalPosts: posts.length,
    totalSquads: 1,
    totalEstimates: 0,
  });
  const [squadsList, setSquadsList] = useState<AdminSquadSummary[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Challenge form state
  const [theme, setTheme] = useState(activeChallenge?.theme || "Une touche de rouge");
  const [brief, setBrief] = useState(
    activeChallenge?.brief ||
      "Photographie un objet rouge qui a déjà vécu. Un détail, une texture, une histoire — avant minuit.",
  );
  const [remaining, setRemaining] = useState(activeChallenge?.remaining || "6 h 24");

  useEffect(() => {
    if (activeChallenge) {
      setTheme(activeChallenge.theme);
      setBrief(activeChallenge.brief);
      setRemaining(activeChallenge.remaining || "6 h 24");
    }
  }, [activeChallenge]);

  // Current official / pinned post detected
  const currentOfficialPost = posts.find((p) => p.isOfficial || p.isPinned) || null;

  // Announcement state
  const [editingPostId, setEditingPostId] = useState<string | number | null>(null);
  const [announcementPhoto, setAnnouncementPhoto] = useState(media.redPhone);
  const [announcementCaption, setAnnouncementCaption] = useState(
    "Défi officiel du jour lancé ! Capturez un objet ou un détail correspondant au thème et partagez votre photo avant minuit.",
  );
  const [isPinned, setIsPinned] = useState(true);
  const [publishingPost, setPublishingPost] = useState(false);

  // Mystery form state
  const [mysteryTitle, setMysteryTitle] = useState(mysteryItem.title);
  const [mysteryImage, setMysteryImage] = useState(mysteryItem.image);
  const [mysteryBrief, setMysteryBrief] = useState(mysteryItem.brief);
  const [mysteryHint, setMysteryHint] = useState(mysteryItem.hint);
  const [mysteryRealPrice, setMysteryRealPrice] = useState(String(mysteryItem.realPrice));

  // Moderation state
  const [searchQuery, setSearchQuery] = useState("");
  const [modFilter, setModFilter] = useState<"all" | "official" | "players" | "recruitment">("all");
  const [editingModalPost, setEditingModalPost] = useState<FeedPost | null>(null);
  const [editPostCaption, setEditPostCaption] = useState("");
  const [editPostPhoto, setEditPostPhoto] = useState("");

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText?: string;
    onConfirm: () => Promise<void>;
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: async () => {},
  });

  async function loadAdminData() {
    setLoadingStats(true);
    try {
      const [m, s] = await Promise.all([fetchAdminMetrics(), fetchAdminSquadsList()]);
      setMetrics(m);
      setSquadsList(s);
    } catch (err) {
      console.warn("Could not load admin stats:", err);
    } finally {
      setLoadingStats(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, [posts.length]);

  // Handle Challenge
  async function handleSaveChallenge(event: FormEvent) {
    event.preventDefault();
    if (!theme.trim()) return;

    const updated: ChallengeData = {
      theme: theme.trim(),
      brief: brief.trim(),
      remaining: remaining.trim() || "6 h 24",
      date: new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
    };

    await saveActiveChallenge(updated);
    onChallengeUpdated(updated);
    onNotice("Défi du jour publié avec succès sur le feed.");
  }

  async function handleDeactivateChallenge() {
    await deactivateActiveChallenge();
    onChallengeUpdated(null);
    onNotice("Défi du jour retiré du feed.");
  }

  // Handle Official Post Form
  function startEditingOfficialPost(post: FeedPost) {
    setEditingPostId(post.id);
    setAnnouncementPhoto(post.photo || media.redPhone);
    setAnnouncementCaption(post.caption || "");
    setIsPinned(post.isPinned || false);
    onNotice(`Modification du post officiel en cours.`);
  }

  function resetOfficialPostForm() {
    setEditingPostId(null);
    setAnnouncementPhoto(media.redPhone);
    setAnnouncementCaption(
      "Défi officiel du jour lancé ! Capturez un objet ou un détail correspondant au thème et partagez votre photo avant minuit.",
    );
    setIsPinned(true);
  }

  async function handleSaveOfficialPost(event: FormEvent) {
    event.preventDefault();
    if (!announcementCaption.trim()) return;

    setPublishingPost(true);
    try {
      if (editingPostId) {
        // UPDATE existing post
        await updateFeedPost(editingPostId, {
          caption: announcementCaption.trim(),
          photo_url: announcementPhoto,
          is_pinned: isPinned,
          is_official: true,
        });
        onNotice("Post officiel mis à jour avec succès dans le feed !");
      } else {
        // CREATE new official post
        const uid = currentUserId || null;
        await createOfficialPost(uid, announcementPhoto, announcementCaption.trim(), isPinned);
        onNotice("Annonce officielle Game Master publiée dans le feed.");
      }
      onPostCreated();
      resetOfficialPostForm();
    } catch (err) {
      console.warn("Error saving official post:", err);
      onNotice("Erreur lors de la sauvegarde du post officiel.");
    } finally {
      setPublishingPost(false);
    }
  }

  async function handleDeleteOfficialPost(postId: string | number) {
    setConfirmModal({
      open: true,
      title: "Supprimer le post officiel ?",
      description: "Cette publication officielle sera définitivement retirée du feed de tous les utilisateurs.",
      confirmText: "Supprimer",
      onConfirm: async () => {
        onPostDeleted(postId);
        await deleteFeedPost(postId);
        if (editingPostId === postId) {
          resetOfficialPostForm();
        }
        onNotice("Post officiel supprimé avec succès.");
      },
    });
  }

  async function handleTogglePin(postId: string | number, currentPinStatus: boolean) {
    const nextPin = !currentPinStatus;
    await togglePinPost(postId, nextPin);
    onPostCreated();
    onNotice(nextPin ? "Publication épinglée en tête du feed." : "Publication désépinglée.");
  }

  // Handle Mystery Box
  async function handleSaveMystery(event: FormEvent) {
    event.preventDefault();
    if (!mysteryTitle.trim()) return;

    const updated: MysteryItemData = {
      title: mysteryTitle.trim(),
      image: mysteryImage,
      brief: mysteryBrief.trim(),
      hint: mysteryHint.trim(),
      realPrice: Number(mysteryRealPrice) || 50,
    };

    await saveMysteryItem(updated);
    onMysteryUpdated(updated);
    onNotice("Mystery Box du jour mise à jour avec succès.");
  }

  // Handle Edit Any Post Modal
  function openEditPostModal(post: FeedPost) {
    setEditingModalPost(post);
    setEditPostCaption(post.caption || "");
    setEditPostPhoto(post.photo || "");
  }

  async function handleSaveEditedPost(event: FormEvent) {
    event.preventDefault();
    if (!editingModalPost) return;

    await updateFeedPost(editingModalPost.id, {
      caption: editPostCaption.trim(),
      photo_url: editPostPhoto,
    });
    setEditingModalPost(null);
    onPostCreated();
    onNotice("Publication mise à jour avec succès.");
  }

  // Handle Delete Post in Moderation
  function confirmDeletePost(post: FeedPost) {
    setConfirmModal({
      open: true,
      title: "Supprimer cette publication ?",
      description: `Voulez-vous supprimer définitivement la publication de « ${post.author} » ? Cette action est irréversible.`,
      confirmText: "Supprimer",
      onConfirm: async () => {
        onPostDeleted(post.id);
        await deleteFeedPost(post.id);
        onNotice("Publication supprimée avec succès.");
      },
    });
  }

  // Handle Disband Squad
  function confirmDisbandSquad(squad: AdminSquadSummary) {
    setConfirmModal({
      open: true,
      title: `Dissoudre l'escouade « ${squad.name} » ?`,
      description: `Les ${squad.membersCount} membres seront libérés du groupe (${squad.code}) et pourront rejoindre ou créer une nouvelle escouade.`,
      confirmText: "Dissoudre",
      onConfirm: async () => {
        await deleteSquadAdmin(squad.id);
        setSquadsList((prev) => prev.filter((s) => s.id !== squad.id));
        setMetrics((prev) => ({ ...prev, totalSquads: Math.max(0, prev.totalSquads - 1) }));
        onNotice(`L'escouade « ${squad.name} » a été dissoute.`);
      },
    });
  }

  function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>, setter: (val: string) => void) {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setter(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  // Filtered moderation posts
  const filteredPosts = posts.filter((post) => {
    // Filter by category
    if (modFilter === "official" && !post.isOfficial && !post.isPinned) return false;
    if (modFilter === "players" && (post.isOfficial || post.isRecruitment)) return false;
    if (modFilter === "recruitment" && !post.isRecruitment) return false;

    // Filter by query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      post.author.toLowerCase().includes(q) ||
      post.caption.toLowerCase().includes(q) ||
      (post.city && post.city.toLowerCase().includes(q))
    );
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-5xl space-y-6">
      {/* Admin Header Banner */}
      <div className="relative overflow-hidden rounded-[28px] bg-[#173f35] p-6 text-white sm:p-8 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f3c969] text-[#173f35] shadow-md">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#f3c969]">
                  Espace Dédié
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-300">
                  <Activity size={13} /> Cockpit Game Master
                </span>
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Tableau de Bord du Jeu</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={loadAdminData}
            disabled={loadingStats}
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/20 disabled:opacity-50"
            title="Rafraîchir les données"
          >
            <RefreshCw size={13} className={loadingStats ? "animate-spin" : ""} />
            <span>Rafraîchir</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          {[
            { id: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
            { id: "challenge", label: "Défi du Jour", icon: Sparkles },
            { id: "announcement", label: "Post Officiel", icon: Pin },
            { id: "mystery", label: "Mystery Box", icon: PackageOpen },
            { id: "posts", label: `Modération (${posts.length})`, icon: MessageSquare },
            { id: "squads", label: `Escouades (${squadsList.length})`, icon: Users },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabClick(item.id as AdminSubTab)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold transition ${
                  isActive
                    ? "bg-[#e9683a] text-white shadow-md shadow-[#e9683a]/30"
                    : "bg-white/10 text-white/75 hover:bg-white/20 hover:text-white"
                }`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 0: OVERVIEW / STATS */}
      {tab === "overview" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-[24px] border border-[#173f35]/8 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#6f7e76]">Joueurs</span>
                <Users size={18} className="text-[#173f35]" />
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-[#173f35]">{metrics.totalPlayers}</p>
              <p className="mt-1 text-[11px] text-[#76837c]">Inscrits sur la plateforme</p>
            </div>

            <div className="rounded-[24px] border border-[#173f35]/8 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#6f7e76]">Publications</span>
                <Sparkles size={18} className="text-[#e9683a]" />
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-[#173f35]">{posts.length}</p>
              <p className="mt-1 text-[11px] text-[#76837c]">Photos partagées</p>
            </div>

            <div className="rounded-[24px] border border-[#173f35]/8 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#6f7e76]">Escouades</span>
                <Trophy size={18} className="text-[#488262]" />
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-[#173f35]">{squadsList.length || 1}</p>
              <p className="mt-1 text-[11px] text-[#76837c]">Groupes de compétition</p>
            </div>

            <div className="rounded-[24px] border border-[#173f35]/8 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#6f7e76]">Estimations</span>
                <PackageOpen size={18} className="text-[#946914]" />
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-[#173f35]">{metrics.totalEstimates}</p>
              <p className="mt-1 text-[11px] text-[#76837c]">Soumises cette semaine</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[26px] border border-[#173f35]/8 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#e9683a]">Défi Actif</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  activeChallenge ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-600"
                }`}>
                  {activeChallenge ? "En cours" : "Inactif"}
                </span>
              </div>
              <h3 className="mt-2 font-display text-xl font-bold text-[#173f35]">
                {activeChallenge ? activeChallenge.theme : "Aucun défi programmé"}
              </h3>
              <p className="mt-1 text-xs text-[#6e7d75] leading-relaxed">
                {activeChallenge ? activeChallenge.brief : "Configurez et lancez le défi du jour pour l'afficher sur le feed des joueurs."}
              </p>
              <div className="mt-4 flex items-center gap-3 pt-3 border-t border-[#173f35]/6">
                <button
                  type="button"
                  onClick={() => handleTabClick("challenge")}
                  className="rounded-full bg-[#173f35] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#23584b]"
                >
                  {activeChallenge ? "Modifier le thème" : "Lancer le défi"}
                </button>
              </div>
            </div>

            <div className="rounded-[26px] border border-[#173f35]/8 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#e9683a]">Mystery Box du Jour</span>
                <span className="rounded-full bg-[#f3c969]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#173f35]">
                  {mysteryItem.realPrice} €
                </span>
              </div>
              <h3 className="mt-2 font-display text-xl font-bold text-[#173f35]">{mysteryItem.title}</h3>
              <p className="mt-1 text-xs text-[#6e7d75] leading-relaxed">{mysteryItem.brief}</p>
              <div className="mt-4 flex items-center gap-3 pt-3 border-t border-[#173f35]/6">
                <button
                  type="button"
                  onClick={() => handleTabClick("mystery")}
                  className="rounded-full bg-[#173f35] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#23584b]"
                >
                  Configurer la box
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 1: DÉFI DU JOUR */}
      {tab === "challenge" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="rounded-[28px] bg-white p-6 sm:p-8 shadow-sm border border-[#173f35]/8">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#e9683a]">
              <Sparkles size={16} /> Configuration du Défi Quotidien
            </div>
            <h2 className="mt-1 font-display text-2xl font-semibold text-[#173f35]">Modifier le thème et le brief</h2>
            <p className="mt-1 text-xs text-[#6f7e76]">
              Ce défi sera immédiatement visible dans l'en-tête du feed pour tous les joueurs.
            </p>

            <form onSubmit={handleSaveChallenge} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">Thème du jour</label>
                <input
                  type="text"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="Ex: Une touche de rouge, Minimalisme urbain, Reflets…"
                  className="mt-1.5 w-full rounded-2xl border-2 border-[#173f35]/10 bg-[#fbf8f1] px-4 py-3.5 text-sm font-bold text-[#173f35] outline-none transition focus:border-[#e9683a] focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">Brief & Consignes du Game Master</label>
                <textarea
                  rows={3}
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="Ex: Photographie un objet rouge qui a déjà vécu. Un détail, une texture, une histoire — avant minuit."
                  className="mt-1.5 w-full rounded-2xl border-2 border-[#173f35]/10 bg-[#fbf8f1] p-4 text-sm text-[#173f35] outline-none transition focus:border-[#e9683a] focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">Temps restant indicatif</label>
                <input
                  type="text"
                  value={remaining}
                  onChange={(e) => setRemaining(e.target.value)}
                  placeholder="Ex: 6 h 24, Fin à 23h59"
                  className="mt-1.5 w-full rounded-2xl border-2 border-[#173f35]/10 bg-[#fbf8f1] px-4 py-3 text-sm text-[#173f35] outline-none transition focus:border-[#e9683a] focus:bg-white"
                />
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-full bg-[#173f35] px-6 py-3.5 text-xs font-extrabold text-white transition hover:bg-[#23584b] shadow-lg shadow-[#173f35]/20"
                >
                  <Save size={16} /> Enregistrer et publier le défi
                </button>
                {activeChallenge && (
                  <button
                    type="button"
                    onClick={handleDeactivateChallenge}
                    className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-3.5 text-xs font-extrabold text-red-600 transition hover:bg-red-100"
                  >
                    <Trash2 size={15} /> Retirer le défi du feed
                  </button>
                )}
              </div>
            </form>
          </div>
        </motion.div>
      )}

      {/* TAB 2: POST OFFICIEL DU GAME MASTER (CRUD) */}
      {tab === "announcement" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* CURRENT PINNED / OFFICIAL POST PREVIEW CARD */}
          {currentOfficialPost && (
            <div className="rounded-[28px] border-2 border-[#f3c969] bg-gradient-to-br from-[#fefbf3] to-white p-6 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f3c969]/30 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 rounded-full bg-[#173f35] px-3 py-1 text-[11px] font-extrabold text-[#f3c969]">
                    <Pin size={12} className="fill-[#f3c969]" /> Post Actuellement en Ligne
                  </span>
                  {currentOfficialPost.isPinned && (
                    <span className="rounded-full bg-[#e9683a]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#e9683a]">
                      Épinglé en tête de liste
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEditingOfficialPost(currentOfficialPost)}
                    className="flex items-center gap-1.5 rounded-full bg-[#173f35] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#23584b]"
                  >
                    <Edit3 size={13} /> Modifier ce post
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTogglePin(currentOfficialPost.id, Boolean(currentOfficialPost.isPinned))}
                    className="flex items-center gap-1.5 rounded-full border border-[#173f35]/15 bg-white px-3.5 py-1.5 text-xs font-bold text-[#173f35] transition hover:bg-[#173f35]/5"
                  >
                    {currentOfficialPost.isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                    {currentOfficialPost.isPinned ? "Désépingler" : "Épingler"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteOfficialPost(currentOfficialPost.id)}
                    className="grid h-8 w-8 place-items-center rounded-full bg-red-50 text-red-600 transition hover:bg-red-100"
                    title="Supprimer définitivement ce post officiel"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-4 items-start">
                <img
                  src={currentOfficialPost.photo}
                  alt="Aperçu post officiel"
                  className="h-28 w-28 rounded-2xl object-cover border border-[#173f35]/10 shadow-sm shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[#173f35] text-sm">{currentOfficialPost.author}</span>
                    <span className="rounded-full bg-[#f3c969]/30 px-2 py-0.5 text-[9px] font-extrabold uppercase text-[#8a6311]">
                      Officiel
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#415147] leading-relaxed">{currentOfficialPost.caption}</p>
                  <div className="mt-3 flex items-center gap-4 text-xs font-bold text-[#6f7e76]">
                    <span>{currentOfficialPost.likes || 0} mentions J'aime</span>
                    <span>{currentOfficialPost.comments?.length || 0} commentaires</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FORM: CREATE OR EDIT OFFICIAL POST */}
          <div className="rounded-[28px] bg-white p-6 sm:p-8 shadow-sm border border-[#173f35]/8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#e9683a]">
                <Pin size={16} /> {editingPostId ? "Modifier le Post Officiel" : "Créer un Nouveau Post Officiel"}
              </div>
              {editingPostId && (
                <button
                  type="button"
                  onClick={resetOfficialPostForm}
                  className="flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-600 hover:bg-neutral-200"
                >
                  <X size={13} /> Annuler la modification
                </button>
              )}
            </div>

            <h2 className="mt-1 font-display text-2xl font-semibold text-[#173f35]">
              {editingPostId ? "Mettre à jour l'annonce officielle" : "Publier une annonce dans le Feed"}
            </h2>
            <p className="mt-1 text-xs text-[#6f7e76]">
              {editingPostId
                ? "Modifiez le texte ou la photo du post officiel existant."
                : "Ce post apparaîtra avec le badge « Défi Officiel » en tête du feed de tous les utilisateurs."}
            </p>

            <form onSubmit={handleSaveOfficialPost} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">Photo d'inspiration du Game Master</label>
                <div className="mt-2 flex items-center gap-4">
                  <img src={announcementPhoto} alt="Aperçu" className="h-20 w-20 rounded-2xl object-cover border-2 border-[#173f35]/10 shadow-sm" />
                  <label className="flex cursor-pointer items-center gap-2 rounded-full border-2 border-dashed border-[#173f35]/20 bg-[#fbf8f1] px-4 py-2.5 text-xs font-extrabold text-[#173f35] transition hover:border-[#e9683a] hover:bg-white hover:text-[#e9683a]">
                    <Upload size={15} /> Changer la photo
                    <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setAnnouncementPhoto)} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">Message officiel</label>
                <textarea
                  rows={3}
                  value={announcementCaption}
                  onChange={(e) => setAnnouncementCaption(e.target.value)}
                  placeholder="Ex: Défi du jour : « Une touche de rouge »…"
                  className="mt-1.5 w-full rounded-2xl border-2 border-[#173f35]/10 bg-[#fbf8f1] p-4 text-sm text-[#173f35] outline-none transition focus:border-[#e9683a] focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="is-pinned"
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="h-4 w-4 rounded text-[#e9683a] focus:ring-[#e9683a]"
                />
                <label htmlFor="is-pinned" className="text-xs font-bold text-[#173f35] cursor-pointer">
                  Épingler en première position du Feed (remplace tout post épinglé existant)
                </label>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={publishingPost}
                  className="flex items-center gap-2 rounded-full bg-[#e9683a] px-6 py-3.5 text-xs font-extrabold text-white transition hover:bg-[#d9582d] shadow-lg shadow-[#e9683a]/25 disabled:opacity-50"
                >
                  <Pin size={16} />
                  {publishingPost
                    ? "Enregistrement…"
                    : editingPostId
                    ? "Sauvegarder les modifications"
                    : "Publier l'annonce officielle"}
                </button>

                {editingPostId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteOfficialPost(editingPostId)}
                    className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-3.5 text-xs font-extrabold text-red-600 transition hover:bg-red-100"
                  >
                    <Trash2 size={15} /> Supprimer ce post
                  </button>
                )}
              </div>
            </form>
          </div>
        </motion.div>
      )}

      {/* TAB 3: MYSTERY BOX */}
      {tab === "mystery" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] bg-white p-6 sm:p-8 shadow-sm border border-[#173f35]/8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#e9683a]">
            <PackageOpen size={16} /> Jeu de la Mystery Box
          </div>
          <h2 className="mt-1 font-display text-2xl font-semibold text-[#173f35]">Configurer l'objet du jour</h2>
          <p className="mt-1 text-xs text-[#6f7e76]">
            Les joueurs devront estimer le prix de cet objet avant la révélation de 20h.
          </p>

          <form onSubmit={handleSaveMystery} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">Nom de l'objet</label>
              <input
                type="text"
                value={mysteryTitle}
                onChange={(e) => setMysteryTitle(e.target.value)}
                placeholder="Ex: Vase en faïence à décor floral"
                className="mt-1.5 w-full rounded-2xl border-2 border-[#173f35]/10 bg-[#fbf8f1] px-4 py-3.5 text-sm font-bold text-[#173f35] outline-none transition focus:border-[#e9683a] focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">Photo de l'objet mystère</label>
              <div className="mt-2 flex items-center gap-4">
                <img src={mysteryImage} alt="Objet Mystère" className="h-20 w-20 rounded-2xl object-cover border-2 border-[#173f35]/10" />
                <label className="flex cursor-pointer items-center gap-2 rounded-full border-2 border-dashed border-[#173f35]/20 bg-[#fbf8f1] px-4 py-2.5 text-xs font-extrabold text-[#173f35] transition hover:border-[#e9683a] hover:bg-white hover:text-[#e9683a]">
                  <Upload size={15} /> Téléverser l'image
                  <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setMysteryImage)} className="hidden" />
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">Description & Détails de l'état</label>
              <textarea
                rows={2}
                value={mysteryBrief}
                onChange={(e) => setMysteryBrief(e.target.value)}
                placeholder="Ex: Hauteur 31 cm. Signature sous la base…"
                className="mt-1.5 w-full rounded-2xl border-2 border-[#173f35]/10 bg-[#fbf8f1] p-4 text-sm text-[#173f35] outline-none transition focus:border-[#e9683a] focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">Indice secret</label>
              <input
                type="text"
                value={mysteryHint}
                onChange={(e) => setMysteryHint(e.target.value)}
                placeholder="Ex: Une pièce décorative qui a traversé au moins trois générations."
                className="mt-1.5 w-full rounded-2xl border-2 border-[#173f35]/10 bg-[#fbf8f1] px-4 py-3 text-sm text-[#173f35] outline-none transition focus:border-[#e9683a] focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">Vrai prix réel constaté (€)</label>
              <div className="relative mt-1.5">
                <input
                  type="number"
                  value={mysteryRealPrice}
                  onChange={(e) => setMysteryRealPrice(e.target.value)}
                  placeholder="Ex: 68"
                  className="w-full rounded-2xl border-2 border-[#173f35]/10 bg-[#fbf8f1] px-4 py-3.5 pr-10 text-sm font-bold text-[#173f35] outline-none transition focus:border-[#e9683a] focus:bg-white"
                />
                <span className="pointer-events-none absolute right-4 top-3.5 font-bold text-[#173f35]/40">€</span>
              </div>
            </div>

            <button
              type="submit"
              className="mt-4 flex items-center gap-2 rounded-full bg-[#173f35] px-6 py-3.5 text-xs font-extrabold text-white transition hover:bg-[#23584b] shadow-lg shadow-[#173f35]/20"
            >
              <Save size={16} /> Enregistrer la Mystery Box
            </button>
          </form>
        </motion.div>
      )}

      {/* TAB 4: MODÉRATION DU FEED (FULL CRUD) */}
      {tab === "posts" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] bg-white p-6 sm:p-8 shadow-sm border border-[#173f35]/8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#e9683a]">
                <MessageSquare size={16} /> Modération & Gestion du Feed
              </div>
              <h2 className="mt-1 font-display text-2xl font-semibold text-[#173f35]">Publications en ligne</h2>
            </div>

            <button
              type="button"
              onClick={() => handleTabClick("announcement")}
              className="flex items-center gap-2 rounded-full bg-[#e9683a] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#d9582d] shadow-md shadow-[#e9683a]/20"
            >
              <Plus size={15} /> Nouveau post officiel
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-[#173f35]/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par auteur, texte…"
                className="w-full rounded-2xl border border-[#173f35]/10 bg-[#fbf8f1] py-2.5 pl-10 pr-4 text-xs font-bold text-[#173f35] outline-none transition focus:border-[#e9683a] focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 rounded-full bg-[#f5efe6] p-1 w-full sm:w-auto justify-center">
              {[
                { id: "all", label: `Tous (${posts.length})` },
                { id: "official", label: "Officiels / Épinglés" },
                { id: "players", label: "Joueurs" },
                { id: "recruitment", label: "Recrutements" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setModFilter(f.id as any)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold transition ${
                    modFilter === f.id ? "bg-[#173f35] text-white shadow-sm" : "text-[#6f7e76] hover:text-[#173f35]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Post list */}
          <div className="space-y-3">
            {filteredPosts.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#7a8780] bg-[#fbf8f1] rounded-2xl border border-dashed border-[#173f35]/10">
                <p>Aucune publication ne correspond à vos critères.</p>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl p-4 transition ${
                    post.isPinned
                      ? "border-2 border-[#f3c969] bg-[#fefbf3]"
                      : "border border-[#173f35]/10 bg-[#fbf8f1]"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {post.photo ? (
                      <img src={post.photo} alt="" className="h-14 w-14 rounded-xl object-cover shrink-0 border border-[#173f35]/10" />
                    ) : (
                      <div className="grid h-14 w-14 place-items-center rounded-xl bg-[#173f35] text-[#f3c969] shrink-0">
                        <Users size={20} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-[#173f35] truncate">{post.author}</span>
                        {post.isOfficial && (
                          <span className="rounded-full bg-[#f3c969]/30 px-2 py-0.5 text-[9px] font-extrabold text-[#173f35]">
                            Officiel
                          </span>
                        )}
                        {post.isPinned && (
                          <span className="rounded-full bg-[#e9683a]/15 px-2 py-0.5 text-[9px] font-extrabold text-[#e9683a]">
                            Épinglé
                          </span>
                        )}
                        {post.isRecruitment && (
                          <span className="rounded-full bg-[#173f35]/10 px-2 py-0.5 text-[9px] font-extrabold text-[#173f35]">
                            Matchmaking
                          </span>
                        )}
                        <span className="text-[10px] text-[#7a8780]">{post.time}</span>
                      </div>
                      <p className="text-xs text-[#526259] truncate mt-1">{post.caption}</p>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-[#7a8780]">
                        <span>❤️ {post.likes}</span>
                        <span>💬 {post.comments?.length || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTogglePin(post.id, Boolean(post.isPinned))}
                      className={`flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition ${
                        post.isPinned
                          ? "bg-[#e9683a]/15 text-[#e9683a] hover:bg-[#e9683a]/25"
                          : "bg-white border border-[#173f35]/10 text-[#173f35] hover:bg-[#173f35]/5"
                      }`}
                      title={post.isPinned ? "Désépingler" : "Épingler en première position"}
                    >
                      {post.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                      <span className="hidden sm:inline">{post.isPinned ? "Désépingler" : "Épingler"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditPostModal(post)}
                      className="grid h-9 w-9 place-items-center rounded-xl bg-white border border-[#173f35]/10 text-[#173f35] transition hover:bg-[#173f35]/5"
                      title="Modifier cette publication"
                    >
                      <Edit3 size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => confirmDeletePost(post)}
                      className="grid h-9 w-9 place-items-center rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100"
                      title="Supprimer la publication"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* TAB 5: SQUADS SUPERVISION & DISBAND */}
      {tab === "squads" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] bg-white p-6 sm:p-8 shadow-sm border border-[#173f35]/8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#e9683a]">
            <Users size={16} /> Supervision des Escouades
          </div>
          <h2 className="mt-1 font-display text-2xl font-semibold text-[#173f35]">Groupes Actifs</h2>

          <div className="mt-6 space-y-3">
            {squadsList.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#7a8780]">Aucune escouade active enregistrée.</p>
            ) : (
              squadsList.map((squad) => (
                <div key={squad.id} className="flex items-center justify-between gap-4 rounded-2xl border border-[#173f35]/10 bg-[#fbf8f1] p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#173f35]">{squad.name}</span>
                      <span className="rounded-full bg-[#173f35]/10 px-2 py-0.5 text-[10px] font-extrabold text-[#173f35]">
                        {squad.code}
                      </span>
                    </div>
                    <p className="text-xs text-[#6e7d75] mt-0.5">
                      Semaine {squad.weekNumber} · {squad.membersCount}/4 joueurs
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-[#e9683a]">{squad.topScore} pts</span>
                      <p className="text-[10px] text-[#7a8780]">Meilleur score</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => confirmDisbandSquad(squad)}
                      className="grid h-9 w-9 place-items-center rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100"
                      title="Dissoudre l'escouade"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* MODAL: EDIT ANY POST */}
      <AnimatePresence>
        {editingModalPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl border border-[#173f35]/10 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-bold text-[#173f35]">Modifier la publication</h3>
                <button
                  type="button"
                  onClick={() => setEditingModalPost(null)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveEditedPost} className="space-y-4">
                {editPostPhoto && (
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">Photo</label>
                    <div className="mt-2 flex items-center gap-3">
                      <img src={editPostPhoto} alt="" className="h-16 w-16 rounded-xl object-cover border" />
                      <label className="flex cursor-pointer items-center gap-2 rounded-full border border-[#173f35]/20 bg-[#fbf8f1] px-3.5 py-2 text-xs font-bold text-[#173f35] hover:bg-white">
                        <Upload size={14} /> Changer la photo
                        <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setEditPostPhoto)} className="hidden" />
                      </label>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">Légende / Message</label>
                  <textarea
                    rows={4}
                    value={editPostCaption}
                    onChange={(e) => setEditPostCaption(e.target.value)}
                    className="mt-1.5 w-full rounded-2xl border-2 border-[#173f35]/10 bg-[#fbf8f1] p-3.5 text-sm text-[#173f35] outline-none focus:border-[#e9683a] focus:bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingModalPost(null)}
                    className="rounded-full px-5 py-2.5 text-xs font-bold text-[#6f7e76] hover:bg-neutral-100"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-[#173f35] px-5 py-2.5 text-xs font-extrabold text-white hover:bg-[#23584b]"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION DIALOG MODAL */}
      <AnimatePresence>
        {confirmModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl border border-[#173f35]/10 space-y-4"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-100 text-red-600">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-[#173f35]">{confirmModal.title}</h3>
                <p className="mt-1.5 text-xs text-[#6e7d75] leading-relaxed">{confirmModal.description}</p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#173f35]/6">
                <button
                  type="button"
                  onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
                  className="rounded-full px-4 py-2 text-xs font-bold text-[#6f7e76] hover:bg-neutral-100"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const fn = confirmModal.onConfirm;
                    setConfirmModal((prev) => ({ ...prev, open: false }));
                    await fn();
                  }}
                  className="rounded-full bg-red-600 px-5 py-2 text-xs font-extrabold text-white transition hover:bg-red-700 shadow-md shadow-red-600/20"
                >
                  {confirmModal.confirmText || "Confirmer"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
