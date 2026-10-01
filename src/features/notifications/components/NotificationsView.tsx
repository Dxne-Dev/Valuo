import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  CheckCheck,
  CornerDownRight,
  Heart,
  MessageCircle,
  PackageOpen,
  ShieldAlert,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { type AppNotification, type NotificationType } from "@/data";

export type NotificationsViewProps = {
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onNotificationClick: (notif: AppNotification) => void;
  onClearAll?: () => void;
};

export type NotifFilter = "all" | "unread" | "social" | "squad" | "game";

export default function NotificationsView({
  notifications,
  onMarkAllAsRead,
  onNotificationClick,
}: NotificationsViewProps) {
  const [filter, setFilter] = useState<NotifFilter>("all");

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifs = useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.read);
    if (filter === "social") return notifications.filter((n) => ["friend", "like", "comment", "reply"].includes(n.type));
    if (filter === "squad") return notifications.filter((n) => n.type === "squad");
    if (filter === "game") return notifications.filter((n) => ["challenge", "mystery", "admin", "system"].includes(n.type));
    return notifications;
  }, [filter, notifications]);

  function getIcon(type: NotificationType) {
    switch (type) {
      case "challenge":
        return <Sparkles size={16} className="text-[#f3c969]" />;
      case "like":
        return <Heart size={16} className="text-[#e9683a] fill-[#e9683a]" />;
      case "comment":
        return <MessageCircle size={16} className="text-[#488262]" />;
      case "reply":
        return <CornerDownRight size={16} className="text-[#e9683a]" />;
      case "friend":
        return <UserPlus size={16} className="text-[#2b6cb0]" />;
      case "squad":
        return <Users size={16} className="text-[#d9582d]" />;
      case "mystery":
        return <PackageOpen size={16} className="text-[#946914]" />;
      case "admin":
      case "system":
        return <ShieldAlert size={16} className="text-[#e9683a]" />;
      default:
        return <Bell size={16} className="text-[#173f35]" />;
    }
  }

  function getBadgeBg(type: NotificationType) {
    switch (type) {
      case "challenge":
        return "bg-[#173f35]";
      case "like":
        return "bg-[#fff0eb]";
      case "comment":
        return "bg-[#edf7f2]";
      case "reply":
        return "bg-[#fff5ef]";
      case "friend":
        return "bg-[#ebf4ff]";
      case "squad":
        return "bg-[#fdf3ec]";
      case "mystery":
        return "bg-[#fbf4db]";
      case "admin":
      case "system":
        return "bg-[#fee2e2]";
      default:
        return "bg-[#f5f0e5]";
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-3xl font-semibold text-[#173f35]">Notifications</h1>
            {unreadCount > 0 && (
              <span className="rounded-full bg-[#e9683a] px-2.5 py-0.5 text-xs font-extrabold text-white">
                {unreadCount} nouvelle{unreadCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#76837c]">
            Historique complet des défis, duels, ajouts d'amis et interactions.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllAsRead}
            className="inline-flex items-center gap-2 rounded-full border border-[#173f35]/15 bg-white px-4 py-2.5 text-xs font-extrabold text-[#173f35] transition hover:bg-[#f5f0e5] hover:border-[#173f35]/30"
          >
            <CheckCheck size={16} className="text-[#488262]" /> Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="mb-6 flex gap-1.5 overflow-x-auto rounded-2xl bg-[#eee8dc] p-1">
        {[
          { id: "all" as const, label: "Toutes" },
          { id: "unread" as const, label: `Non lues (${unreadCount})` },
          { id: "squad" as const, label: "Escouade" },
          { id: "social" as const, label: "Social & Réponses" },
          { id: "game" as const, label: "Défis & Jeu" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
              filter === tab.id
                ? "bg-white text-[#173f35] shadow-sm"
                : "text-[#76837c] hover:text-[#173f35]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Liste des notifications */}
      <div className="space-y-3">
        {filteredNotifs.length === 0 ? (
          <div className="rounded-[24px] border border-[#173f35]/10 bg-white p-10 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#f5f0e5] text-[#76837c]">
              <Bell size={22} />
            </div>
            <p className="mt-3 font-display text-lg font-semibold text-[#173f35]">Aucune notification</p>
            <p className="mt-1 text-xs text-[#76837c]">Vous êtes complètement à jour !</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredNotifs.map((notif, index) => (
              <motion.div
                key={notif.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, delay: index * 0.03 }}
                onClick={() => onNotificationClick(notif)}
                className={`group relative flex cursor-pointer items-start gap-4 rounded-[22px] border p-4 transition ${
                  notif.read
                    ? "border-[#173f35]/8 bg-white hover:border-[#173f35]/20 hover:bg-[#faf7f0]"
                    : "border-[#e9683a]/30 bg-[#fff9f6] shadow-sm hover:border-[#e9683a]/60 hover:bg-[#fff5ef]"
                }`}
              >
                {!notif.read && (
                  <span className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-[#e9683a] ring-4 ring-[#e9683a]/20" />
                )}

                <div className="relative shrink-0">
                  {notif.avatar ? (
                    <img
                      src={notif.avatar}
                      alt=""
                      className="h-12 w-12 rounded-full border-2 border-white object-cover shadow-sm"
                    />
                  ) : (
                    <div
                      className={`grid h-12 w-12 place-items-center rounded-2xl ${getBadgeBg(notif.type)} shadow-sm`}
                    >
                      {getIcon(notif.type)}
                    </div>
                  )}
                  {notif.avatar && (
                    <span
                      className={`absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border-2 border-white ${getBadgeBg(
                        notif.type,
                      )}`}
                    >
                      {getIcon(notif.type)}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1 pr-6">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-[#e9683a]">
                      {notif.title}
                    </p>
                    <span className="text-[11px] text-[#8a958f]">· {notif.time}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold leading-snug text-[#173f35]">
                    {notif.message}
                  </p>
                  <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#488262] transition group-hover:underline">
                    Voir la publication / l'action
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
