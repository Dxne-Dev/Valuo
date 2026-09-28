type LogoProps = {
  compact?: boolean;
  light?: boolean;
  /** Badge size override in px. Defaults: 52 when compact, 48 when full */
  size?: number;
};

export default function Logo({ compact = false, light = false, size }: LogoProps) {
  const badgeSize = size ?? (compact ? 52 : 48);

  return (
    <div className="flex items-center gap-3" aria-label="VALUO">
      <div
        className="relative shrink-0 flex items-center justify-center"
        style={{ width: badgeSize, height: badgeSize }}
      >
        <img
          src="/V_logo_palette_transparent.png"
          alt="VALUO"
          className="h-full w-full object-contain drop-shadow-sm transition duration-300 hover:scale-105"
        />
      </div>
      {!compact && (
        <div className="leading-none">
          <p className={`font-logo text-[30px] font-normal tracking-wide leading-none ${light ? "text-white" : "text-[#173f35]"}`}>
            VALUO
          </p>
          <p className={`mt-1 text-[9px] font-bold uppercase tracking-[0.2em] ${light ? "text-white/50" : "text-[#173f35]/45"}`}>
            Snap · Estime · Triomphe
          </p>
        </div>
      )}
    </div>
  );
}