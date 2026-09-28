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

export const todayChallenge = {
  theme: "Une touche de rouge",
  date: "Jeudi 17 septembre",
  brief: "Photographie un objet rouge qui a déjà vécu. Un détail, une texture, une histoire — avant minuit.",
  remaining: "6 h 24",
};

export const media = {
  mystery:
    "https://images.pexels.com/photos/11430230/pexels-photo-11430230.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1400&w=1000",
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

export const initialPosts: FeedPost[] = [
  {
    id: 1,
    author: "Camille R.",
    city: "Lille",
    avatar: avatars.camille,
    photo: media.radio,
    caption: "Le poste rouge de mon grand-père. Il grésille encore, mais quelle allure.",
    time: "Il y a 18 min",
    likes: 42,
    comments: [
      { id: 11, author: "Léa", avatar: avatars.lea, text: "La couleur est parfaite. Il a vraiment une présence." },
      { id: 12, author: "Hugo", avatar: avatars.hugo, text: "On dirait qu'il va se mettre à parler d'un coup." },
    ],
  },
  {
    id: 2,
    author: "Samir B.",
    city: "Lyon",
    avatar: avatars.samir,
    photo: media.phone,
    caption: "Trouvé ce matin. Exactement la touche de rouge qu'il me fallait.",
    time: "Il y a 36 min",
    likes: 31,
    liked: true,
    comments: [{ id: 21, author: "Maya", avatar: avatars.maya, text: "Le cadran est magnifique." }],
  },
  {
    id: 3,
    author: "Inès K.",
    city: "Paris",
    avatar: avatars.ines,
    photo: media.redPhone,
    caption: "Il n'appelle plus personne, mais il tient encore tout le buffet.",
    time: "Il y a 52 min",
    likes: 58,
    comments: [
      { id: 31, author: "Camille", avatar: avatars.camille, text: "C'est exactement le rouge du défi." },
      { id: 32, author: "Thomas", avatar: avatars.thomas, text: "J'entends déjà la sonnerie." },
    ],
  },
  {
    id: 4,
    author: "Maya L.",
    city: "Nantes",
    avatar: avatars.maya,
    photo: media.camera,
    caption: "Livres rouges, appareil de 1987, et un peu de lumière du soir.",
    time: "Il y a 1 h",
    likes: 24,
    comments: [],
  },
  {
    id: 5,
    author: "Thomas V.",
    city: "Marseille",
    avatar: avatars.thomas,
    photo: media.drapes,
    caption: "Pas un objet, une pièce entière. Le rouge a tout envahi.",
    time: "Il y a 2 h",
    likes: 19,
    comments: [{ id: 51, author: "Inès", avatar: avatars.ines, text: "Cinéma muet, tout de suite." }],
  },
  {
    id: 6,
    author: "Hugo P.",
    city: "Bordeaux",
    avatar: avatars.hugo,
    photo: media.desk,
    caption: "Le téléphone, la lampe, le calendrier. Tout le bureau a pris le thème.",
    time: "Il y a 3 h",
    likes: 16,
    comments: [],
  },
];

export const groupMembers: GroupMember[] = [
  { id: 1, name: "Léa", avatar: avatars.lea, points: 248, change: 38, estimate: null },
  { id: 2, name: "Camille", avatar: avatars.camille, points: 221, change: 22, estimate: 72 },
  { id: 3, name: "Samir", avatar: avatars.samir, points: 186, change: -8, estimate: 49 },
  { id: 4, name: "Marcel", avatar: avatars.hugo, points: 159, change: -12, estimate: 95, isNpc: true },
];

export const weekHistory = [
  { day: "Lun.", object: "Lampe champignon", winner: "Camille", price: 84, image: media.desk },
  { day: "Mar.", object: "Appareil argentique", winner: "Léa", price: 120, image: media.camera },
  { day: "Mer.", object: "Service en faïence", winner: "Samir", price: 46, image: media.dishes },
];
