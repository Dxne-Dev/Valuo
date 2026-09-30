import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AdminView } from "@/features/admin";
import { AuthScreen } from "@/features/auth";
import { ComposerModal, FeedView } from "@/features/feed";
import { GameView } from "@/features/game";
import { GroupView } from "@/features/groups";
import { DesktopNavigation, MobileHeader, MobileNavigation, type Tab } from "./components/Navigation";
import { NotificationsView } from "@/features/notifications";
import { OnboardingView } from "@/features/onboarding";
import { ProfileView } from "@/features/profile";
import Logo from "./components/Logo";
import { getValuoCycleInfo } from "./lib/dateUtils";

import {
  type AppNotification,
  avatarPresets,
  avatars,
  type FeedPost,
  type GroupData,
  media,
  pinnedGameMasterPost,
  todayChallenge,
  type UserProfile,
} from "./data";
import {
  addPostComment,
  type ChallengeData,
  createFeedPost,
  createRecruitmentFeedPostObj,
  createSquadInDb,
  deleteFeedPost,
  deleteRecruitmentPostBySquadCode,
  fetchActiveChallenge,
  fetchFeedPosts,
  fetchMysteryItem,
  type MysteryItemData,
  fetchUserFriends,
  fetchUserNotifications,
  fetchUserProfile,
  fetchUserSquad,
  getCurrentSession,
  isSupabaseConfigured,
  joinSquadByCode,
  leaveSquadInDb,
  markNotificationsAsReadInDb,
  removeActiveRecruitmentLocalCache,
  republishSquadRecruitment,
  saveActiveRecruitmentLocalCache,
  saveUserProfile,
  signOutUser,
  toggleFriendshipInDb,
  togglePostLike,
} from "./lib/api";
import { supabase } from "./lib/supabase";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Base profile template for brand new users (0 stats)
const cleanUserProfile: UserProfile = {
  name: "Joueur VALUO",
  city: "France",
  avatar: avatarPresets[0].url,
  cover: media.camera,
  bio: "Créateur visuel & joueur sur VALUO.",
  memberSince: "Septembre 2026",
};

// Cross-tab broadcast channel for instant multi-tab sync
const crossTabChannel = typeof window !== "undefined" && "BroadcastChannel" in window
  ? new BroadcastChannel("valuo_auth_sync")
  : null;

