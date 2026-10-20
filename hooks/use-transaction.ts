"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Address, Hash, TransactionReceipt } from "viem";
import { useConfig, useConnection } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { TARGET_CHAIN, TARGET_CHAIN_ID } from "@/lib/contracts";
import { describeError } from "@/lib/errors";

export type TxPhase = "idle" | "simulating" | "signing" | "pending" | "confirmed" | "failed";

export type TxState = { phase: TxPhase; hash?: Hash; error?: string };

type SendHelpers = {
  account: Address;
  // Call after simulation succeeds, right before asking the wallet to sign.
  markSigning: () => void;
};

// Shared transaction flow: simulate → wallet signature → pending → confirmed
// or failed. Callers simulate first so reverts surface before any gas is spent.
export function useTransaction() {
  const config = useConfig();
  const queryClient = useQueryClient();
  const { address, chainId, status } = useConnection();
  const [state, setState] = useState<TxState>({ phase: "idle" });

  const blocker =
    status !== "connected" || !address
      ? "Connect a wallet to continue."
      : chainId !== TARGET_CHAIN_ID
        ? `Switch your wallet to ${TARGET_CHAIN.name} to continue.`
        : null;

  async function run(
    send: (helpers: SendHelpers) => Promise<Hash>,
    onConfirmed?: (receipt: TransactionReceipt) => void,
  ) {
    if (blocker || !address) {
      setState({ phase: "failed", error: blocker ?? "Connect a wallet to continue." });
      return;
    }
    let hash: Hash | undefined;
    setState({ phase: "simulating" });
    try {
      hash = await send({ account: address, markSigning: () => setState({ phase: "signing" }) });
      setState({ phase: "pending", hash });
      const receipt = await waitForTransactionReceipt(config, { hash, chainId: TARGET_CHAIN_ID });
      if (receipt.status !== "success") {
        setState({ phase: "failed", hash, error: "The transaction was mined but reverted." });
        return;
      }
      setState({ phase: "confirmed", hash });
      // Refresh every on-chain read (balances, votes, proposal state, list).
      await queryClient.invalidateQueries();
      onConfirmed?.(receipt);
    } catch (error) {
      setState({ phase: "failed", hash, error: describeError(error) });
    }
  }

  return {
    ...state,
    blocker,
    isBusy: state.phase === "simulating" || state.phase === "signing" || state.phase === "pending",
    run,
    reset: () => setState({ phase: "idle" }),
  };
}

export type Transaction = ReturnType<typeof useTransaction>;
