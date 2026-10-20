import { getAddress, isAddress, type Address } from "viem";
import { arbitrumSepolia } from "viem/chains";

export const TARGET_CHAIN = arbitrumSepolia;
export const TARGET_CHAIN_ID = arbitrumSepolia.id; // 421614

// Deployed on Arbitrum Sepolia (see DAO-Governance/README.md).
// The TimelockController address is stored in its valid EIP-55 checksum form
// (…6aC5A…); the README spelling (…6AC5A…) is the same address but fails
// checksum validation in viem.
const DEFAULT_ADDRESSES = {
  token: "0x8FcDB0BAb4ACbb198A7C3C8D773ffd7Ba7b39956",
  timelock: "0xe980153b81836be6aC5A6ef95C0C64BbF325EEc6",
  governor: "0xB4E7cF3fD3aD5F2Bcb9D62a219f97aF9879738f9",
  executionTarget: "0x0e99da430D9881aDC58A29fC6FFA9d0EAFBA0909",
} as const satisfies Record<string, Address>;

type ContractKey = keyof typeof DEFAULT_ADDRESSES;

// NEXT_PUBLIC_* values must be referenced literally so Next.js can inline them.
const OVERRIDES: Record<ContractKey, string | undefined> = {
  token: process.env.NEXT_PUBLIC_TOKEN_ADDRESS,
  timelock: process.env.NEXT_PUBLIC_TIMELOCK_ADDRESS,
  governor: process.env.NEXT_PUBLIC_GOVERNOR_ADDRESS,
  executionTarget: process.env.NEXT_PUBLIC_EXECUTION_TARGET_ADDRESS,
};

function resolveAddress(key: ContractKey): Address {
  const override = OVERRIDES[key]?.trim();
  if (!override) return DEFAULT_ADDRESSES[key];
  // Lowercase first so a mis-cased override is normalised instead of rejected.
  if (isAddress(override.toLowerCase())) return getAddress(override.toLowerCase());
  console.warn(`Ignoring invalid address override for "${key}"; using the default.`);
  return DEFAULT_ADDRESSES[key];
}

export const CONTRACTS = {
  token: resolveAddress("token"),
  timelock: resolveAddress("timelock"),
  governor: resolveAddress("governor"),
  executionTarget: resolveAddress("executionTarget"),
} as const;

// Arbitrum Sepolia (L2) block in which the Governor was deployed. Proposal
// discovery scans ProposalCreated events from here. Override this when pointing
// the app at a different Governor deployment.
const DEFAULT_GOVERNOR_DEPLOY_BLOCK = 321_054_531n;

function resolveDeployBlock(): bigint {
  const raw = process.env.NEXT_PUBLIC_GOVERNOR_DEPLOY_BLOCK?.trim();
  if (!raw) return DEFAULT_GOVERNOR_DEPLOY_BLOCK;
  if (/^\d+$/.test(raw)) return BigInt(raw);
  console.warn("Ignoring invalid NEXT_PUBLIC_GOVERNOR_DEPLOY_BLOCK; using the default.");
  return DEFAULT_GOVERNOR_DEPLOY_BLOCK;
}

export const GOVERNOR_DEPLOY_BLOCK = resolveDeployBlock();

export const EXPLORER_URL = "https://sepolia.arbiscan.io";

export function explorerAddressUrl(address: Address) {
  return `${EXPLORER_URL}/address/${address}`;
}

export function explorerTxUrl(hash: `0x${string}`) {
  return `${EXPLORER_URL}/tx/${hash}`;
}
