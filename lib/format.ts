import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatUnits, zeroAddress, type Address } from "viem";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortAddress(address?: Address | null) {
  if (!address) return "—";
  if (address === zeroAddress) return "None";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatToken(value?: bigint, decimals = 18, maxFraction = 2) {
  if (value === undefined) return "—";
  const [whole, fraction = ""] = formatUnits(value, decimals).split(".");
  const grouped = BigInt(whole).toLocaleString("en-US");
  const trimmed = fraction.slice(0, maxFraction).replace(/0+$/, "");
  return trimmed ? `${grouped}.${trimmed}` : grouped;
}

export function formatDuration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "0s";
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const parts = [
    days && `${days}d`,
    hours && `${hours}h`,
    minutes && `${minutes}m`,
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : `${Math.round(totalSeconds)}s`;
}

// The Governor uses block-number clock mode. On Arbitrum, `block.number`
// returns an approximation of the Ethereum L1 block number, so governance
// timing advances at roughly L1 speed (~12 s per block), not at L2 speed.
export const APPROX_SECONDS_PER_CLOCK_BLOCK = 12;

export function blocksToApproxDuration(blocks?: bigint) {
  if (blocks === undefined) return "—";
  return `~${formatDuration(Number(blocks) * APPROX_SECONDS_PER_CLOCK_BLOCK)}`;
}

// Estimates the wall-clock time of a Governor clock block, relative to a
// reference timestamp (normally the latest Arbitrum block timestamp).
export function estimateClockBlockTime(targetBlock: bigint, currentClock: bigint, nowSeconds: bigint) {
  return nowSeconds + (targetBlock - currentClock) * BigInt(APPROX_SECONDS_PER_CLOCK_BLOCK);
}

export function formatDateTime(unixSeconds: bigint) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(Number(unixSeconds) * 1000),
  );
}

export function formatRelative(targetSeconds: bigint, nowSeconds: bigint) {
  const delta = Number(targetSeconds - nowSeconds);
  if (Math.abs(delta) < 60) return "now";
  const duration = formatDuration(Math.abs(delta));
  return delta > 0 ? `in ${duration}` : `${duration} ago`;
}

export function shortId(id: bigint) {
  const text = id.toString();
  return text.length > 12 ? `${text.slice(0, 6)}…${text.slice(-4)}` : text;
}
