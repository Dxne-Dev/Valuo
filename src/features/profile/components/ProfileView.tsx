import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  Download,
  Edit3,
  Gamepad2,
  Heart,
  LogOut,
  MapPin,
  Sparkles,
  Trophy,
  Upload,
  X,
} from "lucide-react";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { avatars, media, type UserProfile } from "@/data";

export type ProfileViewProps = {
  profile: UserProfile;
  isDemoUser?: boolean;
  userPosts?: string[];
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onLogout: () => void;
  onInstall: () => void;
};

const avatarChoices = [
  avatars.lea,
  avatars.camille,
  avatars.samir,
  avatars.hugo,
  avatars.maya,
  avatars.ines,
  avatars.thomas,
];

const coverChoices = [
  media.market,
  media.desk,
  media.drapes,
  media.figurines,
  media.mystery,
];

export default function ProfileView({
  profile,
  isDemoUser = false,
  userPosts = [],
  onUpdateProfile,
  onLogout,
  onInstall,
}: ProfileViewProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(profile.name);
  const [city, setCity] = useState(profile.city);
  const [bio, setBio] = useState(profile.bio);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [cover, setCover] = useState(profile.cover);

  const gallery = userPosts;

  function openModal() {
    setName(profile.name);
    setCity(profile.city);
    setBio(profile.bio);
    setAvatar(profile.avatar);
    setCover(profile.cover);
    setEditOpen(true);
  }

  function handleSave(event: FormEvent) {
    event.preventDefault();
    onUpdateProfile({
      name: name.trim() || profile.name,
      city: city.trim() || profile.city,
      bio: bio.trim() || profile.bio,
      avatar,
      cover,
    });
    setEditOpen(false);
  }

  function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  function handleCoverUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setCover(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} className="mx-auto max-w-5xl">
      <section className="relative overflow-hidden rounded-[30px] bg-[#173f35] px-6 pb-7 pt-24 text-white sm:px-10 sm:pb-9 sm:pt-28">
        <div className="absolute inset-x-0 top-0 h-40 overflow-hidden opacity-45">
          <img src={profile.cover} alt="Couverture de profil" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#173f35]/50 to-[#173f35]" />
        </div>
        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-end">
          <div className="relative group">
            <img
              src={profile.avatar}
              alt={profile.name}
              className="h-24 w-24 rounded-full border-4 border-[#173f35] object-cover shadow-2xl transition group-hover:scale-105"
            />
            <button
              type="button"
              onClick={openModal}
              aria-label="Modifier la photo"
              className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full bg-[#f3c969] text-[#173f35] shadow-md transition hover:scale-110"
            >
              <Camera size={14} />
            </button>
          </div>
          <div className="flex-1">
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">{profile.name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/70">
              <MapPin size={14} className="text-[#f3c969]" /> {profile.city} · Membre depuis {profile.memberSince}
            </p>
            {profile.bio && (
              <p className="mt-2 max-w-xl text-xs leading-relaxed text-white/80">{profile.bio}</p>
            )}
          </div>
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-extrabold backdrop-blur transition hover:bg-white hover:text-[#173f35]"
          >
            <Edit3 size={14} /> Modifier mon profil
          </button>
        </div>
      </section>

      <div className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div className="mb-10 grid grid-cols-3 divide-x divide-[#173f35]/10 border-y border-[#173f35]/10 py-5 text-center">
            <div>
              <p className="font-display text-3xl font-semibold text-[#173f35]">
                {isDemoUser ? "12" : "0"}
              </p>
              <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-[#8a958f]">Objets estimés</p>
            </div>
            <div>
              <p className="font-display text-3xl font-semibold text-[#173f35]">
                {isDemoUser ? "3" : "0"}
              </p>
              <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-[#8a958f]">Victoires</p>
            </div>
            <div>
              <p className="font-display text-3xl font-semibold text-[#173f35]">
                {isDemoUser ? "248" : "0"}
              </p>
              <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-[#8a958f]">Points</p>
            </div>
          </div>

          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#173f35]">Mes publications & défis</h2>
              <p className="mt-1 text-sm text-[#8a958f]">
                {gallery.length} contribution{gallery.length > 1 ? "s" : ""} aux défis photo
              </p>
            </div>
            <Heart size={19} className="text-[#e9683a]" />
          </div>

          {gallery.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-[#173f35]/15 bg-[#fbf8f1] p-8 text-center">
              <Camera size={28} className="mx-auto text-[#76837c]" />
              <p className="mt-3 font-display text-base font-semibold text-[#173f35]">Aucune publication pour l'instant</p>
              <p className="mt-1 text-xs text-[#76837c]">Participe au défi photo du jour pour afficher tes premières publications ici !</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {gallery.map((photo, index) => (
                <motion.div key={`${photo}-${index}`} whileHover={{ scale: 0.98 }} className="aspect-square overflow-hidden rounded-[18px] bg-[#e9e3d8]">
                  <img src={photo} alt="Contribution au défi photo" className="h-full w-full object-cover transition duration-500 hover:scale-105" />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-6">
          {isDemoUser ? (
            <section className="rounded-[24px] bg-[#f3c969] p-5 text-[#173f35] shadow-lg shadow-[#f3c969]/20">
              <Trophy size={22} />
              <h2 className="mt-4 font-display text-xl font-semibold">Œil de lynx</h2>
              <p className="mt-2 text-xs leading-relaxed text-[#173f35]/75">
                Ton estimation moyenne se situe à seulement 14 € du juste prix. Tu es dans le top 18 % de VALUO.
              </p>
            </section>
          ) : (
            <section className="rounded-[24px] bg-[#edf7f2] p-5 text-[#173f35] border border-[#488262]/20">
              <Trophy size={22} className="text-[#488262]" />
              <h2 className="mt-4 font-display text-xl font-semibold">Nouveau Joueur</h2>
              <p className="mt-2 text-xs leading-relaxed text-[#506158]">
                Participe à ton premier défi photo ou soumets une première estimation de Mystery Box pour débloquer tes premiers badges de réputation !
              </p>
            </section>
          )}

          <section className="divide-y divide-[#173f35]/8 border-y border-[#173f35]/8">
            <button type="button" onClick={onInstall} className="flex w-full items-center gap-3 py-4 text-left text-sm font-extrabold text-[#173f35] transition hover:text-[#e9683a]">
              <Download size={18} /> Installer l'application (PWA)
            </button>
            <button type="button" className="flex w-full items-center gap-3 py-4 text-left text-sm font-extrabold text-[#173f35] transition hover:text-[#e9683a]">
              <Gamepad2 size={18} /> Historique des duels
            </button>
            <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 py-4 text-left text-sm font-extrabold text-[#b15437] transition hover:text-[#e9683a]">
              <LogOut size={18} /> Se déconnecter
            </button>
          </section>
        </aside>
      </div>

      {/* Modal Modifier le profil */}
      <AnimatePresence>
        {editOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditOpen(false)}
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
                  <Sparkles size={18} className="text-[#e9683a]" />
                  <h3 className="font-display text-2xl font-semibold text-[#173f35]">Modifier mon profil</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded-full p-2 text-[#76837c] hover:bg-[#f5f0e5]"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSave} className="mt-5 space-y-5">
                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                    Photo de couverture
                  </label>
                  <div className="relative mt-2 h-24 w-full overflow-hidden rounded-2xl bg-[#efe7d8]">
                    <img src={cover} alt="" className="h-full w-full object-cover" />
                    <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/35 text-xs font-bold text-white transition hover:bg-black/50">
                      <Upload size={14} className="mr-1.5" /> Changer l'image
                      <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                    </label>
                  </div>
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {coverChoices.map((c, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCover(c)}
                        className={`h-9 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                          cover === c ? "border-[#e9683a] ring-2 ring-[#e9683a]/30" : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img src={c} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                    Photo de profil
                  </label>
                  <div className="mt-2 flex items-center gap-4">
                    <img src={avatar} alt="" className="h-16 w-16 rounded-full border-2 border-[#173f35]/15 object-cover" />
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#173f35]/15 bg-[#f5f0e5] px-4 py-2 text-xs font-extrabold text-[#173f35] transition hover:bg-[#eae3d5]">
                      <Upload size={14} /> Importer une photo
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    </label>
                  </div>
                  <p className="mt-2 text-[11px] text-[#76837c]">Ou choisis parmi les avatars :</p>
                  <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1">
                    {avatarChoices.map((a, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setAvatar(a)}
                        className={`h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 transition ${
                          avatar === a ? "border-[#e9683a] ring-2 ring-[#e9683a]/30" : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img src={a} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-name" className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                    Nom complet ou Pseudo
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Ex: Léa Martin"
                    className="mt-1.5 w-full rounded-2xl border border-[#173f35]/15 bg-[#fbf8f1] px-4 py-3 text-sm font-semibold text-[#173f35] outline-none focus:border-[#e9683a] focus:ring-4 focus:ring-[#e9683a]/10"
                  />
                </div>

                <div>
                  <label htmlFor="edit-city" className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                    Ville
                  </label>
                  <input
                    id="edit-city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: Bordeaux"
                    className="mt-1.5 w-full rounded-2xl border border-[#173f35]/15 bg-[#fbf8f1] px-4 py-3 text-sm font-semibold text-[#173f35] outline-none focus:border-[#e9683a] focus:ring-4 focus:ring-[#e9683a]/10"
                  />
                </div>

                <div>
                  <label htmlFor="edit-bio" className="text-xs font-extrabold uppercase tracking-wider text-[#53655b]">
                    Bio
                  </label>
                  <textarea
                    id="edit-bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={2}
                    placeholder="Raconte ton univers en quelques mots..."
                    className="mt-1.5 w-full rounded-2xl border border-[#173f35]/15 bg-[#fbf8f1] px-4 py-3 text-sm font-semibold text-[#173f35] outline-none focus:border-[#e9683a] focus:ring-4 focus:ring-[#e9683a]/10"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditOpen(false)}
                    className="flex-1 rounded-full border border-[#173f35]/15 bg-white py-3.5 text-xs font-extrabold text-[#173f35] hover:bg-[#f5f0e5]"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-full bg-[#e9683a] py-3.5 text-xs font-extrabold text-white shadow-lg shadow-[#e9683a]/25 transition hover:bg-[#d9582d]"
                  >
                    Enregistrer les modifications
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
