import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  Heart,
  Image as ImageIcon,
  LogIn,
  LogOut,
  Medal,
  MoreHorizontal,
  Package,
  Plus,
  Share2,
  Sparkles,
  Tag,
  Trophy,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type View = "box" | "feed" | "group" | "profile" | "result";

type Member = {
  id: string;
  name: string;
  avatar: string;
  points: number;
  isYou?: boolean;
  npc?: boolean;
};

type FeedPost = {
  id: string;
  author: string;
  avatar: string;
  time: string;
  image: string;
  caption: string;
  likes: number;
  dayKey?: string;
};

type DailyEntry = {
  id: string;
  name: string;
  avatar: string;
  estimate: number;
  difference: number;
  points: number;
  isYou?: boolean;
  npc?: boolean;
};

type DailyResult = {
  estimate: number;
  realPrice: number;
  winnerIds: string[];
  entries: DailyEntry[];
};

type WeeklySummary = {
  groupName: string;
  excluded: Member;
  members: Member[];
};

type SavedState = {
  members: Member[];
  estimation: string;
  dailyResult: DailyResult | null;
  weekEnded: boolean;
  excludedId: string | null;
  weeklySummary: WeeklySummary | null;
  nextProposal: string;
  likedPostIds: string[];
  photoPost: FeedPost | null;
  userName: string;
  userAvatar: string;
  groupName: string;
  groupCode: string;
};

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const USER_AVATAR =
  "https://images.pexels.com/photos/7717254/pexels-photo-7717254.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=240&w=240";
const AVATAR_CHOICES = [
  USER_AVATAR,
  "https://images.pexels.com/photos/6102841/pexels-photo-6102841.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=240&w=240",
  "https://images.pexels.com/photos/34930167/pexels-photo-34930167.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=240&w=240",
  "https://images.pexels.com/photos/7752811/pexels-photo-7752811.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=240&w=240",
];
const DEMO_KEY = "les-brocanteurs-demo-v1";
const OBJECT_PRICE = 68;
const PHOTO_THEME = {
  title: "La lumière du matin",
  prompt: "Montre-nous comment la première lumière transforme ton quotidien.",
  image: "/images/photo-challenge-morning.jpg",
};

function localDayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

const INITIAL_MEMBERS: Member[] = [
  { id: "camille", name: "Camille", avatar: USER_AVATAR, points: 128, isYou: true },
  {
    id: "lea",
    name: "Léa",
    avatar:
      "https://images.pexels.com/photos/34930167/pexels-photo-34930167.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=200&w=200",
    points: 111,
  },
  {
    id: "jules",
    name: "Jules",
    avatar:
      "https://images.pexels.com/photos/6102841/pexels-photo-6102841.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=200&w=200",
    points: 96,
  },
  {
    id: "marcel",
    name: "Marcel",
    avatar:
      "https://images.pexels.com/photos/7752811/pexels-photo-7752811.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=200&w=200",
    points: 84,
    npc: true,
  },
];

const INITIAL_POSTS: FeedPost[] = [
  {
    id: "post-louise",
    author: "Louise M.",
    avatar:
      "https://images.pexels.com/photos/33680700/pexels-photo-33680700.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=200&w=200",
    time: "il y a 12 min",
    image: "/images/photo-post-window.jpg",
    caption: "Premier rayon du jour, premier à en profiter. Il a clairement trouvé la meilleure place de la maison.",
    likes: 24,
  },
  {
    id: "post-antoine",
    author: "Antoine R.",
    avatar:
      "https://images.pexels.com/photos/35490803/pexels-photo-35490803.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=200&w=200",
    time: "il y a 38 min",
    image: "/images/photo-post-street.jpg",
    caption: "J'aime cette heure où la ville se réveille doucement et où tout semble possible.",
    likes: 17,
  },
];

const NAV_ITEMS: { id: View; label: string; Icon: LucideIcon }[] = [
  { id: "box", label: "Mystery Box", Icon: Package },
  { id: "feed", label: "Le fil photo", Icon: ImageIcon },
  { id: "group", label: "Mon groupe", Icon: Users },
  { id: "profile", label: "Mon profil", Icon: UserRound },
];

function readSavedState(): SavedState {
  const defaults: SavedState = {
    members: INITIAL_MEMBERS,
    estimation: "",
    dailyResult: null,
    weekEnded: false,
    excludedId: null,
    weeklySummary: null,
    nextProposal: "",
    likedPostIds: [],
    photoPost: null,
    userName: "Camille",
    userAvatar: USER_AVATAR,
    groupName: "La Puce Lyonnaise",
    groupCode: "CHINE-38",
  };

  try {
    if (typeof window === "undefined") return defaults;
    const raw = window.localStorage.getItem(DEMO_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) } as SavedState;
  } catch {
    return defaults;
  }
}

function money(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function Avatar({
  src,
  name,
  size = "md",
  className = "",
}: {
  src: string;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <img
      className={`avatar avatar-${size} ${className}`}
      src={src}
      alt={`Portrait de ${name}`}
      loading="lazy"
    />
  );
}

function Sidebar({
  view,
  userName,
  userAvatar,
  onNavigate,
  onSignIn,
}: {
  view: View;
  userName: string;
  userAvatar: string;
  onNavigate: (view: View) => void;
  onSignIn: () => void;
}) {
  return (
    <aside className="sidebar" aria-label="Navigation principale">
      <button className="brand-lockup" onClick={() => onNavigate("box")}>
        <span className="brand-mark" aria-hidden="true">
          <Tag size={22} strokeWidth={1.8} />
        </span>
        <span className="brand-wordmark">
          <strong>Les Brocanteurs</strong>
          <small>Le bon flair, ensemble.</small>
        </span>
      </button>

      <div className="nav-caption">TON ESPACE</div>
      <nav className="primary-nav">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`nav-link ${view === id ? "is-active" : ""}`}
            onClick={() => onNavigate(id)}
            aria-current={view === id ? "page" : undefined}
          >
            <Icon size={18} strokeWidth={1.8} />
            <span>{label}</span>
            {id === "box" && <span className="nav-live-dot" aria-label="Nouveau" />}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-divider" />
        <button className="account-summary" onClick={onSignIn}>
          <Avatar src={userAvatar} name={userName} size="sm" />
          <span className="account-copy">
            <strong>{userName}</strong>
            <small>Compte de démonstration</small>
          </span>
          <ChevronRight size={16} />
        </button>
        <button className="install-note" onClick={() => onNavigate("profile")}>
          <span className="install-note-icon"><Sparkles size={15} /></span>
          <span>Installe l'app sur ton écran d'accueil</span>
          <ArrowUpRight size={14} />
        </button>
      </div>
    </aside>
  );
}

