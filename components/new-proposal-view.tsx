"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { encodeFunctionData, getAddress, isAddress, parseUnits, type Address, type Hex } from "viem";
import { useConfig, useConnection } from "wagmi";
import { simulateContract, writeContract } from "wagmi/actions";
import { TxStatus } from "@/components/tx-status";
import { Button, Card, CardHeader, Field, Input, Skeleton, Textarea } from "@/components/ui";
import { useTransaction } from "@/hooks/use-transaction";
import { useDaoStatus } from "@/hooks/use-dao-status";
import { executionTargetAbi, governorAbi } from "@/lib/abis";
import { CONTRACTS, TARGET_CHAIN_ID } from "@/lib/contracts";
import { composeDescription } from "@/lib/proposals";
import { formatToken } from "@/lib/format";

type ActionType = "setNumber" | "raw";

export function NewProposalView() {
  const config = useConfig();
  const router = useRouter();
  const { address } = useConnection();
  const status = useDaoStatus();
  const tx = useTransaction();

  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [actionType, setActionType] = useState<ActionType>("setNumber");
  const [targetAddress, setTargetAddress] = useState<string>(CONTRACTS.executionTarget);
  const [newValue, setNewValue] = useState("");
  const [rawCalldata, setRawCalldata] = useState("");
  const [ethValue, setEthValue] = useState("");
  const [redirecting, setRedirecting] = useState(false);

  const proposalThreshold = status.governor.proposalThreshold;

  const trimmedTitle = title.trim();
  const trimmedDetails = details.trim();
  const description = composeDescription(trimmedTitle, trimmedDetails);

  const targetError = (() => {
    const t = targetAddress.trim();
    if (!t) return "Enter a target contract address.";
    if (!isAddress(t.toLowerCase())) return "Enter a valid 0x address.";
    return null;
  })();

  const newValueError = (() => {
    if (actionType !== "setNumber") return null;
    const v = newValue.trim();
    if (v === "") return "Enter a number to set.";
    if (!/^\d+$/.test(v)) return "Enter a non-negative integer.";
    return null;
  })();

  const rawCalldataError = (() => {
    if (actionType !== "raw") return null;
    const c = rawCalldata.trim();
    if (c === "") return "Enter calldata (0x-prefixed hex).";
    if (!/^0x[0-9a-fA-F]*$/.test(c)) return "Calldata must be 0x-prefixed hex.";
    return null;
  })();

  const ethValueError = (() => {
    const v = ethValue.trim();
    if (v === "") return null;
    if (!/^\d+(\.\d+)?$/.test(v)) return "Enter a valid ETH amount.";
    return null;
  })();

  const canSubmit =
    trimmedTitle !== "" &&
    !targetError &&
    !newValueError &&
    !rawCalldataError &&
    !ethValueError &&
    !tx.isBusy &&
    !tx.blocker;

  const targets: Address[] = [getAddress(targetAddress.trim().toLowerCase())];
  const values: bigint[] = [ethValue.trim() ? parseUnits(ethValue.trim(), 18) : 0n];
  const calldatas: Hex[] = [
    actionType === "setNumber"
      ? encodeFunctionData({
          abi: executionTargetAbi,
          functionName: "setNumber",
          args: [BigInt(newValue.trim() || "0")],
        })
      : (rawCalldata.trim() as Hex),
  ];

  function submit() {
    if (!canSubmit) return;
    tx.run(
      async ({ account, markSigning }) => {
        const { request } = await simulateContract(config, {
          address: CONTRACTS.governor,
          abi: governorAbi,
          functionName: "propose",
          args: [targets, values, calldatas, description],
          account,
          chainId: TARGET_CHAIN_ID,
        });
        markSigning();
        return writeContract(config, request);
      },
      async () => {
        setRedirecting(true);
        await status.refetch();
        router.push("/proposals");
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/proposals" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          Proposals
        </Link>
        <span aria-hidden className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">New</span>
      </div>

      <div>
        <h1 className="text-balance text-2xl font-semibold tracking-tight">Create a proposal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit a governance proposal to the DAOGovernor. The transaction is simulated first, so any revert surfaces
          before you spend gas.
        </p>
      </div>

      <EligibilityCard
        threshold={proposalThreshold}
        loading={status.isLoading}
        connected={!!address}
        blocker={tx.blocker}
      />

      <Card>
        <CardHeader title="Proposal details" />
        <div className="flex flex-col gap-4 px-5 py-4">
          <Field label="Title" htmlFor="title" hint="The first line of the proposal description. Keep it concise.">
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Set the ExecutionTarget number to 42"
              maxLength={200}
            />
          </Field>
          <Field label="Details" htmlFor="details" hint="Supporting context. Markdown-style line breaks are preserved.">
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Explain why this proposal should pass…"
              rows={6}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Proposed action"
          description="The contract call that will run if the proposal is queued and executed through the Timelock."
        />
        <div className="flex flex-col gap-4 px-5 py-4">
          <div className="flex gap-2">
            <ActionTab active={actionType === "setNumber"} onClick={() => setActionType("setNumber")}>
              ExecutionTarget.setNumber
            </ActionTab>
            <ActionTab active={actionType === "raw"} onClick={() => setActionType("raw")}>
              Raw calldata
            </ActionTab>
          </div>

          <Field
            label="Target contract address"
            htmlFor="target"
            error={targetError}
            hint={actionType === "setNumber" ? "Defaults to the deployed ExecutionTarget." : undefined}
          >
            <Input
              id="target"
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              className="font-mono"
              spellCheck={false}
              autoComplete="off"
              disabled={actionType === "setNumber"}
            />
          </Field>

          {actionType === "setNumber" ? (
            <Field label="New number" htmlFor="newValue" error={newValueError} hint="A uint256 written to ExecutionTarget.number.">
              <Input
                id="newValue"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="42"
                inputMode="numeric"
                autoComplete="off"
                className="font-mono"
              />
            </Field>
          ) : (
            <Field label="Calldata" htmlFor="rawCalldata" error={rawCalldataError} hint="0x-prefixed hex sent to the target contract.">
              <Input
                id="rawCalldata"
                value={rawCalldata}
                onChange={(e) => setRawCalldata(e.target.value)}
                placeholder="0x..."
                className="font-mono"
                spellCheck={false}
                autoComplete="off"
              />
            </Field>
          )}

          <Field label="ETH value (optional)" htmlFor="ethValue" error={ethValueError} hint="ETH sent with the call. Leave empty for 0.">
            <Input
              id="ethValue"
              value={ethValue}
              onChange={(e) => setEthValue(e.target.value)}
              placeholder="0"
              inputMode="decimal"
              autoComplete="off"
              className="font-mono"
            />
          </Field>

          <div className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Preview</p>
            <p className="mt-1 font-mono break-all">
              {targets[0]} → {actionType === "setNumber" ? `setNumber(${newValue.trim() || "0"})` : rawCalldata.trim() || "0x"}
              {values[0] > 0n ? ` (sending ${ethValue.trim()} ETH)` : ""}
            </p>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        {tx.blocker && tx.phase === "idle" ? <p className="text-sm text-muted-foreground">{tx.blocker}</p> : null}
        <div className="flex items-center gap-3">
          <Button onClick={submit} disabled={!canSubmit}>
            {tx.isBusy ? "Submitting…" : "Submit proposal"}
          </Button>
          <Link href="/proposals">
            <Button variant="ghost">Cancel</Button>
          </Link>
          {redirecting ? <span className="text-sm text-muted-foreground">Proposal submitted — redirecting…</span> : null}
        </div>
        <TxStatus tx={tx} successText="Proposal created. Redirecting to the proposals list…" />
      </div>
    </div>
  );
}

function EligibilityCard({
  threshold,
  loading,
  connected,
  blocker,
}: {
  threshold: bigint | undefined;
  loading: boolean;
  connected: boolean;
  blocker: string | null;
}) {
  return (
    <Card>
      <CardHeader title="Eligibility" description="What you need to create a proposal." />
      <div className="px-5 py-4 text-sm">
        {loading ? (
          <Skeleton className="h-5 w-64" />
        ) : !connected ? (
          <p className="text-muted-foreground">
            Connect a wallet on Arbitrum Sepolia to submit a proposal.
          </p>
        ) : blocker ? (
          <p className="text-muted-foreground">{blocker}</p>
        ) : threshold !== undefined ? (
          <div className="flex flex-col gap-2">
            <p>
              Proposal threshold: <span className="font-mono">{formatToken(threshold)} DGT</span> voting power required.
            </p>
            <p className="text-xs text-muted-foreground">
              ERC20Votes only counts delegated tokens. Delegate your DGT to yourself first, then wait one block for your
              voting power to activate. If your voting power is below the threshold, the Governor will reject the
              proposal with a clear error.
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground">Could not read the proposal threshold.</p>
        )}
      </div>
    </Card>
  );
}

function ActionTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
          : "rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
      }
      aria-pressed={active}
    >
      {children}
    </button>
  );
}
