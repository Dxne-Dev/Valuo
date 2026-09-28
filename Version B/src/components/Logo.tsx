import { Gavel, Sparkles } from "lucide-react";

type LogoProps = {
  compact?: boolean;
  light?: boolean;
};

export default function Logo({ compact = false, light = false }: LogoProps) {
  return (
    <div className="flex items-center gap-3" aria-label="Les Brocanteurs">
      <div
        className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-[14px] ${
          light ? "bg-[#f3c969] text-[#173f35]" : "bg-[#173f35] text-[#f3c969]"
        }`}
      >
        <Gavel size={20} strokeWidth={2.4} />
        <Sparkles className="absolute -right-1 -top-1 text-[#e9683a]" size={13} fill="currentColor" />
      </div>
      {!compact && (
        <div className="leading-none">
          <p className={`font-display text-[21px] font-semibold ${light ? "text-white" : "text-[#173f35]"}`}>
            Les Brocanteurs
          </p>
          <p className={`mt-1 text-[9px] font-bold uppercase tracking-[0.2em] ${light ? "text-white/50" : "text-[#173f35]/45"}`}>
            Le jeu des belles trouvailles
          </p>
        </div>
      )}
    </div>
  );
}