import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  Clock3,
  Heart,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
  Sparkles,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { avatars, FeedPost, todayChallenge } from "../data";

type FeedFilter = "recents" | "friends" | "popular";

type FeedViewProps = {
  posts: FeedPost[];
  onToggleLike: (id: number) => void;
  onOpenComposer: () => void;
  onShare: (post: FeedPost) => void;
  onAddComment: (postId: number, text: string) => void;
};

const filters: { id: FeedFilter; label: string }[] = [
  { id: "recents", label: "Récents" },
  { id: "friends", label: "Amis" },
  { id: "popular", label: "Populaires" },
];

const friendNames = new Set(["Camille R.", "Hugo P.", "Maya L."]);

export default function FeedView({ posts, onToggleLike, onOpenComposer, onShare, onAddComment }: FeedViewProps) {
  const [filter, setFilter] = useState<FeedFilter>("recents");
  const [openComments, setOpenComments] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const visiblePosts = useMemo(() => {
    const next = posts.filter((post) => (filter === "friends" ? friendNames.has(post.author) : true));
    if (filter === "popular") {
      return [...next].sort((a, b) => b.likes - a.likes);
    }
    return next;
  }, [filter, posts]);

  function submitComment(event: FormEvent, postId: number) {
    event.preventDefault();
    const text = drafts[postId]?.trim();
    if (!text) return;
    onAddComment(postId, text);
    setDrafts((current) => ({ ...current, [postId]: "" }));
    setOpenComments(postId);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} className="mx-auto max-w-[680px]">
      <section className="relative overflow-hidden rounded-[28px] bg-[#173f35] text-white">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#e9683a]/25 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-[#f3c969]/20 blur-2xl" />
        <div className="relative p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#f3c969]">
              <Sparkles size={14} /> Défi photo du jour
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-white/80">
              <Clock3 size={13} /> {todayChallenge.remaining} restantes
            </span>
          </div>
          <p className="mt-4 font-display text-[34px] font-semibold leading-[0.95] tracking-[-0.04em] sm:text-5xl">
            {todayChallenge.theme}
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">{todayChallenge.brief}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onOpenComposer}
              className="inline-flex items-center gap-2 rounded-full bg-[#f3c969] px-5 py-3 text-sm font-extrabold text-[#173f35] transition hover:-translate-y-0.5 hover:bg-white"
            >
              <Camera size={16} /> Poster ma photo
            </button>
            <p className="text-xs font-semibold text-white/55">{posts.length} photos déjà publiées aujourd'hui</p>
          </div>
        </div>
      </section>

      <div className="mt-4 overflow-hidden rounded-[24px] border border-[#173f35]/8 bg-white">
        <button
          type="button"
          onClick={onOpenComposer}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[#fbf8f1]"
        >
          <img src={avatars.lea} alt="" className="h-10 w-10 rounded-full object-cover" />
          <span className="flex-1 rounded-full bg-[#f5f0e5] px-4 py-2.5 text-sm text-[#8a958f]">
            Partage ta photo du défi…
          </span>
          <span className="hidden rounded-full bg-[#173f35] px-3 py-2 text-xs font-extrabold text-white sm:inline">Publier</span>
        </button>
      </div>

      <div className="mt-6 mb-4 flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold text-[#173f35]">Feed</h2>
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
        <AnimatePresence mode="popLayout">
          {visiblePosts.map((post, index) => {
            const commentsOpen = openComments === post.id;
            return (
              <motion.article
                key={post.id}
                layout
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, delay: Math.min(index, 4) * 0.04 }}
                className="overflow-hidden rounded-[26px] border border-[#173f35]/8 bg-white"
              >
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <img src={post.avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-[#173f35]">{post.author}</p>
                    <p className="flex items-center gap-1 text-[11px] text-[#8c968f]">
                      <MapPin size={10} /> {post.city} · {post.time}
                    </p>
                  </div>
                  <span className="hidden rounded-full bg-[#fff1e8] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#e9683a] sm:inline">
                    {todayChallenge.theme}
                  </span>
                  <button type="button" aria-label="Plus d'options" className="rounded-full p-2 text-[#8c968f] hover:bg-[#f5f0e5]">
                    <MoreHorizontal size={17} />
                  </button>
                </div>

                <div className="group aspect-[4/5] overflow-hidden bg-[#eee7da] sm:aspect-[4/4.3]">
                  <img src={post.photo} alt={post.caption} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
                </div>

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

                  <p className="mt-2 text-[14px] leading-relaxed text-[#4f6057]">
                    <span className="font-extrabold text-[#173f35]">{post.author.split(" ")[0]} </span>
                    {post.caption}
                  </p>

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
                    <img src={avatars.lea} alt="" className="h-8 w-8 rounded-full object-cover" />
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
      </div>
    </motion.div>
  );
}