function PageHeader({
  view,
  userName,
  userAvatar,
  onProfile,
  onNotify,
}: {
  view: View;
  userName: string;
  userAvatar: string;
  onProfile: () => void;
  onNotify: () => void;
}) {
  const today = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const titles: Record<View, { eyebrow: string; title: string }> = {
    box: { eyebrow: today, title: `Bonjour ${userName},` },
    feed: { eyebrow: "LE DÉFI PHOTO QUOTIDIEN", title: "Le fil photo" },
    group: { eyebrow: "TA BANDE DE CHINEURS", title: "Mon groupe" },
    profile: { eyebrow: "TON PETIT COIN", title: "Mon profil" },
    result: { eyebrow: "LE BILAN DE LA SEMAINE", title: "Le verdict est tombé" },
  };
  const page = titles[view];

  return (
    <header className="topbar">
      <div className="topbar-heading">
        <div className="mobile-brand">
          <span className="brand-mark" aria-hidden="true"><Tag size={19} /></span>
          <span>Les Brocanteurs</span>
        </div>
        <p className="eyebrow topbar-eyebrow">{page.eyebrow}</p>
        <h1>{page.title}</h1>
      </div>
      <div className="topbar-actions">
        <button className="icon-button notification-button" onClick={onNotify} aria-label="Notifications">
          <Bell size={19} strokeWidth={1.8} />
          <span className="notification-dot" />
        </button>
        <button className="topbar-profile" onClick={onProfile} aria-label={`Ouvrir le profil de ${userName}`}>
          <Avatar src={userAvatar} name={userName} size="md" />
          <span className="topbar-profile-copy">
            <strong>{userName}</strong>
            <small>{view === "feed" ? "Membre de la communauté" : "Chineuse du dimanche"}</small>
          </span>
          <ChevronRight size={15} />
        </button>
      </div>
    </header>
  );
}

function GroupBoard({
  members,
  groupName,
  weekEnded = false,
  onOpenGroup,
}: {
  members: Member[];
  groupName: string;
  weekEnded?: boolean;
  onOpenGroup: () => void;
}) {
  const rankedMembers = [...members].sort((a, b) => b.points - a.points);
  return (
    <section className="board-panel" aria-labelledby="board-title">
      <div className="section-heading board-heading">
        <div>
          <p className="eyebrow">SEMAINE EN COURS</p>
          <h2 id="board-title">Le classement</h2>
        </div>
        <button className="text-icon-button" onClick={onOpenGroup} aria-label="Voir le groupe">
          <ArrowUpRight size={18} />
        </button>
      </div>
      <button className="group-name-button" onClick={onOpenGroup}>
        <span className="group-live-mark"><Users size={16} /></span>
        <span>{groupName}</span>
        <ChevronRight size={15} />
      </button>
      <div className="week-progress-label">
        <span>{weekEnded ? "Semaine terminée" : "Jour 4 sur 7"}</span>
        <span>{weekEnded ? "Bilan publié" : "3 jours restants"}</span>
      </div>
      <div className="progress-track" role="progressbar" aria-valuenow={weekEnded ? 7 : 4} aria-valuemin={0} aria-valuemax={7} aria-label={weekEnded ? "Semaine terminée" : "Jour 4 sur 7"}>
        <span style={{ width: `${((weekEnded ? 7 : 4) / 7) * 100}%` }} />
      </div>
      <ol className="mini-ranking">
        {rankedMembers.map((member, index) => (
          <li key={member.id} className={member.isYou ? "is-you" : ""}>
            <span className="rank-number">{String(index + 1).padStart(2, "0")}</span>
            <Avatar src={member.avatar} name={member.name} size="sm" />
            <span className="rank-name">
              <strong>{member.isYou ? "Toi" : member.name}</strong>
              {member.npc && <small>renfort brocanteur</small>}
            </span>
            <span className="rank-score">{member.points}<small> pts</small></span>
          </li>
        ))}
      </ol>
      <button className="board-link" onClick={onOpenGroup}>
        Voir le classement complet <ArrowRight size={15} />
      </button>
    </section>
  );
}

function SideNote({ onHelp }: { onHelp: () => void }) {
  return (
    <div className="side-note">
      <span className="side-note-icon"><Sparkles size={17} /></span>
      <p>Un bon œil, un prix juste et une bande qui joue le jeu.</p>
      <button onClick={onHelp}>Comment ça marche ? <ArrowRight size={14} /></button>
    </div>
  );
}

