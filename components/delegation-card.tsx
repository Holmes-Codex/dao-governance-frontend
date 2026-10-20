"use client";

import { useState } from "react";
import { getAddress, isAddress, zeroAddress, type Address } from "viem";
import { useConfig, useConnection, useReadContract } from "wagmi";
import { simulateContract, writeContract } from "wagmi/actions";
import { TxStatus } from "@/components/tx-status";
import { Button, Card, CardHeader, Field, Input } from "@/components/ui";
import { useTransaction } from "@/hooks/use-transaction";
import { tokenAbi } from "@/lib/abis";
import { CONTRACTS, TARGET_CHAIN_ID } from "@/lib/contracts";
import { shortAddress } from "@/lib/format";

export function DelegationCard() {
  const config = useConfig();
  const { address } = useConnection();
  const tx = useTransaction();
  const [input, setInput] = useState("");

  const { data: currentDelegate } = useReadContract({
    address: CONTRACTS.token,
    abi: tokenAbi,
    chainId: TARGET_CHAIN_ID,
    functionName: "delegates",
    args: [address ?? zeroAddress],
    query: { enabled: Boolean(address) },
  });

  const trimmed = input.trim();
  const inputError =
    trimmed === ""
      ? null
      : !isAddress(trimmed.toLowerCase())
        ? "Enter a valid 0x address."
        : getAddress(trimmed.toLowerCase()) === zeroAddress
          ? "Delegating to the zero address removes your voting power."
          : null;

  const isSelfDelegated = !!address && currentDelegate?.toLowerCase() === address.toLowerCase();

  function delegateTo(delegatee: Address) {
    tx.run(async ({ account, markSigning }) => {
      const { request } = await simulateContract(config, {
        address: CONTRACTS.token,
        abi: tokenAbi,
        functionName: "delegate",
        args: [delegatee],
        account,
        chainId: TARGET_CHAIN_ID,
      });
      markSigning();
      return writeContract(config, request);
    });
  }

  return (
    <Card>
      <CardHeader
        title="Delegate voting power"
        description="DGT only counts as votes after it is delegated. Delegate to yourself to vote directly, or to someone you trust."
      />
      <div className="flex flex-col gap-4 px-5 py-4">
        <p className="text-xs text-muted-foreground">
          {"Current delegate: "}
          <span className="font-mono text-foreground">
            {!address ? "—" : currentDelegate === undefined ? "…" : shortAddress(currentDelegate)}
          </span>
        </p>

        <Button
          onClick={() => address && delegateTo(address)}
          disabled={!address || tx.isBusy || isSelfDelegated || !!tx.blocker}
        >
          {isSelfDelegated ? "Already self-delegated" : "Delegate to myself"}
        </Button>

        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!inputError && trimmed) delegateTo(getAddress(trimmed.toLowerCase()));
          }}
        >
          <Field label="Or delegate to another address" htmlFor="delegatee" error={inputError}>
            <Input
              id="delegatee"
              placeholder="0x…"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              aria-invalid={Boolean(inputError)}
              aria-describedby={inputError ? "delegatee-error" : undefined}
              className="font-mono"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          <Button
            type="submit"
            variant="secondary"
            disabled={!trimmed || !!inputError || tx.isBusy || !!tx.blocker}
          >
            Delegate
          </Button>
        </form>

        {tx.blocker && tx.phase === "idle" ? <p className="text-xs text-muted-foreground">{tx.blocker}</p> : null}
        <TxStatus
          tx={tx}
          successText="Delegation confirmed. New voting power applies to proposals created from the next block."
        />
      </div>
    </Card>
  );
}
