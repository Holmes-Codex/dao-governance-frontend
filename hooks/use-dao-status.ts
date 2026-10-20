"use client";

import { zeroAddress } from "viem";
import { useBalance, useReadContracts } from "wagmi";
import { executionTargetAbi, governorAbi, timelockAbi, TIMELOCK_ROLES, tokenAbi } from "@/lib/abis";
import { CONTRACTS, TARGET_CHAIN_ID } from "@/lib/contracts";

const governor = { address: CONTRACTS.governor, abi: governorAbi, chainId: TARGET_CHAIN_ID } as const;
const token = { address: CONTRACTS.token, abi: tokenAbi, chainId: TARGET_CHAIN_ID } as const;
const timelock = { address: CONTRACTS.timelock, abi: timelockAbi, chainId: TARGET_CHAIN_ID } as const;
const target = { address: CONTRACTS.executionTarget, abi: executionTargetAbi, chainId: TARGET_CHAIN_ID } as const;

// All protocol-level reads go out in one multicall request.
export function useDaoStatus() {
  const query = useReadContracts({
    allowFailure: true,
    contracts: [
      { ...governor, functionName: "name" },
      { ...governor, functionName: "votingDelay" },
      { ...governor, functionName: "votingPeriod" },
      { ...governor, functionName: "proposalThreshold" },
      { ...governor, functionName: "quorumNumerator" },
      { ...governor, functionName: "quorumDenominator" },
      { ...governor, functionName: "clock" },
      { ...governor, functionName: "token" },
      { ...governor, functionName: "timelock" },
      { ...token, functionName: "name" },
      { ...token, functionName: "symbol" },
      { ...token, functionName: "totalSupply" },
      { ...timelock, functionName: "getMinDelay" },
      { ...timelock, functionName: "hasRole", args: [TIMELOCK_ROLES.PROPOSER, CONTRACTS.governor] },
      { ...timelock, functionName: "hasRole", args: [TIMELOCK_ROLES.CANCELLER, CONTRACTS.governor] },
      { ...timelock, functionName: "hasRole", args: [TIMELOCK_ROLES.EXECUTOR, zeroAddress] },
      { ...target, functionName: "number" },
      { ...target, functionName: "owner" },
    ],
  });

  const targetBalance = useBalance({ address: CONTRACTS.executionTarget, chainId: TARGET_CHAIN_ID });

  const r = query.data;
  const value = <T,>(i: number) => (r?.[i]?.status === "success" ? (r[i].result as T) : undefined);

  const clock = value<number>(6);
  const quorumNumerator = value<bigint>(4);
  const quorumDenominator = value<bigint>(5);
  const totalSupply = value<bigint>(11);

  return {
    isLoading: query.isLoading,
    isError: query.isError,
    failedReads: r?.filter((x) => x.status === "failure").length ?? 0,
    refetch: () => Promise.all([query.refetch(), targetBalance.refetch()]),
    isFetching: query.isFetching || targetBalance.isFetching,
    governor: {
      name: value<string>(0),
      votingDelay: value<bigint>(1),
      votingPeriod: value<bigint>(2),
      proposalThreshold: value<bigint>(3),
      quorumNumerator,
      quorumDenominator,
      clock: clock === undefined ? undefined : BigInt(clock),
      tokenAddress: value<`0x${string}`>(7),
      timelockAddress: value<`0x${string}`>(8),
      // Live quorum is computed on-chain from past total supply at the proposal snapshot.
      // This estimate uses current total supply (fixed: no mint function exists after deployment).
      estimatedQuorum:
        totalSupply !== undefined && quorumNumerator !== undefined && quorumDenominator
          ? (totalSupply * quorumNumerator) / quorumDenominator
          : undefined,
    },
    token: { name: value<string>(9), symbol: value<string>(10), totalSupply },
    timelock: {
      minDelay: value<bigint>(12),
      governorIsProposer: value<boolean>(13),
      governorIsCanceller: value<boolean>(14),
      openExecutor: value<boolean>(15),
    },
    target: {
      number: value<bigint>(16),
      owner: value<`0x${string}`>(17),
      balance: targetBalance.data?.value,
    },
  };
}

export type DaoStatus = ReturnType<typeof useDaoStatus>;