function DailyChallenge({ onAction, featured = false }: { onAction: () => void; featured?: boolean }) {
  if (featured) {
    return (
      <section className="photo-challenge-hero" aria-labelledby="challenge-feature-title">
        <img className="photo-challenge-image" src={PHOTO_THEME.image} alt="La lumière du matin traverse une fenêtre et éclaire une table de petit-déjeuner" />
        <div className="photo-challenge-shade" aria-hidden="true" />
        <div className="photo-challenge-content">
          <p className="eyebrow">DÉFI PHOTO DU JOUR</p>
          <h2 id="challenge-feature-title">{PHOTO_THEME.title}<span>.</span></h2>
          <p>{PHOTO_THEME.prompt}</p>
          <div className="photo-challenge-actions">
            <button className="button button-cream" onClick={onAction}><Camera size={17} /> Participer au défi <ArrowRight size={16} /></button>
            <span><Clock3 size={14} /> Jusqu'à minuit</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="challenge-strip" aria-labelledby="challenge-title">
      <img src={PHOTO_THEME.image} alt="La lumière du matin sur une table de petit-déjeuner" />
      <div className="challenge-copy">
        <p className="eyebrow">LE DÉFI PHOTO DU JOUR</p>
        <h2 id="challenge-title">{PHOTO_THEME.title}</h2>
        <p>Un thème, ton regard, une photo à partager.</p>
      </div>
      <button className="button button-outline challenge-button" onClick={onAction}>
        Voir le défi <ArrowRight size={15} />
      </button>
      <span className="challenge-deadline"><Clock3 size={13} /> jusqu'à minuit</span>
    </section>
  );
}

function DailyResultPanel({
  result,
  nextProposal,
  onPropose,
}: {
  result: DailyResult;
  nextProposal: string;
  onPropose: () => void;
}) {
  const winners = result.entries.filter((entry) => result.winnerIds.includes(entry.id));
  const winner = winners[0];
  return (
    <section className="daily-result-panel" aria-live="polite">
      <div className="daily-result-topline">
        <span className="result-kicker"><Trophy size={15} /> RÉSULTAT DU JOUR</span>
        <span className="real-price">Vraie valeur <strong>{money(result.realPrice)}</strong></span>
      </div>
      <p className="daily-result-winner">
        {winners.length > 1
          ? "Égalité ! Le groupe partage la victoire"
          : winner?.isYou
            ? "Quel flair ! Tu remportes la manche"
            : `${winner?.name ?? "Le groupe"} remporte la manche`}
        <span>+30 pts</span>
      </p>
      <div className="daily-estimates">
        {result.entries.map((entry, index) => (
          <div key={entry.id} className={`estimate-person ${result.winnerIds.includes(entry.id) ? "estimate-winner" : ""}`}>
            <span className="estimate-rank">{index + 1}</span>
            <Avatar src={entry.avatar} name={entry.name} size="sm" />
            <span className="estimate-person-name">{entry.isYou ? "Toi" : entry.name}</span>
            <strong>{money(entry.estimate)}</strong>
            <span className={`estimate-points ${entry.points > 0 ? "positive" : "negative"}`}>
              {entry.points > 0 ? "+" : ""}{entry.points}
            </span>
          </div>
        ))}
      </div>
      {result.winnerIds.some((id) => result.entries.find((entry) => entry.id === id)?.isYou) && (
        <div className="winner-next-step">
          <Sparkles size={14} />
          {nextProposal ? (
            <span>Objet proposé pour demain : <strong>{nextProposal}</strong></span>
          ) : (
            <><span>Tu choisis l'objet mystère de demain.</span><button onClick={onPropose}>Faire une proposition <ArrowRight size={13} /></button></>
          )}
        </div>
      )}
    </section>
  );
}

function MysteryBox({
  estimate,
  result,
  members,
  nextProposal,
  onEstimateChange,
  onSubmit,
  onOpenGroup,
  onPropose,
}: {
  estimate: string;
  result: DailyResult | null;
  members: Member[];
  nextProposal: string;
  onEstimateChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onOpenGroup: () => void;
  onPropose: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.48, ease: "easeOut" }}
      className="mystery-panel"
      aria-labelledby="mystery-title"
    >
      <div className="mystery-topline">
        <div className="mystery-label"><span className="live-pulse" /> MYSTERY BOX <span className="label-divider">/</span> JOUR 4</div>
        <button className="mystery-group-link" onClick={onOpenGroup}>
          <Users size={15} /> {members.length} joueurs <ChevronRight size={14} />
        </button>
      </div>
      <div className="mystery-content">
        <div className="mystery-copy">
          <p className="mystery-kicker">À toi de chiner juste</p>
          <h2 id="mystery-title">Combien vaut cette lampe&nbsp;?</h2>
          <p className="mystery-description">
            Une lampe champignon en verre opalin, dénichée dans un grenier lyonnais.
            Quelqu'un du groupe connaît déjà son vrai prix. Pas toi.
          </p>
          <div className="mystery-privacy"><Clock3 size={14} /> Estimations secrètes jusqu'à 21 h</div>
        </div>
        <figure className="mystery-figure">
          <img src="/images/mystery-lamp.jpg" alt="Lampe champignon vintage en verre ambré posée sur un meuble en bois" />
          <figcaption><span>OBJET N° 04</span><span>Lampe opaline · années 70</span></figcaption>
        </figure>
      </div>
      {result ? (
        <DailyResultPanel result={result} nextProposal={nextProposal} onPropose={onPropose} />
      ) : (
        <form className="estimate-form" onSubmit={onSubmit}>
          <label htmlFor="price-estimate">Mon estimation</label>
          <div className="estimate-input-wrap">
            <input
              id="price-estimate"
              type="number"
              inputMode="decimal"
              min="1"
              max="100000"
              step="1"
              placeholder="Ex. 45"
              value={estimate}
              onChange={(event) => onEstimateChange(event.target.value)}
              required
              aria-describedby="estimate-hint"
            />
            <span aria-hidden="true">€</span>
            <button className="button button-cream" type="submit">
              Valider mon estimation <ArrowRight size={16} />
            </button>
          </div>
          <p id="estimate-hint" className="estimate-hint">Le meilleur flair gagne 30 points. Les autres perdent selon l'écart.</p>
        </form>
      )}
    </motion.section>
  );
}

function PostRow({
  post,
  liked,
  onLike,
  onReport,
}: {
  post: FeedPost;
  liked: boolean;
  onLike: () => void;
  onReport: () => void;
}) {
  return (
    <article className="post-row">
      <div className="post-image-wrap">
        <img className="post-image" src={post.image} alt={post.caption} loading="lazy" />
      </div>
      <div className="post-content">
        <div className="post-byline">
          <Avatar src={post.avatar} name={post.author} size="sm" />
          <div className="post-author-line">
            <strong>{post.author}</strong>
            <span>{post.time}</span>
          </div>
          <button className="post-menu" onClick={onReport} aria-label={`Signaler la publication de ${post.author}`}>
            <MoreHorizontal size={18} />
          </button>
        </div>
        <p className="post-caption">{post.caption}</p>
        <div className="post-actions">
          <button className={`post-action like-action ${liked ? "is-liked" : ""}`} onClick={onLike} aria-pressed={liked}>
            <Heart size={16} fill={liked ? "currentColor" : "none"} />
            {post.likes + (liked ? 1 : 0)}
          </button>
        </div>
      </div>
    </article>
  );
}

function FeedList({
  posts,
  likedPostIds,
  onLike,
  onReport,
  onUpload,
}: {
  posts: FeedPost[];
  likedPostIds: Set<string>;
  onLike: (id: string) => void;
  onReport: () => void;
  onUpload: () => void;
}) {
  return (
    <section className="feed-list-section" aria-labelledby="feed-title">
      <div className="section-heading feed-section-heading">
        <div>
          <p className="eyebrow">LE DÉFI EN IMAGES</p>
          <h2 id="feed-title">Vos regards sur le thème</h2>
          <p className="feed-description">Un même thème, autant de façons de le voir.</p>
        </div>
        <button className="button button-outline upload-feed-button" onClick={onUpload}><Plus size={16} /> Ajouter ma photo</button>
      </div>
      {posts.length > 0 ? (
        <div className="post-list">
          {posts.map((post) => (
            <PostRow
              key={post.id}
              post={post}
              liked={likedPostIds.has(post.id)}
              onLike={() => onLike(post.id)}
              onReport={onReport}
            />
          ))}
        </div>
      ) : (
        <div className="empty-feed">
          <span><Camera size={20} /></span>
          <p>Le fil est encore calme. Partage la première photo du défi.</p>
          <button className="button button-dark" onClick={onUpload}><Plus size={16} /> Poster une photo</button>
        </div>
      )}
    </section>
  );
}

