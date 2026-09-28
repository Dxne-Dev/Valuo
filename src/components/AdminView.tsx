import { motion } from "framer-motion";
import {
  ArrowLeft,
  Crown,
  MessageSquare,
  PackageOpen,
  Pin,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { type FeedPost, media } from "../data";
import {
  type ChallengeData,
  createOfficialPost,
  type MysteryItemData,
  saveActiveChallenge,
  saveMysteryItem,
} from "../lib/api";

type AdminViewProps = {
  currentUserId?: string | null;
  activeChallenge: ChallengeData;
  mysteryItem: MysteryItemData;
  posts: FeedPost[];
  onChallengeUpdated: (challenge: ChallengeData) => void;
  onMysteryUpdated: (item: MysteryItemData) => void;
  onPostCreated: () => void;
  onPostDeleted: (postId: string | number) => void;
  onNotice: (msg: string) => void;
  onBack?: () => void;
};

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
  onBack,
}: AdminViewProps) {
  const [tab, setTab] = useState<"challenge" | "announcement" | "mystery" | "posts">("challenge");

  // 1. Challenge Form
  const [theme, setTheme] = useState(activeChallenge.theme);
  const [brief, setBrief] = useState(activeChallenge.brief);
  const [remaining, setRemaining] = useState(activeChallenge.remaining || "6 h 24");

  // 2. Official Announcement Form
  const [announcementPhoto, setAnnouncementPhoto] = useState(media.redPhone);
  const [announcementCaption, setAnnouncementCaption] = useState(
    "🔥 Défi officiel du jour lancé ! Repérez un objet qui correspond au thème et partagez votre trouvaille avant minuit.",
  );
  const [isPinned, setIsPinned] = useState(true);
  const [publishingPost, setPublishingPost] = useState(false);

  // 3. Mystery Box Form
  const [mysteryTitle, setMysteryTitle] = useState(mysteryItem.title);
  const [mysteryImage, setMysteryImage] = useState(mysteryItem.image);
  const [mysteryBrief, setMysteryBrief] = useState(mysteryItem.brief);
  const [mysteryHint, setMysteryHint] = useState(mysteryItem.hint);
  const [mysteryRealPrice, setMysteryRealPrice] = useState(String(mysteryItem.realPrice));

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
    onNotice("Défi du jour mis à jour avec succès !");
  }

  async function handlePublishOfficialPost(event: FormEvent) {
    event.preventDefault();
    if (!announcementCaption.trim()) return;

    setPublishingPost(true);
    const uid = currentUserId || "admin";
    await createOfficialPost(uid, announcementPhoto, announcementCaption.trim(), isPinned);
    setPublishingPost(false);
    onPostCreated();
    onNotice("Annonce officielle Game Master publiée dans le feed !");
  }

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
    onNotice("Mystery Box du jour mise à jour avec succès !");
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-4xl space-y-6">
      {/* Admin Header Banner */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#173f35] to-[#0f2c25] p-6 text-white sm:p-8 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f3c969] text-[#173f35] shadow-md">
              <Crown size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#f3c969]">
                  Game Master
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                  <ShieldCheck size={13} /> Espace d'administration
                </span>
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Tableau de Bord du Jeu</h1>
            </div>
          </div>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 text-xs font-extrabold text-white backdrop-blur transition hover:bg-white hover:text-[#173f35]"
            >
              <ArrowLeft size={15} />
              <span>Retour au jeu</span>
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          {[
            { id: "challenge", label: "1. Défi du Jour", icon: Sparkles },
            { id: "announcement", label: "2. Post Officiel Feed", icon: Pin },
            { id: "mystery", label: "3. Mystery Box", icon: PackageOpen },
            { id: "posts", label: `4. Modération Feed (${posts.length})`, icon: MessageSquare },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id as any)}
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

      {/* TAB 1: DÉFI DU JOUR */}
      {tab === "challenge" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] bg-white p-6 sm:p-8 shadow-sm border border-[#173f35]/8">
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
                placeholder="Ex: Une touche de rouge, Objet vintage des 70s…"
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

            <button
              type="submit"
              className="mt-4 flex items-center gap-2 rounded-full bg-[#173f35] px-6 py-3.5 text-xs font-extrabold text-white transition hover:bg-[#23584b] shadow-lg shadow-[#173f35]/20"
            >
              <Save size={16} /> Enregistrer et publier le défi
            </button>
          </form>
        </motion.div>
      )}

      {/* TAB 2: POST OFFICIEL DU GAME MASTER */}
      {tab === "announcement" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] bg-white p-6 sm:p-8 shadow-sm border border-[#173f35]/8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#e9683a]">
            <Pin size={16} /> Annonce officielle épinglée
          </div>
          <h2 className="mt-1 font-display text-2xl font-semibold text-[#173f35]">Publier dans le Feed</h2>
          <p className="mt-1 text-xs text-[#6f7e76]">
            Ce post apparaîtra avec le badge « Défi Officiel » en tête de liste.
          </p>

          <form onSubmit={handlePublishOfficialPost} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">Photo d'inspiration du Game Master</label>
              <div className="mt-2 flex items-center gap-4">
                <img src={announcementPhoto} alt="Aperçu" className="h-20 w-20 rounded-2xl object-cover border-2 border-[#173f35]/10" />
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
                placeholder="Ex: 🔥 Défi du jour : « Une touche de rouge »…"
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
              <label htmlFor="is-pinned" className="text-xs font-bold text-[#173f35]">
                Épingler en première position du Feed
              </label>
            </div>

            <button
              type="submit"
              disabled={publishingPost}
              className="mt-4 flex items-center gap-2 rounded-full bg-[#e9683a] px-6 py-3.5 text-xs font-extrabold text-white transition hover:bg-[#d9582d] shadow-lg shadow-[#e9683a]/25 disabled:opacity-50"
            >
              <Pin size={16} /> {publishingPost ? "Publication en cours…" : "Publier l'annonce officielle"}
            </button>
          </form>
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
              <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">Vrai prix brocante constaté (€)</label>
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

      {/* TAB 4: MODÉRATION DU FEED */}
      {tab === "posts" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] bg-white p-6 sm:p-8 shadow-sm border border-[#173f35]/8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#e9683a]">
            <MessageSquare size={16} /> Modération du Feed
          </div>
          <h2 className="mt-1 font-display text-2xl font-semibold text-[#173f35]">Publications en ligne</h2>

          <div className="mt-6 space-y-3">
            {posts.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#7a8780]">Aucune publication actuellement dans le feed.</p>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="flex items-center justify-between gap-4 rounded-2xl border border-[#173f35]/10 bg-[#fbf8f1] p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={post.photo} alt="" className="h-12 w-12 rounded-xl object-cover shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#173f35] truncate">{post.author}</span>
                        {post.isOfficial && (
                          <span className="rounded-full bg-[#f3c969]/30 px-2 py-0.5 text-[10px] font-extrabold text-[#173f35]">
                            Officiel
                          </span>
                        )}
                        {post.isPinned && (
                          <span className="rounded-full bg-[#e9683a]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#e9683a]">
                            Épinglé
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6e7d75] truncate mt-0.5">{post.caption}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPostDeleted(post.id)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100"
                    title="Supprimer la publication"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
