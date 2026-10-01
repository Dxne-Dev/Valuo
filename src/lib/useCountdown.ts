import { useEffect, useState } from "react";

export type CountdownResult = {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
  formatted: string;
};

/**
 * Calculates countdown details given an ISO date string or timestamp.
 */
export function calculateTimeRemaining(targetIsoDate?: string | null): CountdownResult {
  if (!targetIsoDate) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      isExpired: false,
      formatted: "--:--:--",
    };
  }

  const targetTime = new Date(targetIsoDate).getTime();
  const now = Date.now();
  const diff = targetTime - now;

  if (isNaN(targetTime) || diff <= 0) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      isExpired: true,
      formatted: "00:00:00",
    };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  const formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return {
    hours,
    minutes,
    seconds,
    totalSeconds,
    isExpired: false,
    formatted,
  };
}

/**
 * React Hook for live 1-second countdown ticking.
 */
export function useCountdown(targetIsoDate?: string | null): CountdownResult {
  const [result, setResult] = useState<CountdownResult>(() =>
    calculateTimeRemaining(targetIsoDate)
  );

  useEffect(() => {
    setResult(calculateTimeRemaining(targetIsoDate));

    if (!targetIsoDate) return;

    const interval = setInterval(() => {
      const current = calculateTimeRemaining(targetIsoDate);
      setResult(current);
      if (current.isExpired) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetIsoDate]);

  return result;
}
