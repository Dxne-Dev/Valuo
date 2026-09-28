import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Camera,
  CheckCheck,
  ChevronRight,
  Crown,
  Heart,
  Home,
  LogOut,
  MessageCircle,
  PackageOpen,
  Sparkles,
  Trophy,
  UserPlus,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import {
  type AppNotification,
  avatars,
  type NotificationType,
  type UserProfile,
} from "../data";
import Logo from "./Logo";

export type Tab = "feed" | "game" | "group" | "profile" | "notifications" | "admin";

const navItems = [
  { id: "feed" as const, label: "Feed", icon: Home },
  { id: "game" as const, label: "Mystery Box", icon: PackageOpen },
  { id: "group" as const, label: "Mon escouade", icon: Trophy },
  { id: "profile" as const, label: "Mon profil", icon: UserRound },
];

type NavigationProps = {
  active: Tab;
  profile?: UserProfile;
  notifications: AppNotification[];
  isAdmin?: boolean;
  dayNumber?: number;
  weekNumber?: number;
  cycleMessage?: string;
  onNavigate: (tab: Tab) => void;
  onLogout: () => void;
  onMarkAllAsRead: () => void;
  onNotificationClick: (notif: AppNotification) => void;
};

export function DesktopNavigation({
  active,
  profile,
  notifications,
  isAdmin = true,
  dayNumber = 1,
  weekNumber = 38,
  cycleMessage = "Élimination de l'escouade samedi à 20 h.",
  onNavigate,
  onLogout,
  onMarkAllAsRead,
  onNotificationClick,
}: NavigationProps) {

  const [isHovered, setIsHovered] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const currentAvatar = profile?.avatar || avatars.lea;
  const currentName = profile?.name || "Chasseur VALUO";
  const currentCity = profile?.city || "France";

  const unreadCount = notifications.filter((n) => !n.read).length;
  const recentNotifs = notifications.slice(0, 4);

  function getNotifIcon(type: NotificationType) {
    switch (type) {
      case "challenge":
        return <Sparkles size={14} className="text-[#f3c969]" />;
      case "like":
        return <Heart size={14} className="text-[#e9683a] fill-[#e9683a]" />;
      case "comment":
        return <MessageCircle size={14} className="text-[#488262]" />;
      case "friend":
        return <UserPlus size={14} className="text-[#2b6cb0]" />;
      case "mystery":
        return <PackageOpen size={14} className="text-[#946914]" />;
      default:
        return <Bell size={14} className="text-[#173f35]" />;
    }
  }

  function getNotifBg(type: NotificationType) {
    switch (type) {
      case "challenge":
        return "bg-[#173f35]";
      case "like":
        return "bg-[#fff0eb]";
      case "comment":
        return "bg-[#edf7f2]";
      case "friend":
        return "bg-[#ebf4ff]";
      case "mystery":
        return "bg-[#fbf4db]";
      default:
        return "bg-[#f5f0e5]";
    }
  }

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setNotifOpen(false);
      }}
      className={`sticky top-0 z-40 hidden h-screen shrink-0 flex-col border-r border-[#173f35]/10 bg-[#f5f0e5] py-7 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] lg:flex ${
        isHovered ? "w-[268px] px-6 shadow-2xl" : "w-[78px] px-3.5"
      }`}
    >
      {/* Header Logo */}
      <div className="flex items-center overflow-hidden">
        {isHovered ? (
          <Logo />
        ) : (
          <div className="mx-auto">
            <Logo compact />
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="mt-10 space-y-2" aria-label="Navigation principale">
        {navItems.map((item) => {
          const Icon = item.icon;
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              title={!isHovered ? item.label : undefined}
              className={`relative flex w-full items-center rounded-2xl py-3.5 text-sm font-semibold transition-colors ${
                isHovered ? "gap-3 px-4" : "justify-center px-0"
              } ${selected ? "text-white" : "text-[#506158] hover:bg-white/70 hover:text-[#173f35]"}`}
            >
              {selected && (
                <motion.span
                  layoutId="desktop-nav"
                  className="absolute inset-0 rounded-2xl bg-[#173f35] shadow-[0_10px_24px_-12px_rgba(23,63,53,.7)]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon className="relative shrink-0" size={20} strokeWidth={2.2} />
              {isHovered && (
                <span className="relative truncate whitespace-nowrap">{item.label}</span>
              )}
              {item.id === "game" && (
                <span
                  className={`relative h-2 w-2 shrink-0 rounded-full bg-[#e9683a] ring-4 ring-[#e9683a]/15 ${
                    isHovered ? "ml-auto" : "absolute right-2 top-2"
                  }`}
                />
              )}
            </button>
          );
        })}

        {/* Bouton Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen(!notifOpen)}
            title={!isHovered ? "Notifications" : undefined}
            className={`relative flex w-full items-center rounded-2xl py-3.5 text-sm font-semibold transition-colors ${
              isHovered ? "gap-3 px-4" : "justify-center px-0"
            } ${
              active === "notifications" || notifOpen
                ? "bg-white text-[#173f35] shadow-sm"
                : "text-[#506158] hover:bg-white/70 hover:text-[#173f35]"
            }`}
          >
            <div className="relative shrink-0">
              <Bell size={20} strokeWidth={2.2} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#e9683a] px-1 text-[9px] font-extrabold text-white ring-2 ring-[#f5f0e5]">
                  {unreadCount}
                </span>
              )}
            </div>
            {isHovered && (
              <>
                <span className="truncate whitespace-nowrap">Notifications</span>
                {unreadCount > 0 && (
                  <span className="ml-auto rounded-full bg-[#e9683a] px-2 py-0.5 text-[10px] font-extrabold text-white">
                    {unreadCount}
                  </span>
                )}
              </>
            )}
          </button>

          {/* Popover Notifications Desktop */}
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, x: 12, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 8, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className={`fixed top-[60px] z-[80] flex w-[370px] flex-col rounded-[26px] border border-[#173f35]/12 bg-white p-4 shadow-[0_24px_70px_-20px_rgba(23,63,53,.35)] transition-[left] duration-300 ${
                  isHovered ? "left-[284px]" : "left-[94px]"
                }`}
                style={{ maxHeight: "calc(100vh - 80px)" }}
              >
                <div className="flex shrink-0 items-center justify-between border-b border-[#173f35]/8 pb-3">
                  <div className="flex items-center gap-2">
                    <Bell size={17} className="text-[#e9683a]" />
                    <h3 className="font-display text-base font-semibold text-[#173f35]">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-[#e9683a] px-2 py-0.5 text-[10px] font-bold text-white">
                        {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkAllAsRead();
                      }}
                      className="flex items-center gap-1 text-[11px] font-bold text-[#488262] hover:underline"
                    >
                      <CheckCheck size={14} /> Tout lire
                    </button>
                  )}
                </div>

                <div className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-1" style={{ scrollbarWidth: "thin" }}>
                  {recentNotifs.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        setNotifOpen(false);
                        onNotificationClick(notif);
                      }}
                      className={`group flex cursor-pointer items-start gap-3 rounded-2xl p-2.5 transition ${
                        notif.read ? "bg-white hover:bg-[#fbf8f1]" : "bg-[#fff7f2] hover:bg-[#ffefe5]"
                      }`}
                    >
                      <div className="relative shrink-0 mt-0.5">
                        {notif.avatar ? (
                          <img src={notif.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className={`grid h-9 w-9 place-items-center rounded-xl ${getNotifBg(notif.type)}`}>
                            {getNotifIcon(notif.type)}
                          </div>
                        )}
                        {!notif.read && (
                          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#e9683a] ring-2 ring-white" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="truncate text-xs font-extrabold text-[#173f35]">
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-[#8a958f] shrink-0">{notif.time}</span>
                        </div>
                        <p className="line-clamp-2 mt-0.5 text-xs text-[#506158] leading-tight">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 shrink-0 border-t border-[#173f35]/8 pt-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setNotifOpen(false);
                      onNavigate("notifications");
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#f5f0e5] py-2.5 text-xs font-extrabold text-[#173f35] transition hover:bg-[#ebe3d3]"
                  >
                    Voir toutes les notifications ({notifications.length}) <ChevronRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bouton Espace Admin */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setNotifOpen(false);
              onNavigate("admin");
            }}
            title={!isHovered ? "Admin / Game Master" : undefined}
            className={`relative flex w-full items-center rounded-2xl py-3.5 text-sm font-semibold transition-colors ${
              isHovered ? "gap-3 px-4" : "justify-center px-0"
            } ${
              active === "admin"
                ? "bg-[#173f35] text-[#f3c969] shadow-sm"
                : "text-[#506158] hover:bg-white/70 hover:text-[#173f35]"
            }`}
          >
            <Crown size={20} className="shrink-0 text-[#f3c969]" />
            {isHovered && (
              <span className="truncate whitespace-nowrap text-sm font-semibold">
                Game Master
              </span>
            )}
          </button>
        )}
      </nav>

      {/* Barre de progression (Semaine) */}
      <div className="mt-8 border-t border-[#173f35]/10 pt-6 overflow-hidden">
        {isHovered ? (
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-[#76837c]">
              <span>Semaine {weekNumber}</span>
              <span>Jour {dayNumber}/6</span>
            </div>
            <div className="mt-2.5 flex gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((day) => (
                <span
                  key={day}
                  className={`h-1.5 flex-1 rounded-full ${day < dayNumber ? "bg-[#e9683a]" : "bg-[#173f35]/10"}`}
                />
              ))}
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-[#76837c]">
              {cycleMessage}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-[#76837c]">J{dayNumber}/6</span>
            <div className="h-1.5 w-8 rounded-full bg-[#e9683a]" />
          </div>
        )}
      </div>

      {/* Profil Utilisateur (Bas de sidebar) */}
      <div
        className={`mt-auto flex items-center border-t border-[#173f35]/10 pt-5 ${
          isHovered ? "gap-3" : "justify-center"
        }`}
      >
        <img
          src={currentAvatar}
          alt={currentName}
          className="h-10 w-10 shrink-0 cursor-pointer rounded-full object-cover transition hover:scale-105"
          onClick={() => onNavigate("profile")}
        />
        {isHovered && (
          <>
            <button
              type="button"
              onClick={() => onNavigate("profile")}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate text-sm font-bold text-[#173f35]">{currentName}</p>
              <p className="truncate text-xs text-[#76837c]">{currentCity}</p>
            </button>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Se déconnecter"
              className="rounded-full p-2 text-[#76837c] transition hover:bg-white hover:text-[#e9683a]"
            >
              <LogOut size={17} />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

export function MobileHeader({
  notifications = [],
  onOpenCamera,
  onOpenNotifications,
  onOpenAdmin,
}: {
  notifications?: AppNotification[];
  onOpenCamera: () => void;
  onOpenNotifications: () => void;
  onOpenAdmin?: () => void;
}) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#173f35]/8 bg-[#fbf8f1]/90 px-5 py-3 backdrop-blur-xl lg:hidden">
      <Logo size={40} />
      <div className="flex items-center gap-1">
        {onOpenAdmin && (
          <button
            type="button"
            onClick={onOpenAdmin}
            aria-label="Espace Admin Game Master"
            className="rounded-full p-2 text-[#173f35] transition hover:bg-[#efe7d8]"
          >
            <Crown size={19} className="text-[#e9683a]" />
          </button>
        )}
        <button
          type="button"
          onClick={onOpenCamera}
          aria-label="Publier une photo"
          className="rounded-full p-2 text-[#173f35] transition hover:bg-[#efe7d8]"
        >
          <Camera size={19} />
        </button>
        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label="Notifications"
          className="relative rounded-full p-2 text-[#173f35] transition hover:bg-[#efe7d8]"
        >
          <Bell size={19} />
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#e9683a]" />
          )}
        </button>
      </div>
    </header>
  );
}

export function MobileNavigation({
  active,
  onNavigate,
}: Omit<NavigationProps, "onLogout" | "onMarkAllAsRead" | "onNotificationClick" | "notifications">) {

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#173f35]/10 bg-[#fbf8f1]/95 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden"
      aria-label="Navigation mobile"
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`relative flex min-w-[66px] flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-bold transition-colors ${
                selected ? "text-[#e9683a]" : "text-[#76837c]"
              }`}
            >
              {selected && (
                <motion.span
                  layoutId="mobile-nav"
                  className="absolute -top-2 h-0.5 w-8 rounded-full bg-[#e9683a]"
                />
              )}
              <Icon size={20} strokeWidth={selected ? 2.5 : 2} />
              <span>{item.label.replace("Mon ", "")}</span>
              {item.id === "game" && !selected && (
                <span className="absolute right-3 top-1 h-1.5 w-1.5 rounded-full bg-[#e9683a]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}