function getTabFromPathname(pathname: string): Tab {
  const clean = pathname.toLowerCase().replace(/^\//, "").split("/")[0];
  if (clean === "game") return "game";
  if (clean === "group" || clean === "squad" || clean === "escouade") return "group";
  if (clean === "profile" || clean === "profil") return "profile";
  if (clean === "notifications") return "notifications";
  if (clean === "admin") return "admin";
  return "feed";
}

export default function App() {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const activeTab: Tab = getTabFromPathname(location.pathname);

  const [authLoading, setAuthLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isDemoUser, setIsDemoUser] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [authIdentifier, setAuthIdentifier] = useState("");
  const [currentUser, setCurrentUser] = useState<UserProfile>(cleanUserProfile);
  const [friends, setFriends] = useState<string[]>([]);
  const [group, setGroup] = useState<GroupData | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeData | null>(null);
  const [mysteryItem, setMysteryItem] = useState<MysteryItemData>({
    title: "Vase en faïence à décor floral",
    image: media.mystery,
    brief: "Hauteur 31 cm. Signature partiellement visible sous la base. Quelques traces du temps, sans éclat majeur.",
    hint: "Une pièce décorative qui a traversé au moins trois générations.",
    realPrice: 68,
  });
  const [composerOpen, setComposerOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Install prompt listener
  useEffect(() => {
    const handleInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleInstall);
  }, []);

  // Notice auto-dismiss timer
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // Initial Supabase session check, multi-tab sync & data loading
  useEffect(() => {
    async function initAuth() {
      if (isSupabaseConfigured) {
        setAuthLoading(true);
        const session = await getCurrentSession();
        if (session?.user) {
          setUserId(session.user.id);
          setIsDemoUser(false);
          if (session.user.email) setAuthIdentifier(session.user.email);

          // Clean URL parameters once authenticated (avoid ?mode=login#... staying in address bar)
          if (typeof window !== "undefined" && (window.location.search || window.location.hash)) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }

          await loadUserData(session.user.id, session.user);
          setSignedIn(true);
        } else {
          // If no active Supabase session, check if demo user is active in localStorage
          const isDemoActive = typeof window !== "undefined" && localStorage.getItem("valuo_demo_user") === "true";
          if (isDemoActive) {
            setIsDemoUser(true);
            setSignedIn(true);
            setIsOnboarded(true);
            const cachedSquad = localStorage.getItem("valuo_demo_squad");
            if (cachedSquad) {
              try { setGroup(JSON.parse(cachedSquad)); } catch {}
            }
          } else {
            setSignedIn(false);
            setUserId(null);
            setIsDemoUser(false);
            setIsOnboarded(false);
          }
          setAuthLoading(false);
        }

        // Supabase Auth State Change Listener
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (newSession?.user) {
            setAuthLoading(true);
            setUserId(newSession.user.id);
            setIsDemoUser(false);
            if (newSession.user.email) setAuthIdentifier(newSession.user.email);

            // Clean URL
            if (typeof window !== "undefined" && (window.location.search || window.location.hash)) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }

            await loadUserData(newSession.user.id, newSession.user);
            setSignedIn(true);
            crossTabChannel?.postMessage({ type: "AUTH_LOGIN", userId: newSession.user.id });
          } else if (event === "SIGNED_OUT") {
            setSignedIn(false);
            setUserId(null);
            setIsDemoUser(false);
            setIsOnboarded(false);
            setAuthLoading(false);
            crossTabChannel?.postMessage({ type: "AUTH_LOGOUT" });
          }
        });

        return () => {
          authListener.subscription.unsubscribe();
        };
      } else {
        setAuthLoading(false);
      }
    }

    initAuth();
    loadPublicData();

    // Cross-tab broadcast listener
    if (crossTabChannel) {
      crossTabChannel.onmessage = (event: MessageEvent) => {
        if (event.data?.type === "AUTH_LOGIN") {
          setIsDemoUser(false);
          if (event.data.userId) {
            setUserId(event.data.userId);
            loadUserData(event.data.userId).then(() => {
              setSignedIn(true);
            });
          }
        } else if (event.data?.type === "AUTH_LOGOUT") {
          setSignedIn(false);
          setUserId(null);
          setIsDemoUser(false);
          setIsOnboarded(false);
        }
      };
    }

    // Storage event listener for browsers without BroadcastChannel
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "valuo_demo_user" && !e.newValue) {
        setSignedIn(false);
        setUserId(null);
        setIsDemoUser(false);
        setIsOnboarded(false);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Supabase Realtime: push updates for all live tables
  // When the admin or any user changes data, all connected clients see it instantly.
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const userIdRef = userId;

    const channel = supabase
      .channel("valuo_public_realtime")
      // Daily challenges: admin activates / deactivates
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_challenges" },
        async () => {
          const updated = await fetchActiveChallenge();
          setActiveChallenge(updated);
        },
      )
      // Feed posts: admin pins a post, user publishes, etc.
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feed_posts" },
        async () => {
          const updated = await fetchFeedPosts(userIdRef || undefined);
          if (updated) setPosts(updated);
        },
      )
      // Post likes: live like count updates
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_likes" },
        async () => {
          const updated = await fetchFeedPosts(userIdRef || undefined);
          if (updated) setPosts(updated);
        },
      )
      // Post comments: comments appear in real time under posts
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_comments" },
        async () => {
          const updated = await fetchFeedPosts(userIdRef || undefined);
          if (updated) setPosts(updated);
        },
      )
      // Mystery boxes: admin updates today's object (feeds both the feed display and game engine)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mystery_boxes" },
        async () => {
          const updated = await fetchMysteryItem();
          if (updated) setMysteryItem(updated);
        },
      )
      // Notifications: user receives a new notification instantly
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: userIdRef ? `user_id=eq.${userIdRef}` : undefined,
        },
        async () => {
          if (!userIdRef) return;
          const updated = await fetchUserNotifications(userIdRef);
          if (updated) setNotifications(updated);
        },
      )
      // Squad members: someone joins or leaves your squad
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "squad_members" },
        async () => {
          if (!userIdRef) return;
          const updated = await fetchUserSquad(userIdRef);
          if (updated) setGroup(updated);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isSupabaseConfigured]);

  async function loadPublicData() {
    try {
      const challenge = await fetchActiveChallenge();
      setActiveChallenge(challenge);

      const mystery = await fetchMysteryItem();
      if (mystery) setMysteryItem(mystery);

      const livePosts = await fetchFeedPosts(userId || undefined);
      if (livePosts) setPosts(livePosts);
    } catch (e) {
      console.warn("Could not load live feed:", e);
    }
  }

  const activeLoadPromiseRef = useRef<Promise<void> | null>(null);

  async function loadUserData(uid: string, sessionUser?: any) {
    if (activeLoadPromiseRef.current) {
      return activeLoadPromiseRef.current;
    }

    activeLoadPromiseRef.current = (async () => {
      try {
        const isLocalOnboarded = localStorage.getItem(`valuo_onboarded_${uid}`) === "true";
        const profile = await fetchUserProfile(uid);

        const isUserAdmin = Boolean(
          profile?.isAdmin === true ||
          sessionUser?.email === "metierpro158@gmail.com" ||
          authIdentifier === "metierpro158@gmail.com"
        );

        const isTempPassword = Boolean(sessionUser?.user_metadata?.needs_password_change === true);

        const hasCompletedOnboarding = Boolean(
          isLocalOnboarded ||
          isUserAdmin ||
          !isTempPassword ||
          sessionUser?.user_metadata?.customized === true
        );

        if (profile) {
          setCurrentUser(profile);
        } else {
          const cached = typeof window !== "undefined" ? localStorage.getItem(`valuo_user_profile_${uid}`) : null;
          let localProfile: UserProfile | null = null;
          if (cached) {
            try { localProfile = JSON.parse(cached); } catch {}
          }
          if (localProfile) {
            setCurrentUser(localProfile);
          } else {
            const emailFallback = sessionUser?.email || authIdentifier;
            const fallbackName = emailFallback && emailFallback.includes("@")
              ? emailFallback.split("@")[0].charAt(0).toUpperCase() + emailFallback.split("@")[0].slice(1)
              : "Joueur VALUO";
            setCurrentUser({
              ...cleanUserProfile,
              name: fallbackName,
            });
          }
        }

        setIsOnboarded(hasCompletedOnboarding);
        if (hasCompletedOnboarding && typeof window !== "undefined") {
          localStorage.setItem(`valuo_onboarded_${uid}`, "true");
        }

        if (isUserAdmin && location.pathname === "/") {
          routerNavigate("/admin");
        }

        const userSquad = await fetchUserSquad(uid);
        if (userSquad) {
          setGroup(userSquad);
          if (userSquad.members.length >= 4) {
            removeActiveRecruitmentLocalCache(userSquad.code);
            await deleteRecruitmentPostBySquadCode(userSquad.code);
          }
        }

        const userFriends = await fetchUserFriends(uid);
        if (userFriends) setFriends(userFriends);

        const userNotifs = await fetchUserNotifications(uid);
        if (userNotifs) setNotifications(userNotifs);

        const livePosts = await fetchFeedPosts(uid);
        if (livePosts && livePosts.length > 0) setPosts(livePosts);
      } catch (err) {
        console.warn("Could not load user data:", err);
      } finally {
        setAuthLoading(false);
        activeLoadPromiseRef.current = null;
      }
    })();

    return activeLoadPromiseRef.current;
  }

  const isAdminUser = Boolean(
    currentUser?.isAdmin === true ||
    authIdentifier === "metierpro158@gmail.com"
  );

  // Admin route guard: if a non-admin accesses /admin, redirect them safely to /
  useEffect(() => {
    if (activeTab === "admin" && !authLoading && signedIn && !isAdminUser) {
      setNotice("Accès réservé aux administrateurs.");
      routerNavigate("/", { replace: true });
    }
  }, [activeTab, authLoading, signedIn, isAdminUser, routerNavigate]);

  function navigate(tab: Tab) {
    if (tab === "admin" && !isAdminUser) {
      setNotice("Accès réservé aux administrateurs.");
      routerNavigate("/", { replace: true });
      return;
    }
    const targetPath = tab === "feed" ? "/" : `/${tab}`;
    if (location.pathname !== targetPath) {
      routerNavigate(targetPath);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleLike(id: number | string) {
    const targetPost = posts.find((p) => p.id === id);
    const wasLiked = Boolean(targetPost?.liked);

    // Optimistic UI update
    setPosts((current) =>
      current.map((post) =>
        post.id === id
          ? { ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) }
          : post,
      ),
    );

    if (userId) {
      await togglePostLike(userId, id, wasLiked);
    }
  }

  async function toggleFriend(author: string) {
    const isFriend = friends.includes(author);

    if (isFriend) {
      setFriends((prev) => prev.filter((f) => f !== author));
      setNotice(`${author} a été retiré(e) de tes amis.`);
    } else {
      setFriends((prev) => [...prev, author]);
      setNotice(`${author} a été ajouté(e) à tes amis !`);
    }

    if (userId) {
      await toggleFriendshipInDb(userId, author, isFriend);
    }
  }

  async function updateProfile(updated: Partial<UserProfile>) {
    setCurrentUser((prev) => ({ ...prev, ...updated }));
    setNotice("Ton profil a été mis à jour avec succès.");

    if (userId) {
      await saveUserProfile(userId, updated);
    }
  }

  const [squadConfirmModal, setSquadConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  }>({
    open: false,
    title: "",
    description: "",
    action: async () => {},
  });

  async function executeCreateGroup(name: string, invitedFriends: string[]) {
    if (userId) {
      const squad = await createSquadInDb(userId, name, invitedFriends, false);
      if (squad) {
        setGroup(squad);
        setNotice(`L'escouade « ${name} » a été créée avec succès ! Code : ${squad.code}`);
      } else {
        setNotice("Erreur lors de la création de l'escouade. Veuillez réessayer.");
      }
      return;
    }

    if (isDemoUser) {
      const randomCode = `VALUO-${Math.floor(100 + Math.random() * 900)}`;
      const demoSquad: GroupData = {
        id: `grp-${Date.now()}`,
        name,
        code: randomCode,
        week: 38,
        members: [
          { id: 1, name: currentUser.name.split(" ")[0], avatar: currentUser.avatar, points: 0, change: 0, estimate: null },
          ...invitedFriends.map((f, i) => ({
            id: i + 2,
            name: f.split(" ")[0],
            avatar: avatars.camille,
            points: 0,
            change: 0,
            estimate: null,
          })),
        ],
      };
      setGroup(demoSquad);
      localStorage.setItem("valuo_demo_squad", JSON.stringify(demoSquad));
      setNotice(`L'escouade « ${name} » a été créée avec succès ! Code : ${randomCode}`);
    }
  }

  function createGroup(name: string, invitedFriends: string[]) {
    if (group) {
      setSquadConfirmModal({
        open: true,
        title: "Créer une nouvelle escouade ?",
        description: `Tu fais actuellement partie de l'escouade « ${group.name} ». En créant cette nouvelle escouade, tu quitteras définitivement ton escouade actuelle.`,
        action: async () => {
          await executeCreateGroup(name, invitedFriends);
        },
      });
      return;
    }
    executeCreateGroup(name, invitedFriends);
  }

  async function executeJoinGroup(code: string) {
    if (userId) {
      const squad = await joinSquadByCode(userId, code);
      if (squad) {
        setGroup(squad);
        if (squad.members.length >= 4) {
          removeActiveRecruitmentLocalCache(squad.code);
          await deleteRecruitmentPostBySquadCode(squad.code);
          setPosts((prev) => prev.filter((p) => p.squadCode !== squad.code));
        }
        setNotice(`Tu as rejoint l'escouade « ${squad.name} » (${code}) !`);
        navigate("group");
      } else {
        setNotice("Code d'escouade introuvable ou escouade déjà complète.");
      }
      return;
    }

    if (isDemoUser) {
      const demoSquad: GroupData = {
        id: `grp-${Date.now()}`,
        name: `Escouade ${code}`,
        code,
        week: 38,
        members: [
          { id: 1, name: currentUser.name.split(" ")[0], avatar: currentUser.avatar, points: 0, change: 0, estimate: null },
        ],
      };
      setGroup(demoSquad);
      localStorage.setItem("valuo_demo_squad", JSON.stringify(demoSquad));
      setNotice(`Tu as rejoint l'escouade ${code} !`);
      navigate("group");
    }
  }

  function joinGroup(code: string) {
    if (group) {
      if (group.code === code) {
        setNotice("Tu es déjà membre de cette escouade.");
        return;
      }
      setSquadConfirmModal({
        open: true,
        title: "Rejoindre une autre escouade ?",
        description: `Tu fais actuellement partie de l'escouade « ${group.name} ». En rejoignant cette escouade (${code}), tu quitteras définitivement ton escouade actuelle.`,
        action: async () => {
          await executeJoinGroup(code);
        },
      });
      return;
    }
    executeJoinGroup(code);
  }

  async function executeAutoMatch() {
    const squadName = `Escouade Express #${Math.floor(100 + Math.random() * 900)}`;

    if (userId) {
      // 1. Create real squad with only the creator (no NPCs)
      const squad = await createSquadInDb(userId, squadName, [], false);
      if (squad) {
        setGroup(squad);
        saveActiveRecruitmentLocalCache(squad.code, squad.name);

        // 2. Prepare and immediately inject recruitment post in React state
        const newRecruitmentPost = createRecruitmentFeedPostObj(squad.code, squad.name);
        setPosts((prev) => {
          const pinned = prev.filter((p) => p.isPinned);
          const unpinned = [newRecruitmentPost, ...prev.filter((p) => !p.isPinned && p.squadCode !== squad.code)];
          return [...pinned, ...unpinned];
        });

        // 3. Persist recruitment post in DB asynchronously
        try {
          await createFeedPost(
            userId,
            "",
            "Recherche 3 coéquipiers pour relever les défis de la semaine dans mon escouade ! Rejoins-nous en 1 clic.",
            currentUser.city,
            undefined,
            { code: squad.code, name: squad.name },
          );
        } catch (postErr) {
          console.warn("Could not post auto recruitment to feed:", postErr);
        }

        setNotice("Escouade créée ! L'avis de recrutement a été partagé sur le Feed.");
        navigate("group");
      } else {
        setNotice("Erreur lors de la création de l'escouade. Veuillez réessayer.");
      }
      return;
    }

    if (isDemoUser) {
      const randomCode = `VALUO-${Math.floor(100 + Math.random() * 900)}`;
      const demoSquad: GroupData = {
        id: `grp-${Date.now()}`,
        name: squadName,
        code: randomCode,
        week: 38,
        members: [
          { id: 1, name: currentUser.name.split(" ")[0], avatar: currentUser.avatar, points: 0, change: 0, estimate: null },
        ],
      };
      setGroup(demoSquad);
      localStorage.setItem("valuo_demo_squad", JSON.stringify(demoSquad));
      saveActiveRecruitmentLocalCache(randomCode, squadName);

      const demoRecruitmentPost = createRecruitmentFeedPostObj(randomCode, squadName);

      setPosts((prev) => {
        const pinned = prev.filter((p) => p.isPinned);
        const unpinned = [demoRecruitmentPost, ...prev.filter((p) => !p.isPinned && p.squadCode !== randomCode)];
        return [...pinned, ...unpinned];
      });
      setNotice("Escouade créée ! L'avis de recrutement a été partagé sur le Feed.");
      navigate("group");
    }
  }

  function autoMatch() {
    if (group) {
      setSquadConfirmModal({
        open: true,
        title: "Lancer un nouveau matchmaking ?",
        description: `Tu fais actuellement partie de l'escouade « ${group.name} ». En lançant un nouveau matchmaking, tu quitteras ton groupe actuel pour créer une nouvelle escouade.`,
        action: async () => {
          await executeAutoMatch();
        },
      });
      return;
    }
    executeAutoMatch();
  }

  async function republishRecruitment() {
    if (!group) return;

    saveActiveRecruitmentLocalCache(group.code, group.name);
    const recruitmentPost = createRecruitmentFeedPostObj(group.code, group.name);

    setPosts((prev) => {
      const pinned = prev.filter((p) => p.isPinned);
      const unpinned = [recruitmentPost, ...prev.filter((p) => !p.isPinned && p.squadCode !== group.code)];
      return [...pinned, ...unpinned];
    });
    setNotice("Avis de recrutement republié sur le Feed !");

    if (userId) {
      await republishSquadRecruitment(userId, group.code, group.name, currentUser.city);
    }
  }

  async function leaveGroup() {
    const currentGroupId = group?.id;
    const currentGroupCode = group?.code;

    setGroup(null);
    localStorage.removeItem("valuo_demo_squad");

    if (currentGroupCode) {
      removeActiveRecruitmentLocalCache(currentGroupCode);
      await deleteRecruitmentPostBySquadCode(currentGroupCode);
      setPosts((prev) => prev.filter((p) => p.squadCode !== currentGroupCode));
    }
    setNotice("Tu as quitté ton escouade.");

    if (userId) {
      await leaveSquadInDb(userId, currentGroupId, currentGroupCode);
    }
  }

  async function publish(photo: string, caption: string) {
    const newPost: FeedPost = {
      id: Date.now(),
      author: currentUser.name,
      city: currentUser.city,
      avatar: currentUser.avatar,
      photo,
      caption,
      time: "À l'instant",
      likes: 0,
      comments: [],
    };

    setPosts((current) => {
      const pinned = current.filter((p) => p.isPinned);
      const unpinned = [newPost, ...current.filter((p) => !p.isPinned)];
      return [...pinned, ...unpinned];
    });
    setComposerOpen(false);
    setNotice("Ta photo est publiée dans le défi du jour.");
    navigate("feed");

    if (userId) {
      await createFeedPost(userId, photo, caption, currentUser.city);
    }
  }

  async function addComment(postId: number | string, text: string) {
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: [
                ...post.comments,
                { id: Date.now(), author: currentUser.name.split(" ")[0], avatar: currentUser.avatar, text },
              ],
            }
          : post,
      ),
    );

    if (userId) {
      await addPostComment(userId, postId, text);
    }
  }

  async function markAllNotificationsAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setNotice("Toutes les notifications sont marquées comme lues.");

    if (userId) {
      await markNotificationsAsReadInDb(userId);
    }
  }

  function handleNotificationClick(notif: AppNotification) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)),
    );
    navigate(notif.targetTab);
    if (notif.targetTab === "feed" && notif.targetPostId) {
      setTimeout(() => {
        const el = document.getElementById(`post-${notif.targetPostId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }

  async function share(post?: FeedPost) {
    const shareData = {
      title: post ? `${post.author} · ${todayChallenge.theme}` : "VALUO",
      text: post
        ? `Regarde ma photo pour le défi VALUO du jour « ${todayChallenge.theme} » !`
        : `Rejoins mon escouade sur VALUO (Code: ${group?.code || "VALUO-789"}) et relève le défi de la semaine !`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        return;
      }
    }
    await navigator.clipboard?.writeText(window.location.href);
    setNotice("Lien copié, prêt à être partagé.");
  }

  async function installApp() {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setNotice(choice.outcome === "accepted" ? "Installation lancée." : "Installation annulée.");
      setInstallPrompt(null);
    } else {
      setNotice("Sur iPhone, utilise Partager puis Ajouter à l'écran d'accueil.");
    }
  }

  async function handleAuthSuccess(identifier?: string, newUid?: string, isTempPassword?: boolean, isDemo?: boolean) {
    setAuthIdentifier(identifier || "");
    if (newUid) setUserId(newUid);

    if (isDemo) {
      setIsDemoUser(true);
      setIsOnboarded(true);
      setCurrentUser({
        name: "Visiteur Démo",
        city: "France",
        avatar: avatarPresets[0].url,
        cover: media.camera,
        bio: "Mode exploration de découverte.",
        memberSince: "Septembre 2026",
      });
      setNotifications([]);
      setPosts([pinnedGameMasterPost]);
      setSignedIn(true);
    } else if (newUid) {
      setIsDemoUser(false);
      localStorage.removeItem("valuo_demo_user");
      setAuthLoading(true);

      const isUserAdmin = Boolean(
        identifier === "metierpro158@gmail.com"
      );

      // Determine initial onboarded state (will be refined in loadUserData)
      const isAlreadyOnboarded = Boolean(
        !isTempPassword ||
        isUserAdmin
      );

      setIsOnboarded(isAlreadyOnboarded);
      if (isUserAdmin && location.pathname === "/") {
        routerNavigate("/admin");
      }

      await loadUserData(newUid);
      setSignedIn(true);
    } else {
      setSignedIn(true);
    }
  }

  async function handleOnboardingComplete(
    profileData: Partial<UserProfile>,
    selectedSquadMode: "auto" | "code" | "skip",
    squadCode?: string,
  ) {
    const finalProfile: UserProfile = { ...currentUser, ...profileData };
    setCurrentUser(finalProfile);
    setIsOnboarded(true);

    if (userId) {
      localStorage.setItem(`valuo_onboarded_${userId}`, "true");
      localStorage.setItem(`valuo_user_profile_${userId}`, JSON.stringify(finalProfile));
      await saveUserProfile(userId, finalProfile);
    }

    if (selectedSquadMode === "auto") {
      await autoMatch();
    } else if (selectedSquadMode === "code" && squadCode) {
      await joinGroup(squadCode);
    }

    setNotice(`Bienvenue sur VALUO, ${finalProfile.name || "joueur"} ! Découvre le défi du jour.`);
    navigate("feed");
  }

  async function handleLogout() {
    await signOutUser();
    localStorage.removeItem("valuo_demo_user");
    crossTabChannel?.postMessage({ type: "AUTH_LOGOUT" });
    setSignedIn(false);
    setUserId(null);
    setIsDemoUser(false);
    setIsOnboarded(false);
    setCurrentUser(cleanUserProfile);
    setNotifications([]);
    setFriends([]);
    setGroup(null);
    setPosts([pinnedGameMasterPost]);
  }

  // Smooth loading splash while session initializes
  if (authLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f0e5] p-6">
        <div className="flex flex-col items-center gap-4">
          <Logo />
          <div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-bold text-[#173f35] shadow-sm">
            <Loader2 size={16} className="animate-spin text-[#e9683a]" /> Chargement de votre espace…
          </div>
        </div>
      </main>
    );
  }

  if (!signedIn) {
    return <AuthScreen onAuth={handleAuthSuccess} />;
  }

  if (!isOnboarded && !authLoading) {
    return (
      <OnboardingView
        initialIdentifier={authIdentifier}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  const cycleInfo = getValuoCycleInfo();

  async function handlePostDeleted(postId: string | number) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    await deleteFeedPost(postId);
    setNotice("Publication supprimée avec succès.");
  }

  return (
    <div className="min-h-screen bg-[#fbf8f1] text-[#173f35]">
      <div className="flex min-h-screen">
        <DesktopNavigation
          active={activeTab}
          profile={currentUser}
          notifications={notifications}
          dayNumber={cycleInfo.dayNumber}
          weekNumber={cycleInfo.weekNumber}
          cycleMessage={cycleInfo.message}
          onNavigate={navigate}
          onLogout={handleLogout}
          onMarkAllAsRead={markAllNotificationsAsRead}
          onNotificationClick={handleNotificationClick}
        />

        <div className="min-w-0 flex-1">
          <MobileHeader
            notifications={notifications}
            onOpenCamera={() => setComposerOpen(true)}
            onOpenNotifications={() => navigate("notifications")}
          />
          <main className="mx-auto max-w-[1280px] px-4 pb-28 pt-6 sm:px-7 sm:pt-8 lg:px-10 lg:pb-12 lg:pt-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                {activeTab === "feed" && (
                  <FeedView
                    posts={posts}
                    friends={friends}
                    currentUser={currentUser}
                    challenge={activeChallenge}
                    onToggleLike={toggleLike}
                    onToggleFriend={toggleFriend}
                    onOpenComposer={() => setComposerOpen(true)}
                    onShare={share}
                    onAddComment={addComment}
                    onJoinSquad={joinGroup}
                  />
                )}
                {activeTab === "game" && (
                  <GameView
                    group={group}
                    currentUser={currentUser}
                    onOpenGroup={() => navigate("group")}
                  />
                )}
                {activeTab === "group" && (
                  <GroupView
                    group={group}
                    friends={friends}
                    currentUser={currentUser}
                    onCreateGroup={createGroup}
                    onJoinGroup={joinGroup}
                    onAutoMatch={autoMatch}
                    onLeaveGroup={leaveGroup}
                    onShare={share}
                    onNotice={setNotice}
                    onRepublishRecruitment={republishRecruitment}
                  />
                )}
                {activeTab === "admin" && (
                  <AdminView
                    currentUserId={userId}
                    activeChallenge={activeChallenge}
                    mysteryItem={mysteryItem}
                    posts={posts}
                    onChallengeUpdated={(updated) => setActiveChallenge(updated)}
                    onMysteryUpdated={(updated) => setMysteryItem(updated)}
                    onPostCreated={() => loadPublicData()}
                    onPostDeleted={handlePostDeleted}
                    onNotice={setNotice}
                  />
                )}
                {activeTab === "profile" && (
                  <ProfileView
                    profile={currentUser}
                    isDemoUser={isDemoUser}
                    onUpdateProfile={updateProfile}
                    onLogout={handleLogout}
                    onInstall={installApp}
                  />
                )}
                {activeTab === "notifications" && (
                  <NotificationsView
                    notifications={notifications}
                    onMarkAllAsRead={markAllNotificationsAsRead}
                    onNotificationClick={handleNotificationClick}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <MobileNavigation
        active={activeTab}
        onNavigate={navigate}
      />
      <ComposerModal open={composerOpen} onClose={() => setComposerOpen(false)} onPublish={publish} />

      {/* Modal de confirmation de changement d'escouade */}
      <AnimatePresence>
        {squadConfirmModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSquadConfirmModal((prev) => ({ ...prev, open: false }))}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-md overflow-hidden rounded-[28px] bg-white p-6 shadow-2xl sm:p-7"
            >
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#fff0eb] text-[#e9683a]">
                <AlertTriangle size={24} />
              </div>
              <h3 className="mt-4 text-center font-display text-xl font-semibold text-[#173f35]">
                {squadConfirmModal.title}
              </h3>
              <p className="mt-2 text-center text-xs leading-relaxed text-[#68766e]">
                {squadConfirmModal.description}
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSquadConfirmModal((prev) => ({ ...prev, open: false }))}
                  className="flex-1 rounded-full border border-[#173f35]/15 bg-white py-3 text-xs font-extrabold text-[#173f35] hover:bg-[#f5f0e5]"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const action = squadConfirmModal.action;
                    setSquadConfirmModal((prev) => ({ ...prev, open: false }));
                    await action();
                  }}
                  className="flex-1 rounded-full bg-[#e9683a] py-3 text-xs font-extrabold text-white shadow-lg shadow-[#e9683a]/25 transition hover:bg-[#d9582d]"
                >
                  Confirmer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 12, x: "-50%" }}
            className="fixed bottom-24 left-1/2 z-[60] flex w-[calc(100%-32px)] max-w-md items-center gap-3 rounded-2xl bg-[#173f35] px-4 py-3 text-sm font-semibold text-white shadow-2xl lg:bottom-8"
          >
            <CheckCircle2 size={18} className="shrink-0 text-[#f3c969]" />
            <span className="flex-1">{notice}</span>
            <button type="button" onClick={() => setNotice("")} aria-label="Fermer"><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}