import { Bell, Camera, Home, LogOut, PackageOpen, Trophy, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import { avatars } from "../data";
import Logo from "./Logo";

export type Tab = "feed" | "game" | "group" | "profile";

const navItems = [
  { id: "feed" as const, label: "Feed", icon: Home },
  { id: "game" as const, label: "Mystery Box", icon: PackageOpen },
  { id: "group" as const, label: "Mon groupe", icon: Trophy },
  { id: "profile" as const, label: "Mon profil", icon: UserRound },
];

type NavigationProps = {
  active: Tab;
  onNavigate: (tab: Tab) => void;
  onLogout: () => void;
};

export function DesktopNavigation({ active, onNavigate, onLogout }: NavigationProps) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-[#173f35]/10 bg-[#f5f0e5] px-6 py-7 lg:flex">
      <Logo />

      <nav className="mt-12 space-y-1.5" aria-label="Navigation principale">
        {navItems.map((item) => {
          const Icon = item.icon;
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`relative flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-colors ${
                selected ? "text-white" : "text-[#506158] hover:bg-white/70 hover:text-[#173f35]"
              }`}
            >
              {selected && (
                <motion.span
                  layoutId="desktop-nav"
                  className="absolute inset-0 rounded-2xl bg-[#173f35] shadow-[0_10px_24px_-12px_rgba(23,63,53,.7)]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon className="relative" size={19} strokeWidth={2.2} />
              <span className="relative">{item.label}</span>
              {item.id === "game" && (
                <span className="relative ml-auto h-2 w-2 rounded-full bg-[#e9683a] ring-4 ring-[#e9683a]/15" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-8 border-t border-[#173f35]/10 pt-7">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-[#76837c]">
          <span>Semaine 38</span>
          <span>Jour 4/6</span>
        </div>
        <div className="mt-3 flex gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((day) => (
            <span
              key={day}
              className={`h-1.5 flex-1 rounded-full ${day <= 3 ? "bg-[#e9683a]" : "bg-[#173f35]/10"}`}
            />
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[#76837c]">Encore 2 objets avant le verdict du groupe.</p>
      </div>

      <div className="mt-auto flex items-center gap-3 border-t border-[#173f35]/10 pt-5">
        <img src={avatars.lea} alt="Léa Martin" className="h-10 w-10 rounded-full object-cover" />
        <button type="button" onClick={() => onNavigate("profile")} className="min-w-0 text-left">
          <p className="truncate text-sm font-bold text-[#173f35]">Léa Martin</p>
          <p className="text-xs text-[#76837c]">Bordeaux</p>
        </button>
        <button
          type="button"
          onClick={onLogout}
          aria-label="Se déconnecter"
          className="ml-auto rounded-full p-2 text-[#76837c] transition hover:bg-white hover:text-[#e9683a]"
        >
          <LogOut size={17} />
        </button>
      </div>
    </aside>
  );
}

export function MobileHeader({ onOpenCamera }: { onOpenCamera: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#173f35]/8 bg-[#fbf8f1]/90 px-5 py-3 backdrop-blur-xl lg:hidden">
      <Logo compact />
      <p className="font-display text-[20px] font-semibold text-[#173f35]">Les Brocanteurs</p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onOpenCamera}
          aria-label="Publier une photo"
          className="rounded-full p-2 text-[#173f35] transition hover:bg-[#efe7d8]"
        >
          <Camera size={19} />
        </button>
        <button type="button" aria-label="Notifications" className="relative rounded-full p-2 text-[#173f35] transition hover:bg-[#efe7d8]">
          <Bell size={19} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#e9683a]" />
        </button>
      </div>
    </header>
  );
}

export function MobileNavigation({ active, onNavigate }: Omit<NavigationProps, "onLogout">) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#173f35]/10 bg-[#fbf8f1]/95 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden" aria-label="Navigation mobile">
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
              {selected && <motion.span layoutId="mobile-nav" className="absolute -top-2 h-0.5 w-8 rounded-full bg-[#e9683a]" />}
              <Icon size={20} strokeWidth={selected ? 2.5 : 2} />
              <span>{item.label.replace("Mon ", "")}</span>
              {item.id === "game" && !selected && <span className="absolute right-3 top-1 h-1.5 w-1.5 rounded-full bg-[#e9683a]" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}