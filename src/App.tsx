import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import AuthScreen from "./components/AuthScreen";
import AdminView from "./components/AdminView";
import ComposerModal from "./components/ComposerModal";
import FeedView from "./components/FeedView";
import GameView from "./components/GameView";
import GroupView from "./components/GroupView";
import { DesktopNavigation, MobileHeader, MobileNavigation, type Tab } from "./components/Navigation";
import NotificationsView from "./components/NotificationsView";
import OnboardingView from "./components/OnboardingView";
import ProfileView from "./components/ProfileView";
import Logo from "./components/Logo";
import { getValuoCycleInfo } from "./lib/dateUtils";

import {
  type AppNotification,
  avatarPresets,
  avatars,
  type FeedPost,
  type GroupData,
  type GroupMember,
  media,
  pinnedGameMasterPost,
  todayChallenge,
  type UserProfile,
} from "./data";
import {
  addPostComment,
  type ChallengeData,
  createFeedPost,
  createSquadInDb,
  deleteFeedPost,
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
  markNotificationsAsReadInDb,
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
  name: "Chasseur VALUO",
  city: "France",
  avatar: avatarPresets[0].url,
  cover: media.camera,
  bio: "Passionné(e) de chine, d'objets et de design.",
  memberSince: "Septembre 2026",
};

