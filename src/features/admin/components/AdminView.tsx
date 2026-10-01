import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CalendarPlus,
  Clock,
  Edit3,
  Layers,
  LayoutDashboard,
  MessageSquare,
  PackageOpen,
  PauseCircle,
  Pin,
  PinOff,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Timer,
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
  fetchAllChallengesList,
  deleteChallenge,
  activateChallengeNow,
  fetchAllMysteryBoxesList,
  activateMysteryBoxNow,
  revealMysteryBoxNow,
  deleteMysteryBox,
  type MysteryItemData,
  saveActiveChallenge,
  saveMysteryItem,
  togglePinPost,
  updateFeedPost,
  uploadImage,
} from "../services/adminService";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useCountdown } from "@/lib/useCountdown";

function ChallengeCountdownBadge({ endsAt }: { endsAt?: string }) {
  const countdown = useCountdown(endsAt);
  if (countdown.isExpired) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-[11px] font-bold text-red-600 border border-red-500/20">
        Expiré (00:00:00)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#173f35]/10 px-2.5 py-0.5 text-xs font-mono font-bold text-[#173f35]">
      <Timer size={13} className="text-[#e9683a] animate-pulse" />
      {countdown.formatted}
    </span>
  );
}

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

  // Multi-challenge state
  const [challengesList, setChallengesList] = useState<ChallengeData[]>([]);
  const [isSchedulingMode, setIsSchedulingMode] = useState(false);
  const [durationPreset, setDurationPreset] = useState<"today" | "12h" | "24h" | "48h" | "custom">("today");
  const [scheduleStartsAt, setScheduleStartsAt] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  });
  const [scheduleEndsAt, setScheduleEndsAt] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 0);
    return tomorrow.toISOString().slice(0, 16);
  });
  const [editingChallengeId, setEditingChallengeId] = useState<string | number | null>(null);
  const [savingChallenge, setSavingChallenge] = useState(false);

  // Challenge form state
  const [theme, setTheme] = useState(activeChallenge?.theme || "Une touche de rouge");
  const [brief, setBrief] = useState(
    activeChallenge?.brief ||
      "Photographie un objet rouge qui a déjà vécu. Un détail, une texture, une histoire — avant minuit.",
  );

  async function loadChallenges() {
    const list = await fetchAllChallengesList();
    setChallengesList(list);
  }

  useEffect(() => {
    loadChallenges();
  }, [activeChallenge?.id, tab]);

  useEffect(() => {
    if (activeChallenge && !editingChallengeId) {
      setTheme(activeChallenge.theme);
      setBrief(activeChallenge.brief);
    }
  }, [activeChallenge, editingChallengeId]);

  // Official & pinned posts list
  const officialPosts = posts.filter((p) => p.isOfficial || p.isPinned);
  const currentOfficialPost = officialPosts[0] || null;
  const [activeGearMenuPostId, setActiveGearMenuPostId] = useState<string | number | null>(null);

  // Close gear menus on outside click
  useEffect(() => {
    function handleCloseMenu() {
      setActiveGearMenuPostId(null);
    }
    window.addEventListener("click", handleCloseMenu);
    return () => window.removeEventListener("click", handleCloseMenu);
  }, []);

  // Announcement state
  const [editingPostId, setEditingPostId] = useState<string | number | null>(null);
  const [announcementPhoto, setAnnouncementPhoto] = useState(media.redPhone);
  const [announcementFile, setAnnouncementFile] = useState<File | null>(null);
  const [announcementCaption, setAnnouncementCaption] = useState(
    "Défi officiel du jour lancé ! Capturez un objet ou un détail correspondant au thème et partagez votre photo avant minuit.",
  );
  const [isPinned, setIsPinned] = useState(true);
  const [publishingPost, setPublishingPost] = useState(false);

  // Mystery Boxes queue state
  const [mysteryBoxesList, setMysteryBoxesList] = useState<MysteryItemData[]>([]);
  const [isMysterySchedulingMode, setIsMysterySchedulingMode] = useState(false);
  const [mysteryDayNumber, setMysteryDayNumber] = useState(mysteryItem.dayNumber || 1);
  const [mysteryStartsAt, setMysteryStartsAt] = useState(() => {
    const today = new Date();
    today.setHours(8, 0, 0, 0);
    return today.toISOString().slice(0, 16);
  });
  const [mysteryEndsAt, setMysteryEndsAt] = useState(() => {
    const today = new Date();
    today.setHours(20, 0, 0, 0);
    return today.toISOString().slice(0, 16);
  });
  const [editingMysteryId, setEditingMysteryId] = useState<string | number | null>(null);
  const [savingMystery, setSavingMystery] = useState(false);

  // Mystery form state
  const [mysteryTitle, setMysteryTitle] = useState(mysteryItem.title);
  const [mysteryImage, setMysteryImage] = useState(mysteryItem.image);
  const [mysteryFile, setMysteryFile] = useState<File | null>(null);
  const [mysteryBrief, setMysteryBrief] = useState(mysteryItem.brief);
  const [mysteryHint, setMysteryHint] = useState(mysteryItem.hint);
  const [mysteryRealPrice, setMysteryRealPrice] = useState(String(mysteryItem.realPrice));

  async function loadMysteryBoxes() {
    const list = await fetchAllMysteryBoxesList();
    setMysteryBoxesList(list);
  }

  useEffect(() => {
    loadMysteryBoxes();
  }, [mysteryItem.id, tab]);

  useEffect(() => {
    if (mysteryItem && !editingMysteryId) {
      setMysteryTitle(mysteryItem.title);
      setMysteryImage(mysteryItem.image);
      setMysteryBrief(mysteryItem.brief);
      setMysteryHint(mysteryItem.hint);
      setMysteryRealPrice(String(mysteryItem.realPrice));
      setMysteryDayNumber(mysteryItem.dayNumber || 1);
    }
  }, [mysteryItem, editingMysteryId]);

  // Moderation state
  const [searchQuery, setSearchQuery] = useState("");
  const [modFilter, setModFilter] = useState<"all" | "official" | "players" | "recruitment">("all");
  const [editingModalPost, setEditingModalPost] = useState<FeedPost | null>(null);
  const [editPostCaption, setEditPostCaption] = useState("");
  const [editPostPhoto, setEditPostPhoto] = useState("");
  const [modPostFile, setModPostFile] = useState<File | null>(null);

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

    if (!isSupabaseConfigured) return;

    const adminRealtimeChannel = supabase
      .channel("admin_realtime_dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "squads" }, () => {
        loadAdminData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "squad_members" }, () => {
        loadAdminData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        loadAdminData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "feed_posts" }, () => {
        loadAdminData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "challenges" }, () => {
        loadChallenges();
        loadAdminData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "mystery_boxes" }, () => {
        loadMysteryBoxes();
        loadAdminData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(adminRealtimeChannel);
    };
  }, [posts.length]);

  // Handle Challenge CRUD & Scheduling
  function resetChallengeForm() {
    setEditingChallengeId(null);
    setTheme(activeChallenge?.theme || "");
    setBrief(activeChallenge?.brief || "");
    setIsSchedulingMode(false);
    setDurationPreset("today");
  }

  function startEditingChallenge(c: ChallengeData) {
    setEditingChallengeId(c.id || null);
    setTheme(c.theme);
    setBrief(c.brief);
    setIsSchedulingMode(c.status === "scheduled");
    if (c.starts_at) {
      setScheduleStartsAt(new Date(c.starts_at).toISOString().slice(0, 16));
    }
    if (c.ends_at) {
      setScheduleEndsAt(new Date(c.ends_at).toISOString().slice(0, 16));
      setDurationPreset("custom");
    }
    window.scrollTo({ top: 350, behavior: "smooth" });
    onNotice(`Modification du défi « ${c.theme} »`);
  }

  async function handleSaveChallenge(event: FormEvent) {
    event.preventDefault();
    if (!theme.trim()) return;

    setSavingChallenge(true);
    try {
      let startsAtIso: string;
      let endsAtIso: string;

      if (isSchedulingMode) {
        startsAtIso = new Date(scheduleStartsAt).toISOString();
        endsAtIso = new Date(scheduleEndsAt).toISOString();
      } else {
        const now = new Date();
        startsAtIso = now.toISOString();

        if (durationPreset === "today") {
          const endOfDay = new Date();
          endOfDay.setHours(23, 59, 59, 999);
          endsAtIso = endOfDay.toISOString();
        } else if (durationPreset === "12h") {
          endsAtIso = new Date(now.getTime() + 12 * 3600 * 1000).toISOString();
        } else if (durationPreset === "24h") {
          endsAtIso = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
        } else if (durationPreset === "48h") {
          endsAtIso = new Date(now.getTime() + 48 * 3600 * 1000).toISOString();
        } else {
          endsAtIso = new Date(scheduleEndsAt).toISOString();
        }
      }

      const challengePayload: Partial<ChallengeData> = {
        id: editingChallengeId || undefined,
        theme: theme.trim(),
        brief: brief.trim(),
        status: isSchedulingMode ? "scheduled" : "active",
        starts_at: startsAtIso,
        ends_at: endsAtIso,
      };

      const saved = await saveActiveChallenge(challengePayload, {
        isScheduled: isSchedulingMode,
        startsAt: startsAtIso,
        endsAt: endsAtIso,
      });

      if (!isSchedulingMode) {
        onChallengeUpdated({
          id: saved?.id || editingChallengeId || Date.now(),
          theme: theme.trim(),
          brief: brief.trim(),
          date: new Date(startsAtIso).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }),
          starts_at: startsAtIso,
          ends_at: endsAtIso,
          status: "active",
        });
      }

      await loadChallenges();
      resetChallengeForm();
      onNotice(isSchedulingMode ? "Défi programmé avec succès !" : "Défi publié et actif immédiatement sur le feed !");
    } catch (err: any) {
      console.error("Save challenge failed:", err);
      onNotice(`Erreur : ${err.message || "écriture refusée par Supabase"}`);
    } finally {
      setSavingChallenge(false);
    }
  }

  async function handleActivateChallenge(challengeId: string | number) {
    try {
      const activated = await activateChallengeNow(challengeId);
      if (activated) {
        onChallengeUpdated({
          id: activated.id,
          theme: activated.theme,
          brief: activated.brief,
          date: new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
          starts_at: activated.starts_at,
          ends_at: activated.ends_at,
          status: "active",
        });
      }
      await loadChallenges();
      onNotice("Défi activé immédiatement en direct sur le feed !");
    } catch (err: any) {
      onNotice(`Erreur : ${err.message || "activation impossible"}`);
    }
  }

  async function handleDeleteChallengeItem(challengeId: string | number) {
    try {
      await deleteChallenge(challengeId);
      if (activeChallenge?.id === challengeId) {
        onChallengeUpdated(null);
      }
      await loadChallenges();
      onNotice("Défi supprimé avec succès.");
    } catch (err: any) {
      onNotice(`Erreur : ${err.message || "suppression impossible"}`);
    }
  }

  async function handleDeactivateChallenge() {
    try {
      await deactivateActiveChallenge();
      onChallengeUpdated(null);
      await loadChallenges();
      onNotice("Défi du jour retiré du feed.");
    } catch (err: any) {
      console.error("Deactivate challenge failed:", err);
      onNotice(`Erreur lors du retrait du défi : ${err.message || "écriture refusée par Supabase"}`);
    }
  }

  // Handle Official Post Form
  function startEditingOfficialPost(post: FeedPost) {
    setEditingPostId(post.id);
    setAnnouncementPhoto(post.photo || media.redPhone);
    setAnnouncementFile(null);
    setAnnouncementCaption(post.caption || "");
    setIsPinned(post.isPinned || false);
    onNotice(`Modification du post officiel en cours.`);
  }

  function resetOfficialPostForm() {
    setEditingPostId(null);
    setAnnouncementPhoto(media.redPhone);
    setAnnouncementFile(null);
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
      let finalPhotoUrl = announcementPhoto;
      if (announcementFile) {
        const uploaded = await uploadImage(announcementFile, "posts");
        if (uploaded) finalPhotoUrl = uploaded;
      }

      if (editingPostId) {
        // UPDATE existing post
        await updateFeedPost(editingPostId, {
          caption: announcementCaption.trim(),
          photo_url: finalPhotoUrl,
          is_pinned: isPinned,
          is_official: true,
        });
        onNotice("Post officiel mis à jour avec succès dans le feed !");
      } else {
        // CREATE new official post
        const uid = currentUserId || null;
        await createOfficialPost(uid, finalPhotoUrl, announcementCaption.trim(), isPinned);
        onNotice("Annonce officielle Game Master publiée dans le feed.");
      }
      await onPostCreated();
      resetOfficialPostForm();
    } catch (err: any) {
      console.error("Error saving official post:", err);
      onNotice(err?.message || "Erreur lors de la sauvegarde du post officiel.");
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
        try {
          onPostDeleted(postId);
          await deleteFeedPost(postId);
          if (editingPostId === postId) {
            resetOfficialPostForm();
          }
          await onPostCreated();
          onNotice("Post officiel supprimé avec succès.");
        } catch (err: any) {
          console.error("Error deleting post:", err);
          onNotice(err?.message || "Erreur lors de la suppression du post.");
        }
      },
    });
  }

  async function handleTogglePin(postId: string | number, currentPinStatus: boolean) {
    try {
      const nextPin = !currentPinStatus;
      await togglePinPost(postId, nextPin);
      await onPostCreated();
      onNotice(nextPin ? "Publication épinglée en tête du feed." : "Publication désépinglée.");
    } catch (err: any) {
      console.error("Error toggling pin:", err);
      onNotice(err?.message || "Erreur lors de la modification de l'épinglage.");
    }
  }

  // Handle Mystery Box CRUD & Scheduling
  function resetMysteryForm() {
    setEditingMysteryId(null);
    setMysteryTitle(mysteryItem.title || "");
    setMysteryImage(mysteryItem.image || media.mystery);
    setMysteryFile(null);
    setMysteryBrief(mysteryItem.brief || "");
    setMysteryHint(mysteryItem.hint || "");
    setMysteryRealPrice(String(mysteryItem.realPrice || 50));
    setMysteryDayNumber(mysteryItem.dayNumber || 1);
    setIsMysterySchedulingMode(false);
  }

  function startEditingMysteryBox(box: MysteryItemData) {
    setEditingMysteryId(box.id || null);
    setMysteryTitle(box.title);
    setMysteryImage(box.image);
    setMysteryFile(null);
    setMysteryBrief(box.brief);
    setMysteryHint(box.hint);
    setMysteryRealPrice(String(box.realPrice));
    setMysteryDayNumber(box.dayNumber || 1);
    setIsMysterySchedulingMode(box.status === "scheduled");
    if (box.starts_at) {
      setMysteryStartsAt(new Date(box.starts_at).toISOString().slice(0, 16));
    }
    if (box.ends_at) {
      setMysteryEndsAt(new Date(box.ends_at).toISOString().slice(0, 16));
    }
    window.scrollTo({ top: 350, behavior: "smooth" });
    onNotice(`Modification de l'objet « ${box.title} »`);
  }

  async function handleSaveMystery(event: FormEvent) {
    event.preventDefault();
    if (!mysteryTitle.trim()) return;

    setSavingMystery(true);
    try {
      let finalImageUrl = mysteryImage;
      if (mysteryFile) {
        const uploaded = await uploadImage(mysteryFile, "posts");
        if (uploaded) finalImageUrl = uploaded;
      }

      let startsAtIso: string;
      let endsAtIso: string;

      if (isMysterySchedulingMode) {
        startsAtIso = new Date(mysteryStartsAt).toISOString();
        endsAtIso = new Date(mysteryEndsAt).toISOString();
      } else {
        const today = new Date();
        const start = new Date(today);
        start.setHours(8, 0, 0, 0);
        const end = new Date(today);
        end.setHours(20, 0, 0, 0);

        startsAtIso = start.toISOString();
        endsAtIso = end.toISOString();
      }

      const updatedPayload: Partial<MysteryItemData> = {
        id: editingMysteryId || undefined,
        title: mysteryTitle.trim(),
        image: finalImageUrl,
        brief: mysteryBrief.trim(),
        hint: mysteryHint.trim(),
        realPrice: Number(mysteryRealPrice) || 50,
        dayNumber: mysteryDayNumber,
        status: isMysterySchedulingMode ? "scheduled" : "active",
        starts_at: startsAtIso,
        ends_at: endsAtIso,
      };

      const saved = await saveMysteryItem(updatedPayload, {
        isScheduled: isMysterySchedulingMode,
        startsAt: startsAtIso,
        endsAt: endsAtIso,
        dayNumber: mysteryDayNumber,
      });

      if (!isMysterySchedulingMode) {
        onMysteryUpdated({
          id: saved?.id || editingMysteryId || Date.now(),
          title: mysteryTitle.trim(),
          image: finalImageUrl,
          brief: mysteryBrief.trim(),
          hint: mysteryHint.trim(),
          realPrice: Number(mysteryRealPrice) || 50,
          dayNumber: mysteryDayNumber,
          status: "active",
          starts_at: startsAtIso,
          ends_at: endsAtIso,
        });
      }

      await loadMysteryBoxes();
      resetMysteryForm();
      onNotice(isMysterySchedulingMode ? "Mystery Box programmée avec succès !" : "Mystery Box mise en jeu (08h00 - 20h00) !");
    } catch (err: any) {
      console.error("Save mystery box error:", err);
      onNotice(`Erreur : ${err.message || "écriture refusée par Supabase"}`);
    } finally {
      setSavingMystery(false);
    }
  }

  async function handleActivateMysteryBox(boxId: string | number) {
    try {
      const activated = await activateMysteryBoxNow(boxId);
      if (activated) {
        onMysteryUpdated({
          id: activated.id,
          title: activated.item_name,
          image: activated.photo_url,
          brief: activated.description,
          hint: activated.history_details,
          realPrice: Number(activated.real_price),
          dayNumber: activated.day_number,
          status: "active",
          starts_at: activated.starts_at,
          ends_at: activated.ends_at,
        });
      }
      await loadMysteryBoxes();
      onNotice("Mystery Box mise en jeu immédiatement en direct !");
    } catch (err: any) {
      onNotice(`Erreur : ${err.message || "activation impossible"}`);
    }
  }

  async function handleRevealMysteryBox(boxId: string | number) {
    try {
      await revealMysteryBoxNow(boxId);
      await loadMysteryBoxes();
      onNotice("Vrai prix révélé et points d'escouade calculés !");
    } catch (err: any) {
      onNotice(`Erreur : ${err.message || "révélation impossible"}`);
    }
  }

  async function handleDeleteMysteryBoxItem(boxId: string | number) {
    try {
      await deleteMysteryBox(boxId);
      await loadMysteryBoxes();
      onNotice("Mystery Box supprimée.");
    } catch (err: any) {
      onNotice(`Erreur : ${err.message || "suppression impossible"}`);
    }
  }

  // Handle Edit Any Post Modal
  function openEditPostModal(post: FeedPost) {
    setEditingModalPost(post);
    setEditPostCaption(post.caption || "");
    setEditPostPhoto(post.photo || "");
    setModPostFile(null);
  }

  async function handleSaveEditedPost(event: FormEvent) {
    event.preventDefault();
    if (!editingModalPost) return;

    let finalPhotoUrl = editPostPhoto;
    if (modPostFile) {
      const uploaded = await uploadImage(modPostFile, "posts");
      if (uploaded) finalPhotoUrl = uploaded;
    }

    await updateFeedPost(editingModalPost.id, {
      caption: editPostCaption.trim(),
      photo_url: finalPhotoUrl,
    });
    setEditingModalPost(null);
    setModPostFile(null);
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
      description: `L'escouade sera dissoute, ses ${squad.membersCount} membres seront libérés et son annonce de recrutement dans le feed sera automatiquement supprimée.`,
      confirmText: "Dissoudre",
      onConfirm: async () => {
        await deleteSquadAdmin(squad.id, squad.code);
        setSquadsList((prev) => prev.filter((s) => s.id !== squad.id));
        setMetrics((prev) => ({ ...prev, totalSquads: Math.max(0, prev.totalSquads - 1) }));
        onPostCreated();
        onNotice(`L'escouade « ${squad.name} » a été dissoute et son post supprimé du feed.`);
      },
    });
  }

  function handlePhotoUpload(
    event: ChangeEvent<HTMLInputElement>,
    previewSetter: (val: string) => void,
    fileSetter?: (file: File | null) => void,
  ) {
    const file = event.target.files?.[0];
    if (file) {
      if (fileSetter) fileSetter(file);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          previewSetter(reader.result);
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

      {/* TAB 1: DÉFI DU JOUR & PROGRAMMATION MULTI-DÉFIS */}
      {tab === "challenge" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* 1. CARTE DU DÉFI ACTUELLEMENT EN COURS */}
          {activeChallenge ? (
            <div className="overflow-hidden rounded-[28px] border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/50 via-white to-[#fbf8f1] p-6 sm:p-7 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                    Défi Actuellement en Ligne sur le Feed
                  </span>
                </div>
                <ChallengeCountdownBadge endsAt={activeChallenge.ends_at} />
              </div>

              <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#173f35]">
                    {activeChallenge.theme}
                  </h3>
                  <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[#53655b]">
                    {activeChallenge.brief}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEditingChallenge(activeChallenge)}
                    className="flex items-center gap-1.5 rounded-full border border-[#173f35]/15 bg-white px-4 py-2.5 text-xs font-bold text-[#173f35] shadow-sm transition hover:bg-[#fbf8f1]"
                  >
                    <Edit3 size={14} /> Modifier
                  </button>
                  <button
                    type="button"
                    onClick={handleDeactivateChallenge}
                    className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-100"
                  >
                    <PauseCircle size={14} /> Retirer du feed
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-[#173f35]/20 bg-[#fbf8f1] p-6 text-center">
              <Sparkles size={24} className="mx-auto text-[#e9683a]" />
              <p className="mt-2 font-display text-lg font-bold text-[#173f35]">Aucun défi en direct actuellement</p>
              <p className="mt-1 text-xs text-[#6e7d75]">
                Publiez un nouveau défi ci-dessous pour lancer la session de jeu sur le feed.
              </p>
            </div>
          )}

          {/* 2. FORMULAIRE DE CRÉATION & PROGRAMMATION */}
          <div className="rounded-[28px] bg-white p-6 sm:p-8 shadow-sm border border-[#173f35]/8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#e9683a]">
                  <Sparkles size={16} /> {editingChallengeId ? "Modifier le Défi" : "Créer / Programmer un Défi"}
                </div>
                <h2 className="mt-1 font-display text-2xl font-semibold text-[#173f35]">
                  {editingChallengeId ? "Modifier les paramètres du défi" : "Lancer ou planifier un défi photo"}
                </h2>
              </div>

              {/* Toggle Mode: Immédiat vs Programmer */}
              <div className="flex items-center rounded-2xl bg-[#f5f0e5] p-1.5 border border-[#173f35]/8">
                <button
                  type="button"
                  onClick={() => setIsSchedulingMode(false)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                    !isSchedulingMode
                      ? "bg-[#173f35] text-white shadow-sm"
                      : "text-[#53655b] hover:text-[#173f35]"
                  }`}
                >
                  <Play size={13} /> Publier maintenant
                </button>
                <button
                  type="button"
                  onClick={() => setIsSchedulingMode(true)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                    isSchedulingMode
                      ? "bg-[#e9683a] text-white shadow-sm"
                      : "text-[#53655b] hover:text-[#173f35]"
                  }`}
                >
                  <CalendarPlus size={13} /> Programmer futur
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveChallenge} className="mt-6 space-y-5">
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                  Thème du défi
                </label>
                <input
                  type="text"
                  required
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="Ex: Une touche de rouge, Reflets urbains, Objets vintage…"
                  className="mt-1.5 w-full rounded-2xl border-2 border-[#173f35]/10 bg-[#fbf8f1] px-4 py-3.5 text-sm font-bold text-[#173f35] outline-none transition focus:border-[#e9683a] focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                  Brief & Consignes du Game Master
                </label>
                <textarea
                  rows={3}
                  required
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="Ex: Photographie un objet rouge qui a déjà vécu. Un détail, une texture, une histoire — avant minuit."
                  className="mt-1.5 w-full rounded-2xl border-2 border-[#173f35]/10 bg-[#fbf8f1] p-4 text-sm text-[#173f35] outline-none transition focus:border-[#e9683a] focus:bg-white"
                />
              </div>

              {/* DURATION / SCHEDULING CONTROLS */}
              {!isSchedulingMode ? (
                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                    Durée du défi (Compte à rebours)
                  </label>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { id: "today", label: "Fin à 23h59" },
                      { id: "12h", label: "12 Heures" },
                      { id: "24h", label: "24 Heures" },
                      { id: "48h", label: "48 Heures" },
                      { id: "custom", label: "Personnalisé" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setDurationPreset(item.id as any)}
                        className={`rounded-xl border py-2.5 px-3 text-xs font-bold transition ${
                          durationPreset === item.id
                            ? "border-[#173f35] bg-[#173f35] text-white shadow-sm"
                            : "border-[#173f35]/10 bg-[#fbf8f1] text-[#53655b] hover:bg-white"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {durationPreset === "custom" && (
                    <div className="mt-3">
                      <label className="text-[11px] font-bold text-[#6e7d75]">Date et Heure de fin</label>
                      <input
                        type="datetime-local"
                        value={scheduleEndsAt}
                        onChange={(e) => setScheduleEndsAt(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-[#173f35]/15 bg-[#fbf8f1] px-4 py-2.5 text-xs font-bold text-[#173f35]"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4 rounded-2xl bg-[#fbf8f1] p-4 border border-[#173f35]/8">
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                      Date & Heure de Début
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={scheduleStartsAt}
                      onChange={(e) => setScheduleStartsAt(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-[#173f35]/15 bg-white px-4 py-3 text-xs font-bold text-[#173f35] outline-none focus:border-[#e9683a]"
                    />
                    <p className="mt-1 text-[10px] text-[#6e7d75]">Le défi s'activera automatiquement à ce moment.</p>
                  </div>
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                      Date & Heure de Fin
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={scheduleEndsAt}
                      onChange={(e) => setScheduleEndsAt(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-[#173f35]/15 bg-white px-4 py-3 text-xs font-bold text-[#173f35] outline-none focus:border-[#e9683a]"
                    />
                    <p className="mt-1 text-[10px] text-[#6e7d75]">Les uploads seront clos à cette date/heure.</p>
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingChallenge}
                  className="flex items-center gap-2 rounded-full bg-[#173f35] px-6 py-3.5 text-xs font-extrabold text-white transition hover:bg-[#23584b] shadow-lg shadow-[#173f35]/20 disabled:opacity-50"
                >
                  {savingChallenge ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : isSchedulingMode ? (
                    <CalendarPlus size={15} />
                  ) : (
                    <Save size={15} />
                  )}
                  {editingChallengeId
                    ? "Mettre à jour le défi"
                    : isSchedulingMode
                    ? "Planifier ce défi dans la file d'attente"
                    : "Enregistrer et publier immédiatement"}
                </button>

                {editingChallengeId && (
                  <button
                    type="button"
                    onClick={resetChallengeForm}
                    className="rounded-full border border-[#173f35]/15 bg-white px-5 py-3.5 text-xs font-bold text-[#53655b] hover:bg-[#fbf8f1]"
                  >
                    Annuler la modification
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* 3. FILE D'ATTENTE DES DÉFIS PROGRAMMÉS */}
          <div className="rounded-[28px] bg-white p-6 sm:p-8 shadow-sm border border-[#173f35]/8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#488262]">
                <Layers size={16} /> File d'attente des Défis Programmés
              </div>
              <span className="rounded-full bg-[#173f35]/10 px-3 py-1 text-xs font-bold text-[#173f35]">
                {challengesList.filter((c) => c.status === "scheduled").length} programmé(s)
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {challengesList.filter((c) => c.status === "scheduled").length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#173f35]/15 bg-[#fbf8f1] p-6 text-center">
                  <Clock size={20} className="mx-auto text-[#8a958f]" />
                  <p className="mt-2 text-xs font-bold text-[#53655b]">Aucun défi en file d'attente pour le moment</p>
                  <p className="mt-1 text-[11px] text-[#8a958f]">
                    Utilisez l'option « Programmer futur » ci-dessus pour planifier les défis des prochains jours.
                  </p>
                </div>
              ) : (
                challengesList
                  .filter((c) => c.status === "scheduled")
                  .map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-200/60 bg-amber-50/40 p-4 transition hover:bg-amber-50"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-900 uppercase">
                            📅 Programmé
                          </span>
                          <span className="text-xs font-bold text-[#53655b]">
                            Du {new Date(c.starts_at || "").toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} au {new Date(c.ends_at || "").toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <h4 className="mt-1.5 text-base font-bold text-[#173f35]">{c.theme}</h4>
                        <p className="text-xs text-[#53655b] line-clamp-1">{c.brief}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => c.id && handleActivateChallenge(c.id)}
                          className="flex items-center gap-1 rounded-full bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 shadow-sm"
                        >
                          <Play size={12} /> Activer maintenant
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditingChallenge(c)}
                          className="rounded-full border border-[#173f35]/15 bg-white p-2 text-[#173f35] hover:bg-[#fbf8f1]"
                          title="Modifier"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => c.id && handleDeleteChallengeItem(c.id)}
                          className="rounded-full border border-red-200 bg-white p-2 text-red-600 hover:bg-red-50"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 2: POST OFFICIEL DU GAME MASTER (CRUD) */}
      {tab === "announcement" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* 1. SCENARIO: EXACTLY 1 OFFICIAL POST (SINGLE CARD LAYOUT) */}
          {officialPosts.length === 1 && currentOfficialPost && (
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

          {/* 2. SCENARIO: MULTIPLE OFFICIAL POSTS (4:3 GRID WITH GEAR ACTION DRAWER) */}
          {officialPosts.length >= 2 && (
            <div className="rounded-[28px] border-2 border-[#f3c969]/60 bg-white p-6 shadow-md space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#173f35]/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-[#173f35] px-3.5 py-1 text-xs font-extrabold text-[#f3c969]">
                    <Pin size={13} className="fill-[#f3c969]" /> Posts Officiels en Ligne ({officialPosts.length})
                  </span>
                  <span className="text-xs font-semibold text-[#76837c]">
                    Format 4:3 · Cliquez sur l'engrenage pour gérer
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {officialPosts.map((post) => {
                  const isMenuOpen = activeGearMenuPostId === post.id;
                  return (
                    <div
                      key={post.id}
                      className="group relative aspect-[4/3] overflow-hidden rounded-[22px] bg-[#173f35] shadow-md border border-[#173f35]/15 transition hover:shadow-xl"
                    >
                      {/* Post Photo */}
                      <img
                        src={post.photo}
                        alt={post.caption}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />

                      {/* Gradient Overlay for Readability */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                      {/* Badges Top-Left */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1 items-start z-10">
                        {post.isPinned ? (
                          <span className="flex items-center gap-1 rounded-full bg-[#e9683a] px-2.5 py-0.5 text-[10px] font-black uppercase text-white shadow-md">
                            <Pin size={11} className="fill-white" /> Épinglé
                          </span>
                        ) : (
                          <span className="rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white/90">
                            Officiel
                          </span>
                        )}
                      </div>

                      {/* Gear Button Top-Right & Mini Drawer */}
                      <div className="absolute top-3 right-3 z-30" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          aria-label="Actions du post"
                          onClick={() => setActiveGearMenuPostId(isMenuOpen ? null : post.id)}
                          className="grid h-8 w-8 place-items-center rounded-full bg-black/65 text-white backdrop-blur-md shadow-lg transition hover:bg-[#f3c969] hover:text-[#173f35] hover:scale-110 active:scale-95"
                          title="Actions sur ce post"
                        >
                          <Settings size={15} className={isMenuOpen ? "rotate-90 transition duration-300" : "transition duration-300"} />
                        </button>

                        {/* Mini Drawer Menu */}
                        <AnimatePresence>
                          {isMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: -4 }}
                              className="absolute right-0 top-10 w-48 rounded-2xl border border-[#173f35]/15 bg-white p-1.5 shadow-2xl z-40 divide-y divide-[#173f35]/8 text-left"
                            >
                              <div className="space-y-0.5 pb-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveGearMenuPostId(null);
                                    startEditingOfficialPost(post);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#173f35] transition hover:bg-[#f5efe6]"
                                >
                                  <Edit3 size={13} /> Modifier
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveGearMenuPostId(null);
                                    handleTogglePin(post.id, Boolean(post.isPinned));
                                  }}
                                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#173f35] transition hover:bg-[#f5efe6]"
                                >
                                  {post.isPinned ? <PinOff size={13} className="text-[#e9683a]" /> : <Pin size={13} className="text-[#f3c969]" />}
                                  {post.isPinned ? "Désépingler" : "Épingler en tête"}
                                </button>
                              </div>

                              <div className="pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveGearMenuPostId(null);
                                    handleDeleteOfficialPost(post.id);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50"
                                >
                                  <Trash2 size={13} /> Supprimer
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Bottom Info: Caption & Likes */}
                      <div className="absolute bottom-3 inset-x-3 text-white z-10">
                        <p className="line-clamp-2 text-xs font-semibold leading-snug drop-shadow-sm text-white/95">
                          {post.caption || "Défi officiel Game Master"}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] font-bold text-white/75">
                          <span>{post.time}</span>
                          <span>{post.likes || 0} ❤️ · {post.comments?.length || 0} 💬</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                    <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setAnnouncementPhoto, setAnnouncementFile)} className="hidden" />
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

      {/* TAB 3: MYSTERY BOX & PROGRAMMATION DE LA SEMAINE */}
      {tab === "mystery" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* 1. CARTE DE L'OBJET MYSTÈRE ACTUELLEMENT EN JEU */}
          <div className="overflow-hidden rounded-[28px] border-2 border-[#f3c969]/60 bg-gradient-to-br from-[#fefbf3] via-white to-[#fbf8f1] p-6 sm:p-7 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-[#e9683a] animate-ping" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#e9683a]">
                  Mystery Box du Jour (Session 08h00 ➔ 20h00)
                </span>
                <span className="rounded-full bg-[#173f35] px-2.5 py-0.5 text-[10px] font-bold text-[#f3c969]">
                  Jour {mysteryItem.dayNumber || 4} / 6
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ChallengeCountdownBadge endsAt={mysteryItem.ends_at} />
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 border border-emerald-300">
                  Prix réel : {mysteryItem.realPrice} €
                </span>
              </div>
            </div>

            <div className="mt-5 flex flex-col md:flex-row gap-6 items-start md:items-center">
              <img
                src={mysteryItem.image}
                alt={mysteryItem.title}
                className="h-28 w-28 rounded-2xl object-cover border-2 border-[#173f35]/15 shadow-md shrink-0"
              />
              <div className="flex-1">
                <h3 className="font-display text-2xl font-bold text-[#173f35]">{mysteryItem.title}</h3>
                <p className="mt-1 text-xs text-[#53655b] leading-relaxed line-clamp-2">{mysteryItem.brief}</p>
                <div className="mt-2.5 flex items-center gap-2 text-xs font-bold text-[#e9683a]">
                  <Sparkles size={13} />
                  <span>Indice : « {mysteryItem.hint} »</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => mysteryItem.id && handleRevealMysteryBox(mysteryItem.id)}
                  className="flex items-center justify-center gap-1.5 rounded-full bg-[#e9683a] px-4 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-[#d9582d]"
                >
                  <Sparkles size={14} /> Révéler le prix maintenant
                </button>
                <button
                  type="button"
                  onClick={() => startEditingMysteryBox(mysteryItem)}
                  className="flex items-center justify-center gap-1.5 rounded-full border border-[#173f35]/15 bg-white px-4 py-2.5 text-xs font-bold text-[#173f35] shadow-sm transition hover:bg-[#fbf8f1]"
                >
                  <Edit3 size={14} /> Modifier cet objet
                </button>
              </div>
            </div>
          </div>

          {/* 2. FORMULAIRE DE CONFIGURATION & PROGRAMMATION */}
          <div className="rounded-[28px] bg-white p-6 sm:p-8 shadow-sm border border-[#173f35]/8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#e9683a]">
                  <PackageOpen size={16} /> {editingMysteryId ? "Modifier l'Objet Mystère" : "Ajouter / Programmer un Objet"}
                </div>
                <h2 className="mt-1 font-display text-2xl font-semibold text-[#173f35]">
                  {editingMysteryId ? "Modifier les paramètres de la box" : "Planifier les Mystery Boxes de la semaine"}
                </h2>
                <p className="mt-1 text-xs text-[#6f7e76]">
                  Créneau officiel d'estimation : 08h00 à 20h00 avec révélation et calcul de points à 20h00.
                </p>
              </div>

              {/* Mode Toggle: Immédiat vs Programmer Semaine */}
              <div className="flex items-center rounded-2xl bg-[#f5f0e5] p-1.5 border border-[#173f35]/8">
                <button
                  type="button"
                  onClick={() => setIsMysterySchedulingMode(false)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                    !isMysterySchedulingMode
                      ? "bg-[#173f35] text-white shadow-sm"
                      : "text-[#53655b] hover:text-[#173f35]"
                  }`}
                >
                  <Play size={13} /> Actif aujourd'hui
                </button>
                <button
                  type="button"
                  onClick={() => setIsMysterySchedulingMode(true)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                    isMysterySchedulingMode
                      ? "bg-[#e9683a] text-white shadow-sm"
                      : "text-[#53655b] hover:text-[#173f35]"
                  }`}
                >
                  <CalendarPlus size={13} /> Programmer date
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveMystery} className="mt-6 space-y-5">
              {/* Day selector */}
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                  Numéro du Jour dans le Cycle de la Semaine
                </label>
                <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setMysteryDayNumber(day)}
                      className={`rounded-xl border py-2.5 px-3 text-xs font-bold transition ${
                        mysteryDayNumber === day
                          ? "border-[#173f35] bg-[#173f35] text-white shadow-sm"
                          : "border-[#173f35]/10 bg-[#fbf8f1] text-[#53655b] hover:bg-white"
                      }`}
                    >
                      Jour #{day}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">Nom de l'objet</label>
                <input
                  type="text"
                  required
                  value={mysteryTitle}
                  onChange={(e) => setMysteryTitle(e.target.value)}
                  placeholder="Ex: Vase en faïence à décor floral, Lampe champignon 1974…"
                  className="mt-1.5 w-full rounded-2xl border-2 border-[#173f35]/10 bg-[#fbf8f1] px-4 py-3.5 text-sm font-bold text-[#173f35] outline-none transition focus:border-[#e9683a] focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">Photo de l'objet mystère</label>
                <div className="mt-2 flex items-center gap-4">
                  <img
                    src={mysteryImage}
                    alt="Objet Mystère"
                    className="h-20 w-20 rounded-2xl object-cover border-2 border-[#173f35]/10 shadow-sm"
                  />
                  <label className="flex cursor-pointer items-center gap-2 rounded-full border-2 border-dashed border-[#173f35]/20 bg-[#fbf8f1] px-4 py-2.5 text-xs font-extrabold text-[#173f35] transition hover:border-[#e9683a] hover:bg-white hover:text-[#e9683a]">
                    <Upload size={15} /> Téléverser une photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, setMysteryImage, setMysteryFile)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                  Description & Détails de l'état
                </label>
                <textarea
                  rows={2}
                  required
                  value={mysteryBrief}
                  onChange={(e) => setMysteryBrief(e.target.value)}
                  placeholder="Ex: Hauteur 31 cm. Signature sous la base. Parfait état de conservation…"
                  className="mt-1.5 w-full rounded-2xl border-2 border-[#173f35]/10 bg-[#fbf8f1] p-4 text-sm text-[#173f35] outline-none transition focus:border-[#e9683a] focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">Indice secret pour les joueurs</label>
                <input
                  type="text"
                  required
                  value={mysteryHint}
                  onChange={(e) => setMysteryHint(e.target.value)}
                  placeholder="Ex: Une pièce décorative qui a traversé au moins trois générations."
                  className="mt-1.5 w-full rounded-2xl border-2 border-[#173f35]/10 bg-[#fbf8f1] px-4 py-3 text-sm text-[#173f35] outline-none transition focus:border-[#e9683a] focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                  Vrai prix réel de référence (€)
                </label>
                <div className="relative mt-1.5">
                  <input
                    type="number"
                    required
                    min="1"
                    value={mysteryRealPrice}
                    onChange={(e) => setMysteryRealPrice(e.target.value)}
                    placeholder="Ex: 68"
                    className="w-full rounded-2xl border-2 border-[#173f35]/10 bg-[#fbf8f1] px-4 py-3.5 pr-10 text-sm font-bold text-[#173f35] outline-none transition focus:border-[#e9683a] focus:bg-white"
                  />
                  <span className="pointer-events-none absolute right-4 top-3.5 font-bold text-[#173f35]/40">€</span>
                </div>
              </div>

              {isMysterySchedulingMode && (
                <div className="grid sm:grid-cols-2 gap-4 rounded-2xl bg-[#fbf8f1] p-4 border border-[#173f35]/8">
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                      Ouverture des estimations (08h00)
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={mysteryStartsAt}
                      onChange={(e) => setMysteryStartsAt(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-[#173f35]/15 bg-white px-4 py-3 text-xs font-bold text-[#173f35]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                      Clôture & Révélation du Prix (20h00)
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={mysteryEndsAt}
                      onChange={(e) => setMysteryEndsAt(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-[#173f35]/15 bg-white px-4 py-3 text-xs font-bold text-[#173f35]"
                    />
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingMystery}
                  className="flex items-center gap-2 rounded-full bg-[#173f35] px-6 py-3.5 text-xs font-extrabold text-white transition hover:bg-[#23584b] shadow-lg shadow-[#173f35]/20 disabled:opacity-50"
                >
                  {savingMystery ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <Save size={15} />
                  )}
                  {editingMysteryId
                    ? "Mettre à jour l'objet mystère"
                    : isMysterySchedulingMode
                    ? "Planifier cet objet dans le cycle"
                    : "Enregistrer et activer (08h-20h)"}
                </button>

                {editingMysteryId && (
                  <button
                    type="button"
                    onClick={resetMysteryForm}
                    className="rounded-full border border-[#173f35]/15 bg-white px-5 py-3.5 text-xs font-bold text-[#53655b] hover:bg-[#fbf8f1]"
                  >
                    Annuler la modification
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* 3. FILE DES MYSTERY BOXES DE LA SEMAINE */}
          <div className="rounded-[28px] bg-white p-6 sm:p-8 shadow-sm border border-[#173f35]/8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#488262]">
                <Layers size={16} /> Planning des Mystery Boxes de la Semaine
              </div>
              <span className="rounded-full bg-[#173f35]/10 px-3 py-1 text-xs font-bold text-[#173f35]">
                {mysteryBoxesList.length} objet(s) configuré(s)
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {mysteryBoxesList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#173f35]/15 bg-[#fbf8f1] p-6 text-center">
                  <PackageOpen size={20} className="mx-auto text-[#8a958f]" />
                  <p className="mt-2 text-xs font-bold text-[#53655b]">Aucune autre box programmée dans la semaine</p>
                  <p className="mt-1 text-[11px] text-[#8a958f]">
                    Ajoutez les 6 objets de la semaine pour que la relève 08h00 - 20h00 soit 100% automatisée.
                  </p>
                </div>
              ) : (
                mysteryBoxesList.map((box) => (
                  <div
                    key={box.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#173f35]/10 bg-[#fbf8f1] p-4 transition hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={box.image}
                        alt={box.title}
                        className="h-14 w-14 rounded-xl object-cover border border-[#173f35]/10 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-[#173f35] px-2.5 py-0.5 text-[10px] font-extrabold text-[#f3c969]">
                            Jour #{box.dayNumber || 1}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            box.status === "active"
                              ? "bg-emerald-100 text-emerald-800"
                              : box.status === "revealed"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {box.status === "active" ? "🟢 En cours" : box.status === "revealed" ? "🎁 Prix Révélé" : "📅 Programmé"}
                          </span>
                          <span className="text-xs font-extrabold text-[#173f35]">
                            {box.realPrice} €
                          </span>
                        </div>
                        <h4 className="mt-1 text-sm font-bold text-[#173f35]">{box.title}</h4>
                        <p className="text-xs text-[#6e7d75] line-clamp-1">{box.brief}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {box.status !== "active" && (
                        <button
                          type="button"
                          onClick={() => box.id && handleActivateMysteryBox(box.id)}
                          className="flex items-center gap-1 rounded-full bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 shadow-sm"
                        >
                          <Play size={12} /> Mettre en jeu
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => startEditingMysteryBox(box)}
                        className="rounded-full border border-[#173f35]/15 bg-white p-2 text-[#173f35] hover:bg-[#f5efe6]"
                        title="Modifier"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => box.id && handleDeleteMysteryBoxItem(box.id)}
                        className="rounded-full border border-red-200 bg-white p-2 text-red-600 hover:bg-red-50"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
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
                        <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setEditPostPhoto, setModPostFile)} className="hidden" />
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
