export type Comment = {
  id: number;
  author: string;
  avatar: string;
  text: string;
};

export type FeedPost = {
  id: number;
  author: string;
  city: string;
  avatar: string;
  photo: string;
  caption: string;
  time: string;
  likes: number;
  liked?: boolean;
  comments: Comment[];
  isPinned?: boolean;
  isOfficial?: boolean;
};

export type UserProfile = {
  name: string;
  city: string;
  bio: string;
  avatar: string;
  cover: string;
  memberSince: string;
};

export type NotificationType = "challenge" | "friend" | "like" | "comment" | "mystery";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  targetTab: "feed" | "game" | "group" | "profile" | "notifications";
  targetPostId?: number;
  avatar?: string;
};

export type GroupMember = {
  id: number;
  name: string;
  avatar: string;
  points: number;
  change: number;
  estimate: number | null;
  isNpc?: boolean;
};

export type GroupData = {
  id: string;
  name: string;
  code: string;
  week: number;
  members: GroupMember[];
};

export const todayChallenge = {
  theme: "Une touche de rouge",
  date: "Jeudi 17 septembre",
  brief: "Photographie un objet rouge qui a déjà vécu. Un détail, une texture, une histoire — avant minuit.",
  remaining: "6 h 24",
};

export const media = {
  mystery:
    "https://images.pexels.com/photos/11430230/pexels-photo-11430230.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1400&w=1000",
  authHero:
    "https://images.pexels.com/photos/8099796/pexels-photo-8099796.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=1600",
  market:
    "https://images.pexels.com/photos/14346109/pexels-photo-14346109.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  phone:
    "https://images.pexels.com/photos/19594089/pexels-photo-19594089.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1400&w=1000",
  radio:
    "https://images.pexels.com/photos/18439105/pexels-photo-18439105.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1400&w=1000",
  camera:
    "https://images.pexels.com/photos/8099796/pexels-photo-8099796.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1400&w=1000",
  desk:
    "https://images.pexels.com/photos/12407374/pexels-photo-12407374.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1400&w=1000",
  redPhone:
    "https://images.pexels.com/photos/15832359/pexels-photo-15832359.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1400&w=1000",
  drapes:
    "https://images.pexels.com/photos/37556078/pexels-photo-37556078.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1400&w=1000",
  figurines:
    "https://images.pexels.com/photos/17322232/pexels-photo-17322232.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1000&w=1200",
  dishes:
    "https://images.pexels.com/photos/6826026/pexels-photo-6826026.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1000&w=1200",
};

export const avatars = {
  lea: "https://images.pexels.com/photos/14842170/pexels-photo-14842170.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=300&w=300",
  camille:
    "https://images.pexels.com/photos/20144196/pexels-photo-20144196.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=300&w=300",
  samir:
    "https://images.pexels.com/photos/27243814/pexels-photo-27243814.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=300&w=300",
  hugo: "https://images.pexels.com/photos/14807440/pexels-photo-14807440.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=300&w=300",
  maya: "https://images.pexels.com/photos/14638899/pexels-photo-14638899.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=300&w=300",
  ines: "https://images.pexels.com/photos/7717254/pexels-photo-7717254.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=300&w=300",
  thomas:
    "https://images.pexels.com/photos/7752811/pexels-photo-7752811.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=300&w=300",
};

export const avatarPresets = [
  { id: "lea", label: "Léa", url: avatars.lea },
  { id: "camille", label: "Camille", url: avatars.camille },
  { id: "samir", label: "Samir", url: avatars.samir },
  { id: "maya", label: "Maya", url: avatars.maya },
  { id: "ines", label: "Inès", url: avatars.ines },
  { id: "hugo", label: "Hugo", url: avatars.hugo },
];

export const pinnedGameMasterPost: FeedPost = {
  id: 999,
  author: "VALUO Master",
  city: "Défi Officiel",
  avatar: "https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=300&w=300",
  photo: media.redPhone,
  caption: "🔥 Défi du jour : « Une touche de rouge ». Repérez un objet, un détail ou une trouvaille qui porte cette couleur et a une histoire. Les 3 photos les plus likées rapportent un bonus de points à votre escouade !",
  time: "Épinglé · 08:00",
  likes: 0,
  liked: false,
  isPinned: true,
  isOfficial: true,
  comments: [],
};