function BoxPage({
  estimate,
  dailyResult,
  members,
  groupName,
  weekEnded,
  nextProposal,
  onEstimateChange,
  onEstimateSubmit,
  onOpenGroup,
  onNavigateFeed,
  onHelp,
  onPropose,
}: {
  estimate: string;
  dailyResult: DailyResult | null;
  members: Member[];
  groupName: string;
  weekEnded: boolean;
  nextProposal: string;
  onEstimateChange: (value: string) => void;
  onEstimateSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onOpenGroup: () => void;
  onNavigateFeed: () => void;
  onHelp: () => void;
  onPropose: () => void;
}) {
  return (
    <div className="dashboard-grid">
      <div className="main-column">
        <MysteryBox
          estimate={estimate}
          result={dailyResult}
          members={members}
          nextProposal={nextProposal}
          onEstimateChange={onEstimateChange}
          onSubmit={onEstimateSubmit}
          onOpenGroup={onOpenGroup}
          onPropose={onPropose}
        />
        <DailyChallenge onAction={onNavigateFeed} />
      </div>
      <aside className="right-rail">
        <GroupBoard members={members} groupName={groupName} weekEnded={weekEnded} onOpenGroup={onOpenGroup} />
        <SideNote onHelp={onHelp} />
      </aside>
    </div>
  );
}

function FeedPage({
  posts,
  likedPostIds,
  onLike,
  onReport,
  onUpload,
}: {
  posts: FeedPost[];
  likedPostIds: Set<string>;
  onLike: (id: string) => void;
  onReport: () => void;
  onUpload: () => void;
}) {
  return (
    <div className="photo-feed-page page-enter">
      <DailyChallenge onAction={onUpload} featured />
      <FeedList
        posts={posts}
        likedPostIds={likedPostIds}
        onLike={onLike}
        onReport={onReport}
        onUpload={onUpload}
      />
    </div>
  );
}

function GroupPage({
  members,
  groupName,
  groupCode,
  weekEnded,
  onCopyInvite,
  onNewGroup,
  onPreviewResult,
}: {
  members: Member[];
  groupName: string;
  groupCode: string;
  weekEnded: boolean;
  onCopyInvite: () => void;
  onNewGroup: () => void;
  onPreviewResult: () => void;
}) {
  const rankedMembers = [...members].sort((a, b) => b.points - a.points);
  return (
    <div className="group-page page-enter">
      <section className="group-cover">
        <div className="group-cover-copy">
          <p className="eyebrow">NOTRE PETITE BANDE · SEMAINE 38</p>
          <h2>{groupName}</h2>
          <p>Quatre regards, un objet par jour, et le droit de chambrer celui qui se trompe.</p>
        </div>
        <div className="group-cover-members" aria-label="Membres du groupe">
          {members.map((member) => <Avatar key={member.id} src={member.avatar} name={member.name} size="md" />)}
          <span>{members.length}/4</span>
        </div>
      </section>

      <div className="group-page-grid">
        <section className="ranking-table" aria-labelledby="ranking-title">
          <div className="section-heading ranking-heading">
            <div>
              <p className="eyebrow">LE PETIT CLASSEMENT</p>
              <h2 id="ranking-title">Qui a le meilleur flair ?</h2>
            </div>
            <div className="week-pill">{weekEnded ? <Check size={14} /> : <Clock3 size={14} />}{weekEnded ? "Semaine terminée" : "Jour 4 / 7"}</div>
          </div>
          <div className="ranking-columns"><span>JOUEUR</span><span>POINTS</span></div>
          <ol className="full-ranking">
            {rankedMembers.map((member, index) => (
              <li key={member.id} className={member.isYou ? "is-you" : ""}>
                <span className={`full-rank-number ${index === 0 ? "top-rank" : ""}`}>{index === 0 ? <Medal size={17} /> : `0${index + 1}`}</span>
                <Avatar src={member.avatar} name={member.name} size="md" />
                <span className="full-rank-name">
                  <strong>{member.isYou ? "Toi, " : ""}{member.name}</strong>
                  <small>{member.npc ? "Brocanteur de renfort · PNJ" : member.isYou ? "C'est ta semaine" : "Dans la bande depuis lundi"}</small>
                </span>
                <strong className="full-rank-score">{member.points}<small> pts</small></strong>
              </li>
            ))}
          </ol>
          <div className="elimination-note">
            <span className="elimination-icon"><Trophy size={17} /></span>
            <p><strong>Dimanche, on fait les comptes.</strong> La personne avec le moins de points quitte la bande. Elle pourra aussitôt rejoindre un nouveau groupe.</p>
          </div>
        </section>

        <aside className="group-actions-column">
          <section className="week-card">
            <p className="eyebrow">LE RYTHME DE LA SEMAINE</p>
            <h2>{weekEnded ? "Le bilan de cette semaine est publié." : "Encore trois objets à estimer."}</h2>
            <div className="week-days" aria-label="Progression de la semaine">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <span key={day} className={`${weekEnded || day < 4 ? "day-done" : day === 4 ? "day-current" : ""}`} aria-label={`Jour ${day}${weekEnded || day < 4 ? ", terminé" : day === 4 ? ", en cours" : ""}`}>
                  {weekEnded || day < 4 ? <Check size={13} /> : day}
                </span>
              ))}
            </div>
            <div className="progress-track week-track"><span style={{ width: `${((weekEnded ? 7 : 4) / 7) * 100}%` }} /></div>
            <p className="week-card-caption">{weekEnded ? "Le classement est clos. Rejoins une nouvelle bande pour rejouer." : "Une Mystery Box chaque jour, jusqu'au verdict du dimanche."}</p>
          </section>
          <section className="invite-card">
            <div className="invite-icon"><Users size={19} /></div>
            <h3>{members.length < 4 ? "Ta bande est presque au complet." : "Invite les chineurs de ton coin."}</h3>
            <p>Code d'invitation <strong>{groupCode}</strong>. Les places libres peuvent être complétées par un brocanteur de renfort.</p>
            <button className="button button-dark button-full" onClick={onCopyInvite}><Copy size={15} /> Copier le lien d'invitation</button>
          </section>
          <button className="new-group-link" onClick={onNewGroup}><Plus size={16} /> Trouver ou créer une autre bande</button>
          {weekEnded ? (
            <button className="button button-outline button-full" onClick={onPreviewResult}>Revoir le bilan <ArrowRight size={15} /></button>
          ) : (
            <button className="preview-result-link" onClick={onPreviewResult}>Prévisualiser le bilan de dimanche</button>
          )}
        </aside>
      </div>
    </div>
  );
}

