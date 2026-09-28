import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";
import { useEffect, useState } from "react";
import AuthScreen from "./components/AuthScreen";
import ComposerModal from "./components/ComposerModal";
import FeedView from "./components/FeedView";
import GameView from "./components/GameView";
import GroupView from "./components/GroupView";
import { DesktopNavigation, MobileHeader, MobileNavigation, Tab } from "./components/Navigation";
import ProfileView from "./components/ProfileView";
import { avatars, FeedPost, initialPosts, todayChallenge } from "./data";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function App() {
  const [signedIn, setSignedIn] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [composerOpen, setComposerOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleInstall);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function navigate(tab: Tab) {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleLike(id: number) {
    setPosts((current) =>
      current.map((post) =>
        post.id === id
          ? { ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) }
          : post,
      ),
    );
  }

  function publish(photo: string, caption: string) {
    const newPost: FeedPost = {
      id: Date.now(),
      author: "Léa M.",
      city: "Bordeaux",
      avatar: avatars.lea,
      photo,
      caption,
      time: "À l'instant",
      likes: 0,
      comments: [],
    };
    setPosts((current) => [newPost, ...current]);
    setComposerOpen(false);
    setNotice("Ta photo est publiée dans le défi du jour.");
    navigate("feed");
  }

  function addComment(postId: number, text: string) {
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: [
                ...post.comments,
                { id: Date.now(), author: "Léa", avatar: avatars.lea, text },
              ],
            }
          : post,
      ),
    );
  }

  async function share(post?: FeedPost) {
    const shareData = {
      title: post ? `${post.author} · ${todayChallenge.theme}` : "Les Brocanteurs",
      text: post
        ? `Regarde cette photo du défi du jour « ${todayChallenge.theme} ».`
        : "Rejoins ma bande sur Les Brocanteurs et montre-nous ton flair !",
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

  if (!signedIn) {
    return <AuthScreen onAuth={() => setSignedIn(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#fbf8f1] text-[#173f35]">
      <div className="flex min-h-screen">
        <DesktopNavigation active={activeTab} onNavigate={navigate} onLogout={() => setSignedIn(false)} />

        <div className="min-w-0 flex-1">
          <MobileHeader onOpenCamera={() => setComposerOpen(true)} />
          <main className="mx-auto max-w-[1280px] px-4 pb-28 pt-6 sm:px-7 sm:pt-8 lg:px-10 lg:pb-12 lg:pt-10">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
                {activeTab === "feed" && (
                  <FeedView
                    posts={posts}
                    onToggleLike={toggleLike}
                    onOpenComposer={() => setComposerOpen(true)}
                    onShare={share}
                    onAddComment={addComment}
                  />
                )}
                {activeTab === "game" && <GameView onOpenGroup={() => navigate("group")} />}
                {activeTab === "group" && <GroupView onShare={share} />}
                {activeTab === "profile" && <ProfileView onLogout={() => setSignedIn(false)} onInstall={installApp} />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <MobileNavigation active={activeTab} onNavigate={navigate} />
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