// Cross-tab broadcast channel for instant multi-tab sync
const crossTabChannel = typeof window !== "undefined" && "BroadcastChannel" in window
  ? new BroadcastChannel("valuo_auth_sync")
  : null;

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isDemoUser, setIsDemoUser] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [authIdentifier, setAuthIdentifier] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [currentUser, setCurrentUser] = useState<UserProfile>(cleanUserProfile);
  const [friends, setFriends] = useState<string[]>([]);
  const [group, setGroup] = useState<GroupData | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeData>(todayChallenge);
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
        const session = await getCurrentSession();
        if (session?.user) {
          setUserId(session.user.id);
          setSignedIn(true);
          setIsDemoUser(false);
          if (session.user.email) setAuthIdentifier(session.user.email);

          // Clean URL parameters once authenticated (avoid ?mode=login#... staying in address bar)
          if (typeof window !== "undefined" && (window.location.search || window.location.hash)) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }

          await loadUserData(session.user.id, session.user);
        } else {
          // If no active Supabase session, reset flags and stop loading
          localStorage.removeItem("valuo_demo_user");
          setSignedIn(false);
          setUserId(null);
          setIsDemoUser(false);
          setIsOnboarded(false);
          setAuthLoading(false);
        }

        // Supabase Auth State Change Listener
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (newSession?.user) {
            setUserId(newSession.user.id);
            setSignedIn(true);
            setIsDemoUser(false);
            if (newSession.user.email) setAuthIdentifier(newSession.user.email);

            // Clean URL
            if (typeof window !== "undefined" && (window.location.search || window.location.hash)) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }

            await loadUserData(newSession.user.id, newSession.user);
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
      crossTabChannel.onmessage = (event) => {
        if (event.data?.type === "AUTH_LOGIN") {
          setSignedIn(true);
          setIsDemoUser(false);
          if (event.data.userId) {
            setUserId(event.data.userId);
            loadUserData(event.data.userId);
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

  async function loadPublicData() {
    try {
      const challenge = await fetchActiveChallenge();
      if (challenge) setActiveChallenge(challenge);

      const mystery = await fetchMysteryItem();
      if (mystery) setMysteryItem(mystery);

      const livePosts = await fetchFeedPosts(userId || undefined);
      if (livePosts) setPosts(livePosts);
    } catch (e) {
      console.warn("Could not load live feed:", e);
    }
  }

  async function loadUserData(uid: string, sessionUser?: any) {
    try {
      const isAlreadyOnboarded = localStorage.getItem(`valuo_onboarded_${uid}`) === "true";
      const profile = await fetchUserProfile(uid);

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
            : "Chasseur VALUO";
          setCurrentUser({
            ...cleanUserProfile,
            name: fallbackName,
          });
        }
      }
      setIsOnboarded(Boolean(isAlreadyOnboarded));

      if (profile?.isAdmin || sessionUser?.email === "alasanemomo244@gmail.com") {
        setActiveTab("admin");
      }

      const userSquad = await fetchUserSquad(uid);
      if (userSquad) setGroup(userSquad);

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
    }
  }

  const isAdminUser = Boolean(
    currentUser?.isAdmin === true ||
    authIdentifier === "alasanemomo244@gmail.com"
  );

  // Check URL query for direct admin access (?admin=true or ?mode=admin)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("admin") === "true" || params.get("mode") === "admin") {
        if (isAdminUser) {
          setActiveTab("admin");
        }
      }
    }
  }, [isAdminUser]);

  function navigate(tab: Tab) {
    if (tab === "admin" && !isAdminUser) {
      setNotice("Accès réservé aux administrateurs.");
      setActiveTab("feed");
      return;
    }
    setActiveTab(tab);
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

  async function createGroup(name: string, invitedFriends: string[]) {
    if (userId) {
      const squad = await createSquadInDb(userId, name, invitedFriends);
      if (squad) {
        setGroup(squad);
        setNotice(`L'escouade « ${name} » a été créée avec succès !`);
        return;
      }
    }

    // Local fallback
    const newMembers: GroupMember[] = [
      { id: 1, name: currentUser.name.split(" ")[0], avatar: currentUser.avatar, points: 0, change: 0, estimate: null },
    ];

    invitedFriends.forEach((f, idx) => {
      newMembers.push({
        id: idx + 2,
        name: f.split(" ")[0],
        avatar: avatars.camille,
        points: 0,
        change: 0,
        estimate: 60 + idx * 5,
      });
    });

    while (newMembers.length < 4) {
      const npcNames = ["Léon (IA)", "Arthur (IA)", "Jeanne (IA)"];
      const npcIdx = newMembers.length;
      newMembers.push({
        id: npcIdx + 1,
        name: npcNames[npcIdx - 1] || `Rival ${npcIdx} (IA)`,
        avatar: avatars.samir,
        points: 0,
        change: 0,
        estimate: 55 + npcIdx * 8,
        isNpc: true,
      });
    }

    const randomCode = `VALUO-${Math.floor(100 + Math.random() * 900)}`;
    setGroup({
      id: `grp-${Date.now()}`,
      name,
      code: randomCode,
      week: 38,
      members: newMembers,
    });
    setNotice(`L'escouade « ${name} » a été créée avec succès !`);
  }

  async function joinGroup(code: string) {
    if (userId) {
      const squad = await joinSquadByCode(userId, code);
      if (squad) {
        setGroup(squad);
        setNotice(`Tu as rejoint l'escouade ${code} !`);
        return;
      }
    }

    const newMembers: GroupMember[] = [
      { id: 1, name: currentUser.name.split(" ")[0], avatar: currentUser.avatar, points: 0, change: 0, estimate: null },
      { id: 2, name: "Maxime", avatar: avatars.thomas, points: 210, change: 25, estimate: 65 },
      { id: 3, name: "Chloé", avatar: avatars.ines, points: 195, change: -5, estimate: 70 },
      { id: 4, name: "Oscar (IA)", avatar: avatars.hugo, points: 130, change: -15, estimate: 80, isNpc: true },
    ];

    setGroup({
      id: `grp-${Date.now()}`,
      name: `Escouade ${code}`,
      code,
      week: 38,
      members: newMembers,
    });
    setNotice(`Tu as rejoint l'escouade ${code} !`);
  }

  async function autoMatch() {
    if (userId) {
      const squad = await createSquadInDb(userId, "Les As du Flair");
      if (squad) {
        setGroup(squad);
        setNotice("Matchmaking réussi ! Ton escouade est prête.");
        return;
      }
    }

    const randomCode = `VALUO-${Math.floor(100 + Math.random() * 900)}`;
    const newMembers: GroupMember[] = [
      { id: 1, name: currentUser.name.split(" ")[0], avatar: currentUser.avatar, points: isDemoUser ? 248 : 0, change: 0, estimate: null },
      { id: 2, name: "Camille", avatar: avatars.camille, points: 221, change: 22, estimate: 72 },
      { id: 3, name: "Samir", avatar: avatars.samir, points: 186, change: -8, estimate: 49 },
      { id: 4, name: "Marcel", avatar: avatars.hugo, points: 159, change: -12, estimate: 95, isNpc: true },
    ];

    setGroup({
      id: `grp-${Date.now()}`,
      name: "La Bande à Dédé",
      code: randomCode,
      week: 38,
      members: newMembers,
    });
    setNotice("Matchmaking réussi ! Ton escouade est prête.");
  }

  function leaveGroup() {
    setGroup(null);
    setNotice("Tu as quitté ton escouade.");
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

    setPosts((current) => [
      current[0]?.isPinned ? current[0] : newPost,
      ...(current[0]?.isPinned ? [newPost, ...current.slice(1)] : current),
    ]);
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
        ? `Regarde cette trouvaille pour le défi VALUO du jour « ${todayChallenge.theme} » !`
        : `Rejoins mon escouade sur VALUO (Code: ${group?.code || "VALUO-789"}) et montre-nous ton flair !`,
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

  function handleAuthSuccess(identifier?: string, newUid?: string, _isTempPassword?: boolean, isDemo?: boolean) {
    setAuthIdentifier(identifier || "");
    if (newUid) setUserId(newUid);
    setSignedIn(true);

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
    } else {
      setIsDemoUser(false);
      localStorage.removeItem("valuo_demo_user");
      setNotifications([]);
      setFriends([]);
      setGroup(null);
      setPosts([pinnedGameMasterPost]);

      const isAlreadyOnboarded = Boolean(newUid && localStorage.getItem(`valuo_onboarded_${newUid}`) === "true");
      setIsOnboarded(isAlreadyOnboarded);

      // Check if user already has a saved profile in localStorage
      const cached = newUid ? localStorage.getItem(`valuo_user_profile_${newUid}`) : null;
      let existingProfile: UserProfile | null = null;
      if (cached) {
        try { existingProfile = JSON.parse(cached); } catch {}
      }

      if (existingProfile && isAlreadyOnboarded) {
        setCurrentUser(existingProfile);
      } else {
        const fallbackName = identifier && identifier.includes("@")
          ? identifier.split("@")[0].charAt(0).toUpperCase() + identifier.split("@")[0].slice(1)
          : "Chasseur VALUO";
        setCurrentUser({
          ...cleanUserProfile,
          name: fallbackName,
        });
      }
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

  if (!isOnboarded) {
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