function ResultPage({
  excluded,
  members,
  onShare,
  onReplay,
  onGoFeed,
}: {
  excluded: Member | undefined;
  members: Member[];
  onShare: () => void;
  onReplay: () => void;
  onGoFeed: () => void;
}) {
  return (
    <motion.div
      className="result-page page-enter"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="result-mark"><Trophy size={27} strokeWidth={1.7} /></div>
      <p className="eyebrow">LE BILAN DE LA SEMAINE</p>
      <h2>Une semaine bien<br /><em>chinée.</em></h2>
      <p className="result-intro">Les prix ont parlé. Cette semaine, c'est <strong>{excluded?.name ?? "un membre"}</strong> qui quitte la bande, mais pas le jeu.</p>
      <div className="result-people" aria-label="Membres du groupe">
        {members.map((member) => (
          <span key={member.id} className={`result-person ${member.id === excluded?.id ? "result-excluded" : ""}`}>
            <Avatar src={member.avatar} name={member.name} size="md" />
            <small>{member.isYou ? "Toi" : member.name}</small>
          </span>
        ))}
      </div>
      <div className="result-summary">
        <span className="result-summary-icon"><Sparkles size={17} /></span>
        <p><strong>Le bilan est prêt à être partagé.</strong><br />Envoie-le à tes amis, puis relance une nouvelle partie.</p>
      </div>
      <div className="result-actions">
        <button className="button button-dark" onClick={onShare}><Share2 size={16} /> Partager le bilan</button>
        <button className="button button-cream-light" onClick={onReplay}><Users size={16} /> Rejouer une semaine</button>
      </div>
      <button className="result-feed-link" onClick={onGoFeed}>Découvrir le défi photo du jour <ArrowRight size={15} /></button>
      <div className="result-fine-print">Bilan de démonstration · Les points sont conservés sur cet appareil.</div>
    </motion.div>
  );
}

function ProfilePage({
  userName,
  userAvatar,
  members,
  photoCount,
  installAvailable,
  onSaveName,
  onSignIn,
  onInstall,
}: {
  userName: string;
  userAvatar: string;
  members: Member[];
  photoCount: number;
  installAvailable: boolean;
  onSaveName: (name: string) => void;
  onSignIn: () => void;
  onInstall: () => void;
}) {
  const [draft, setDraft] = useState(userName);
  useEffect(() => setDraft(userName), [userName]);
  const you = members.find((member) => member.isYou);

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = draft.trim();
    if (nextName) onSaveName(nextName);
  }

  return (
    <div className="profile-page page-enter">
      <section className="profile-intro">
        <Avatar src={userAvatar} name={userName} size="lg" />
        <div>
          <p className="eyebrow">MEMBRE DEPUIS CETTE SEMAINE</p>
          <h2>{userName}</h2>
          <p>Un bon œil, un peu de chance, et toujours une poche de plus à remplir.</p>
        </div>
      </section>
      <div className="profile-grid">
        <form className="profile-edit" onSubmit={saveProfile}>
          <div className="section-heading"><div><p className="eyebrow">TES INFORMATIONS</p><h3>Ton profil de chineur</h3></div></div>
          <label htmlFor="profile-name">Ton pseudo</label>
          <div className="profile-name-control">
            <input id="profile-name" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={24} />
            <button className="button button-dark" type="submit">Enregistrer</button>
          </div>
          <p className="profile-helper">C'est ce nom que ta bande verra dans le classement.</p>
          <div className="profile-account-actions">
            <button type="button" className="profile-row-button" onClick={onSignIn}><LogIn size={17} /><span>Créer un compte ou se connecter<small>Pour retrouver ton profil sur un autre appareil</small></span><ChevronRight size={16} /></button>
            <button type="button" className="profile-row-button" onClick={onInstall}><Sparkles size={17} /><span>Installer l'application<small>{installAvailable ? "Ajoute Les Brocanteurs à ton écran d'accueil" : "Sur iPhone : Partager, puis Sur l'écran d'accueil"}</small></span><ChevronRight size={16} /></button>
          </div>
        </form>
        <section className="profile-stats">
          <p className="eyebrow">TES CHIFFRES DE CHINE</p>
          <div className="profile-stat"><span><Trophy size={17} /> Points cette semaine</span><strong>{you?.points ?? 0}</strong></div>
          <div className="profile-stat"><span><Users size={17} /> Parties jouées</span><strong>3</strong></div>
          <div className="profile-stat"><span><Camera size={17} /> Photos partagées</span><strong>{photoCount}</strong></div>
          <div className="profile-status-note"><span className="status-dot" /> Ta prochaine Mystery Box est prête.</div>
        </section>
      </div>
      <button className="signout-link" onClick={onSignIn}><LogOut size={15} /> Changer de compte</button>
    </div>
  );
}

