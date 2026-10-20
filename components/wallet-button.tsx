"use client";

import { useEffect, useRef, useState } from "react";
import { useConnect, useConnection, useConnectors, useDisconnect } from "wagmi";
import { Button } from "@/components/ui";
import { shortAddress } from "@/lib/format";
import { describeError } from "@/lib/errors";

export function WalletButton() {
  const { address, status } = useConnection();
  const connectors = useConnectors();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (status === "connected" && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden rounded-md border border-border bg-secondary px-2.5 py-1.5 font-mono text-xs sm:inline">
          {shortAddress(address)}
        </span>
        <Button variant="ghost" onClick={() => disconnect.mutate()}>
          Disconnect
        </Button>
      </div>
    );
  }

  // Prefer EIP-6963 discovered wallets; keep the generic injected fallback only when nothing else exists.
  const discovered = connectors.filter((c) => c.id !== "injected");
  const options = discovered.length > 0 ? discovered : connectors;
  const isConnecting = status === "connecting" || status === "reconnecting" || connect.isPending;

  return (
    <div ref={menuRef} className="relative">
      <Button onClick={() => setOpen((v) => !v)} disabled={isConnecting} aria-haspopup="menu" aria-expanded={open}>
        {isConnecting ? "Connecting…" : "Connect wallet"}
      </Button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-border bg-card p-2 shadow-xl"
        >
          <p className="px-2 pb-2 pt-1 text-xs text-muted-foreground">Choose a browser wallet</p>
          {options.map((connector) => (
            <button
              key={connector.uid}
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                connect.mutate({ connector });
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
            >
              {connector.icon ? (
                // eslint-disable-next-line @next/next/no-img-element -- wallet icons are data URIs from EIP-6963
                <img src={connector.icon} alt="" className="size-5 rounded" />
              ) : (
                <span aria-hidden className="size-5 rounded bg-secondary" />
              )}
              {connector.id === "injected" ? "Browser wallet" : connector.name}
            </button>
          ))}
          <p className="px-2 pt-2 text-xs leading-relaxed text-muted-foreground">
            {"No wallet? Install MetaMask, Rabby, or another EIP-1193 browser wallet."}
          </p>
        </div>
      ) : null}
      {connect.error ? (
        <p role="alert" className="absolute right-0 mt-2 w-64 text-right text-xs text-destructive">
          {describeError(connect.error)}
        </p>
      ) : null}
    </div>
  );
}
