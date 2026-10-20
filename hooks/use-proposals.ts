"use client";

import { useQuery } from "@tanstack/react-query";
import { zeroAddress, type Address } from "viem";
import { useBlock, usePublicClient, useReadContracts } from "wagmi";
import { governorAbi } from "@/lib/abis";
import { CONTRACTS, GOVERNOR_DEPLOY_BLOCK, TARGET_CHAIN_ID } from "@/lib/contracts";
import { fetchProposals } from "@/lib/proposals";

const governor = { address: CONTRACTS.governor, abi: governorAbi, chainId: TARGET_CHAIN_ID } as const;

export function useProposals() {
  const client = usePublicClient({ chainId: TARGET_CHAIN_ID });
  return useQuery({
    queryKey: ["proposals", CONTRACTS.governor, GOVERNOR_DEPLOY_BLOCK.toString()],
    queryFn: () => fetchProposals(client!),
    enabled: Boolean(client),
    staleTime: 60_000,
  });
}

// State and vote totals for many proposals in one multicall.
export function useProposalSummaries(ids: readonly bigint[]) {
  const query = useReadContracts({
    allowFailure: true,
    contracts: ids.flatMap((id) => [
      { ...governor, functionName: "state", args: [id] } as const,
      { ...governor, functionName: "proposalVotes", args: [id] } as const,
    ]),
    query: { enabled: ids.length > 0 },
  });

  const summaries = new Map<bigint, { state?: number; votes?: readonly [bigint, bigint, bigint] }>();
  ids.forEach((id, i) => {
    const state = query.data?.[i * 2];
    const votes = query.data?.[i * 2 + 1];
    summaries.set(id, {
      state: state?.status === "success" ? Number(state.result) : undefined,
      votes: votes?.status === "success" ? (votes.result as readonly [bigint, bigint, bigint]) : undefined,
    });
  });
  return { summaries, isLoading: query.isLoading, refetch: query.refetch, isFetching: query.isFetching };
}

// Full live state for a single proposal, plus the connected account's vote data.
export function useProposalOnchain(id: bigint | undefined, account?: Address) {
  const proposalId = id ?? 0n;
  const voter = account ?? zeroAddress;

  const base = useReadContracts({
    allowFailure: true,
    contracts: [
      { ...governor, functionName: "state", args: [proposalId] },
      { ...governor, functionName: "proposalVotes", args: [proposalId] },
      { ...governor, functionName: "proposalSnapshot", args: [proposalId] },
      { ...governor, functionName: "proposalDeadline", args: [proposalId] },
      { ...governor, functionName: "proposalEta", args: [proposalId] },
      { ...governor, functionName: "proposalNeedsQueuing", args: [proposalId] },
      { ...governor, functionName: "clock" },
      { ...governor, functionName: "hasVoted", args: [proposalId, voter] },
    ],
    query: { enabled: id !== undefined },
  });

  const r = base.data;
  const value = <T>(i: number) => (r?.[i]?.status === "success" ? (r[i].result as T) : undefined);

  const snapshot = value<bigint>(2);
  const clockRaw = value<number>(6);
  const clock = clockRaw === undefined ? undefined : BigInt(clockRaw);
  // quorum() and getVotes() revert for timepoints that are not yet in the past.
  const snapshotIsPast = snapshot !== undefined && clock !== undefined && snapshot < clock;

  const past = useReadContracts({
    allowFailure: true,
    contracts: [
      { ...governor, functionName: "quorum", args: [snapshot ?? 0n] },
      { ...governor, functionName: "getVotes", args: [voter, snapshot ?? 0n] },
    ],
    query: { enabled: snapshotIsPast },
  });

  // Latest Arbitrum block timestamp: the same clock the Timelock checks.
  const block = useBlock({ chainId: TARGET_CHAIN_ID, query: { staleTime: 30_000 } });

  const votes = value<readonly [bigint, bigint, bigint]>(1);
  const pastValue = <T>(i: number) =>
    past.data?.[i]?.status === "success" ? (past.data[i].result as T) : undefined;

  return {
    isLoading: base.isLoading,
    isError: base.isError,
    isFetching: base.isFetching || past.isFetching || block.isFetching,
    refetch: () => Promise.all([base.refetch(), past.refetch(), block.refetch()]),
    state: value<number>(0),
    votes: votes ? { against: votes[0], for: votes[1], abstain: votes[2] } : undefined,
    snapshot,
    deadline: value<bigint>(3),
    eta: value<bigint>(4),
    needsQueuing: value<boolean>(5),
    clock,
    hasVoted: account ? value<boolean>(7) : undefined,
    snapshotIsPast,
    quorum: snapshotIsPast ? pastValue<bigint>(0) : undefined,
    votingPower: snapshotIsPast && account ? pastValue<bigint>(1) : undefined,
    nowSeconds: block.data?.timestamp,
  };
}

export type ProposalOnchain = ReturnType<typeof useProposalOnchain>;