function ModalFrame({
  title,
  eyebrow,
  onClose,
  children,
  size = "normal",
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  size?: "normal" | "wide";
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <motion.section
        className={`modal-card ${size === "wide" ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.18 }}
      >
        <button className="modal-close" onClick={onClose} aria-label="Fermer"><X size={19} /></button>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 id="modal-title">{title}</h2>
        {children}
      </motion.section>
    </motion.div>
  );
}

function AuthModal({
  userName,
  userAvatar,
  onClose,
  onComplete,
}: {
  userName: string;
  userAvatar: string;
  onClose: () => void;
  onComplete: (name: string, avatar: string) => void;
}) {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState(userName);
  const [avatar, setAvatar] = useState(userAvatar);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onComplete(name.trim() || userName, avatar);
  }

  return (
    <ModalFrame title={mode === "signup" ? "Bienvenue à la brocante." : "Content de te revoir."} eyebrow="TON COMPTE BROCANTEUR" onClose={onClose}>
      <div className="auth-tabs" role="tablist" aria-label="Choisir une action">
        <button type="button" className={mode === "signup" ? "selected" : ""} onClick={() => setMode("signup")} role="tab" aria-selected={mode === "signup"}>Créer un compte</button>
        <button type="button" className={mode === "login" ? "selected" : ""} onClick={() => setMode("login")} role="tab" aria-selected={mode === "login"}>Connexion</button>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="auth-contact">E-mail ou téléphone</label>
        <input id="auth-contact" type="text" autoComplete="username" inputMode="email" placeholder="toi@exemple.fr" required />
        <label htmlFor="auth-password">Mot de passe</label>
        <input id="auth-password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="8 caractères minimum" minLength={8} required />
        {mode === "signup" && <>
          <label htmlFor="auth-nickname">Ton pseudo</label>
          <input id="auth-nickname" value={name} onChange={(event) => setName(event.target.value)} maxLength={24} placeholder="Comment t'appelle-t-on ?" required />
          <span className="avatar-picker-label">Choisis ton avatar</span>
          <div className="avatar-picker">
            {AVATAR_CHOICES.map((choice, index) => (
              <button key={choice} type="button" onClick={() => setAvatar(choice)} className={avatar === choice ? "is-selected" : ""} aria-label={`Avatar ${index + 1}`} aria-pressed={avatar === choice}>
                <img src={choice} alt="" />
              </button>
            ))}
          </div>
        </>}
        <button className="button button-dark button-full" type="submit">{mode === "signup" ? "Créer mon compte" : "Me connecter"} <ArrowRight size={16} /></button>
      </form>
      <p className="demo-disclaimer"><CircleHelp size={14} /> Démo locale : aucun compte n'est créé tant que Supabase n'est pas connecté.</p>
    </ModalFrame>
  );
}

function GroupModal({
  onClose,
  onCreate,
  onJoin,
}: {
  onClose: () => void;
  onCreate: () => void;
  onJoin: (code: string) => void;
}) {
  const [code, setCode] = useState("");
  return (
    <ModalFrame title="Une nouvelle bande ?" eyebrow="À PLUSIEURS, C'EST MIEUX" onClose={onClose}>
      <p className="modal-intro">On te trouve des chineurs, puis on complète les places libres avec des brocanteurs de renfort.</p>
      <button className="button button-dark button-full create-group-button" onClick={onCreate}><Plus size={16} /> Créer une nouvelle bande</button>
      <div className="modal-separator"><span>OU AVEC UN CODE</span></div>
      <form className="join-group-form" onSubmit={(event) => { event.preventDefault(); onJoin(code); }}>
        <label htmlFor="invite-code">Code d'invitation</label>
        <div className="join-code-row">
          <input id="invite-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Ex. CHINE-38" required />
          <button className="button button-cream-light" type="submit">Rejoindre <ArrowRight size={15} /></button>
        </div>
      </form>
      <p className="demo-disclaimer"><Users size={14} /> Groupes de 3 à 4 joueurs · matchmaking automatique en démo.</p>
    </ModalFrame>
  );
}

function ProposalModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (proposal: string) => void;
}) {
  const [proposal, setProposal] = useState("");
  return (
    <ModalFrame title="À toi de choisir la suite." eyebrow="POUVOIR DU GAGNANT" onClose={onClose}>
      <p className="modal-intro">Propose un objet à estimer demain. La bande découvrira sa valeur après avoir joué.</p>
      <form className="proposal-form" onSubmit={(event) => { event.preventDefault(); onSubmit(proposal); }}>
        <label htmlFor="next-object">Quel objet veux-tu proposer ?</label>
        <input id="next-object" value={proposal} onChange={(event) => setProposal(event.target.value)} placeholder="Ex. un service à café en porcelaine" maxLength={70} required />
        <button className="button button-dark button-full" type="submit">Proposer l'objet <ArrowRight size={16} /></button>
      </form>
      <p className="demo-disclaimer"><Sparkles size={14} /> Tu pourras aussi proposer une famille d'objets ou une trouvaille locale.</p>
    </ModalFrame>
  );
}

function PhotoComposerModal({
  photo,
  onClose,
  onChangePhoto,
  onPublish,
}: {
  photo: string;
  onClose: () => void;
  onChangePhoto: () => void;
  onPublish: (caption: string) => void;
}) {
  const [caption, setCaption] = useState("");

  return (
    <ModalFrame title="Publier ma photo" eyebrow="DÉFI PHOTO DU JOUR" onClose={onClose}>
      <p className="modal-intro">Thème : <strong>{PHOTO_THEME.title}</strong>. Ajoute quelques mots avant de partager ton regard avec le fil.</p>
      <div className="photo-compose-preview">
        <img src={photo} alt="Aperçu de la photo sélectionnée" />
        <button type="button" onClick={onChangePhoto}><Camera size={15} /> Changer de photo</button>
      </div>
      <form className="photo-compose-form" onSubmit={(event) => { event.preventDefault(); onPublish(caption.trim()); }}>
        <label htmlFor="photo-caption">Ta légende</label>
        <textarea
          id="photo-caption"
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="Qu'est-ce que cette lumière t'inspire ?"
          rows={3}
          maxLength={240}
          required
        />
        <div className="photo-compose-bottom"><span>{caption.length}/240 caractères</span><button className="button button-dark" type="submit"><Camera size={16} /> Publier dans le fil</button></div>
      </form>
      <p className="demo-disclaimer"><CircleHelp size={14} /> Démo locale : ta photo est visible uniquement sur cet appareil.</p>
    </ModalFrame>
  );
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalFrame title="Le jeu, en trois trouvailles." eyebrow="LES RÈGLES DE LA BROCANTE" onClose={onClose}>
      <ol className="help-list">
        <li><span>01</span><p><strong>Estime l'objet du jour.</strong> Ton prix reste secret jusqu'à la révélation du soir.</p></li>
        <li><span>02</span><p><strong>Le meilleur flair gagne 30 points.</strong> Les autres perdent des points selon l'écart. En cas d'égalité, le groupe partage la victoire.</p></li>
        <li><span>03</span><p><strong>Le gagnant choisit l'objet de demain.</strong> Dimanche, le joueur avec le moins de points quitte la bande et peut rejouer ailleurs.</p></li>
      </ol>
      <div className="help-footnote"><Sparkles size={16} /> Pas assez de monde ? Des brocanteurs de renfort complètent la bande.</div>
    </ModalFrame>
  );
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="toast-message"
          role="status"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
        >
          <span className="toast-check"><Check size={14} /></span>
          <span>{message}</span>
          <button onClick={onClose} aria-label="Fermer le message"><X size={15} /></button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  const [initialState] = useState(readSavedState);
  const [view, setView] = useState<View>("box");
  const [userName, setUserName] = useState(initialState.userName);
  const [userAvatar, setUserAvatar] = useState(initialState.userAvatar);
  const [members, setMembers] = useState<Member[]>(initialState.members);
  const [groupName, setGroupName] = useState(initialState.groupName);
  const [groupCode, setGroupCode] = useState(initialState.groupCode);
  const [estimate, setEstimate] = useState(initialState.estimation);
  const [dailyResult, setDailyResult] = useState<DailyResult | null>(initialState.dailyResult);
  const [weekEnded, setWeekEnded] = useState(initialState.weekEnded);
  const [excludedId, setExcludedId] = useState<string | null>(initialState.excludedId);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(initialState.weeklySummary);
  const [nextProposal, setNextProposal] = useState(initialState.nextProposal);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(() => new Set(initialState.likedPostIds));
  const [uploadedPost, setUploadedPost] = useState<FeedPost | null>(
    initialState.photoPost?.dayKey === localDayKey() ? initialState.photoPost : null,
  );
  const [photoDraft, setPhotoDraft] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(DEMO_KEY, JSON.stringify({
        members,
        estimation: estimate,
        dailyResult,
        weekEnded,
        excludedId,
        weeklySummary,
        nextProposal,
        likedPostIds: [...likedPostIds],
        photoPost: uploadedPost,
        userName,
        userAvatar,
        groupName,
        groupCode,
      } satisfies SavedState));
    } catch {
      notify("Le stockage local est indisponible sur cet appareil.");
    }
  }, [members, estimate, dailyResult, weekEnded, excludedId, weeklySummary, nextProposal, likedPostIds, uploadedPost, userName, userAvatar, groupName, groupCode]);

  useEffect(() => {
    function onInstallAvailable(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onInstallAvailable);
    return () => window.removeEventListener("beforeinstallprompt", onInstallAvailable);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view]);

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  const rankedMembers = useMemo(() => [...members].sort((a, b) => b.points - a.points), [members]);
  const excluded = weeklySummary?.excluded ?? members.find((member) => member.id === excludedId);
  const posts = useMemo(() => [
    ...(uploadedPost ? [uploadedPost] : []),
    ...INITIAL_POSTS,
  ], [uploadedPost]);

  function notify(message: string) {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 3400);
  }

  function submitEstimate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(estimate.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      notify("Entre une estimation supérieure à 0 €.");
      return;
    }

    const npcEstimates: Record<string, number> = { lea: 61, jules: 74, marcel: 82 };
    const entries = members.map((member, index) => ({
      id: member.id,
      name: member.name,
      avatar: member.avatar,
      estimate: member.isYou ? value : (npcEstimates[member.id] ?? 56 + index * 12),
      difference: 0,
      points: 0,
      isYou: member.isYou,
      npc: member.npc,
    })).map((entry) => ({ ...entry, difference: Math.abs(entry.estimate - OBJECT_PRICE) }));

    const winningDifference = Math.min(...entries.map((entry) => entry.difference));
    const winnerIds = entries.filter((entry) => entry.difference === winningDifference).map((entry) => entry.id);
    const winner = entries.find((entry) => entry.id === winnerIds[0]);
    const resultEntries = [...entries]
      .sort((a, b) => a.difference - b.difference)
      .map((entry) => ({
        ...entry,
        points: winnerIds.includes(entry.id)
          ? 30
          : -Math.min(20, Math.max(3, Math.round(entry.difference / 4))),
      }));

    setMembers((current) => current.map((member) => {
      const entry = resultEntries.find((item) => item.id === member.id);
      return { ...member, points: member.points + (entry?.points ?? 0) };
    }));
    setDailyResult({ estimate: value, realPrice: OBJECT_PRICE, winnerIds, entries: resultEntries });
    notify(winnerIds.some((id) => entries.find((entry) => entry.id === id)?.isYou)
      ? "Quel flair : tu remportes la Mystery Box du jour !"
      : `${winner?.name ?? "Le groupe"} a trouvé le meilleur prix.`);
  }

  function selectPhoto() {
    fileInputRef.current?.click();
  }

  function onPhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("Choisis un fichier image pour participer au défi.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      notify("Cette photo est trop lourde. Choisis une image de moins de 8 Mo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const photo = new window.Image();
      photo.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 1440 / Math.max(photo.width, photo.height));
        canvas.width = Math.round(photo.width * scale);
        canvas.height = Math.round(photo.height * scale);
        const context = canvas.getContext("2d");
        if (!context) {
          notify("Impossible de préparer cette photo. Réessaie.");
          return;
        }
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(photo, 0, 0, canvas.width, canvas.height);
        setPhotoDraft(canvas.toDataURL("image/jpeg", 0.78));
      };
      photo.onerror = () => notify("Impossible de lire cette photo. Réessaie.");
      photo.src = reader.result;
    };
    reader.onerror = () => notify("Impossible de lire cette photo. Réessaie.");
    reader.readAsDataURL(file);
  }

  function publishPhoto(caption: string) {
    if (!photoDraft || !caption) return;
    setUploadedPost({
      id: `photo-${Date.now()}`,
      author: userName,
      avatar: userAvatar,
      time: "à l'instant",
      image: photoDraft,
      caption,
      likes: 0,
      dayKey: localDayKey(),
    });
    setPhotoDraft(null);
    setView("feed");
    notify("Ta photo est publiée pour le défi du jour.");
  }

  function toggleLike(id: string) {
    setLikedPostIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function finishWeek() {
    if (weekEnded) {
      setView("result");
      return;
    }
    const lowest = [...members].sort((a, b) => a.points - b.points)[0];
    if (!lowest) return;
    setWeeklySummary({ groupName, excluded: lowest, members: [...members] });
    setExcludedId(lowest.id);
    setMembers((current) => current.filter((member) => member.id !== lowest.id));
    setWeekEnded(true);
    setView("result");
    setGroupOpen(false);
    notify("Ton bilan de la semaine est prêt à être partagé.");
  }

  function replayWeek() {
    const previousMembers = weeklySummary?.members ?? members;
    const excludedMemberId = weeklySummary?.excluded.id;
    const returningPlayers = previousMembers
      .filter((member) => !member.isYou && member.id !== excludedMemberId)
      .slice(0, 2)
      .map((member) => ({ ...member, points: 0 }));
    const nextMembers: Member[] = [
      { id: "camille", name: userName, avatar: userAvatar, points: 0, isYou: true },
      ...returningPlayers,
    ];
    const fallbackNames = ["Suzanne", "Gaston", "Lucien"];
    while (nextMembers.length < 4) {
      const index = nextMembers.length - returningPlayers.length - 1;
      nextMembers.push({
        id: `npc-replay-${index + 1}`,
        name: fallbackNames[index % fallbackNames.length],
        avatar: AVATAR_CHOICES[(index + 2) % AVATAR_CHOICES.length],
        points: 0,
        npc: true,
      });
    }
    setMembers(nextMembers);
    setGroupName(`La bande de ${userName}`);
    setGroupCode(`BROC-${Math.floor(10 + Math.random() * 89)}`);
    setDailyResult(null);
    setEstimate("");
    setNextProposal("");
    setWeekEnded(false);
    setExcludedId(null);
    setView("box");
    notify("Une nouvelle semaine de chine commence.");
  }

  function submitProposal(proposal: string) {
    const cleanProposal = proposal.trim();
    if (!cleanProposal) return;
    setNextProposal(cleanProposal);
    setProposalOpen(false);
    notify("Ta proposition est transmise à la bande pour demain.");
  }

  async function shareResult() {
    const shareData = {
      title: "Les Brocanteurs · Le bilan de la semaine",
      text: `${weeklySummary?.excluded.name ?? excluded?.name ?? "Un chineur"} quitte la bande cette semaine. À qui le tour ?`,
      url: window.location.origin,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        notify("Lien du bilan copié. À toi de le partager !");
      } else {
        notify("Le partage n'est pas disponible sur ce navigateur.");
      }
    } catch {
      notify("Le partage n'a pas abouti. Tu peux réessayer.");
    }
  }

  async function copyInvite() {
    const invite = `${window.location.origin}/?groupe=${groupCode}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(invite);
        notify("Lien d'invitation copié.");
      } else {
        notify(`Code d'invitation : ${groupCode}`);
      }
    } catch {
      notify(`Code d'invitation : ${groupCode}`);
    }
  }

  function updateProfile(nextName: string, nextAvatar = userAvatar) {
    setUserName(nextName);
    setUserAvatar(nextAvatar);
    setMembers((current) => current.map((member) => member.isYou
      ? { ...member, name: nextName, avatar: nextAvatar }
      : member));
    setAuthOpen(false);
    notify(`Bienvenue, ${nextName} !`);
  }

  function createGroup() {
    setGroupName(`Les chineurs de ${userName}`);
    setGroupCode(`BROC-${Math.floor(10 + Math.random() * 89)}`);
    setMembers([
      { id: "camille", name: userName, avatar: userAvatar, points: 0, isYou: true },
      { id: "npc-1", name: "Suzanne", avatar: AVATAR_CHOICES[2], points: 0, npc: true },
      { id: "npc-2", name: "Gaston", avatar: AVATAR_CHOICES[3], points: 0, npc: true },
      { id: "npc-3", name: "Lucien", avatar: AVATAR_CHOICES[1], points: 0, npc: true },
    ]);
    setDailyResult(null);
    setEstimate("");
    setNextProposal("");
    setWeekEnded(false);
    setExcludedId(null);
    setGroupOpen(false);
    setView("box");
    notify("Ta nouvelle bande est prête. Les places libres sont complétées !");
  }

  function joinGroup(code: string) {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) return;
    setGroupCode(normalizedCode);
    setGroupName("La bande des chineurs");
    setMembers([
      { id: "camille", name: userName, avatar: userAvatar, points: 74, isYou: true },
      { id: "lea", name: "Léa", avatar: AVATAR_CHOICES[2], points: 92 },
      { id: "jules", name: "Jules", avatar: AVATAR_CHOICES[1], points: 67 },
      { id: "marcel", name: "Marcel", avatar: AVATAR_CHOICES[3], points: 54, npc: true },
    ]);
    setDailyResult(null);
    setEstimate("");
    setNextProposal("");
    setWeekEnded(false);
    setExcludedId(null);
    setGroupOpen(false);
    setView("group");
    notify("Tu as rejoint la bande. Le groupe est au complet !");
  }

  async function installApp() {
    if (!installPrompt) {
      notify("Sur iPhone : Partager, puis « Sur l'écran d'accueil ».");
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") notify("Les Brocanteurs sont ajoutés à ton écran d'accueil.");
    setInstallPrompt(null);
  }

  const openGroup = () => setView("group");

  useEffect(() => {
    const inviteCode = new URLSearchParams(window.location.search).get("groupe");
    if (inviteCode) joinGroup(inviteCode);
  }, []);

  return (
    <div className="app-shell">
      <Sidebar
        view={view}
        userName={userName}
        userAvatar={userAvatar}
        onNavigate={setView}
        onSignIn={() => setAuthOpen(true)}
      />
      <main className="workspace">
        <PageHeader
          view={view}
          userName={userName}
          userAvatar={userAvatar}
          onProfile={() => setView("profile")}
          onNotify={() => notify("Tu es à jour. Ta prochaine boîte t'attend ce soir.")}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            className="view-container"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            {view === "box" && <BoxPage
              estimate={estimate}
              dailyResult={dailyResult}
              members={members}
              nextProposal={nextProposal}
              groupName={groupName}
              weekEnded={weekEnded}
              onEstimateChange={setEstimate}
              onEstimateSubmit={submitEstimate}
              onOpenGroup={openGroup}
              onNavigateFeed={() => setView("feed")}
              onHelp={() => setHelpOpen(true)}
              onPropose={() => setProposalOpen(true)}
            />}
            {view === "feed" && <FeedPage
              posts={posts}
              likedPostIds={likedPostIds}
              onLike={toggleLike}
              onReport={() => notify("Merci, le signalement a bien été pris en compte.")}
              onUpload={selectPhoto}
            />}
            {view === "group" && <GroupPage
              members={members}
              groupName={groupName}
              groupCode={groupCode}
              weekEnded={weekEnded}
              onCopyInvite={copyInvite}
              onNewGroup={() => setGroupOpen(true)}
              onPreviewResult={() => weekEnded ? setView("result") : finishWeek()}
            />}
            {view === "result" && <ResultPage
              excluded={excluded}
              members={weeklySummary?.members ?? rankedMembers}
              onShare={shareResult}
              onReplay={replayWeek}
              onGoFeed={() => setView("feed")}
            />}
            {view === "profile" && <ProfilePage
              userName={userName}
              userAvatar={userAvatar}
              members={members}
              photoCount={uploadedPost ? 1 : 0}
              installAvailable={Boolean(installPrompt)}
              onSaveName={(name) => updateProfile(name)}
              onSignIn={() => setAuthOpen(true)}
              onInstall={installApp}
            />}
          </motion.div>
        </AnimatePresence>
        <footer className="app-footer"><span>Les Brocanteurs</span><span>Fait pour les chineurs, pas pour les vitrines.</span></footer>
      </main>

      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept="image/*"
        onChange={onPhotoSelected}
        aria-label="Choisir une photo pour le défi du jour"
      />

      <AnimatePresence>
        {authOpen && <AuthModal key="auth" userName={userName} userAvatar={userAvatar} onClose={() => setAuthOpen(false)} onComplete={updateProfile} />}
        {groupOpen && <GroupModal key="group-modal" onClose={() => setGroupOpen(false)} onCreate={createGroup} onJoin={joinGroup} />}
        {proposalOpen && <ProposalModal key="proposal" onClose={() => setProposalOpen(false)} onSubmit={submitProposal} />}
        {photoDraft && <PhotoComposerModal key="photo-composer" photo={photoDraft} onClose={() => setPhotoDraft(null)} onChangePhoto={selectPhoto} onPublish={publishPhoto} />}
        {helpOpen && <HelpModal key="help" onClose={() => setHelpOpen(false)} />}
      </AnimatePresence>
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}