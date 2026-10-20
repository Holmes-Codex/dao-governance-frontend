import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { TARGET_CHAIN } from "./contracts";

// Optional custom RPC endpoint. Must be a public URL: anything in NEXT_PUBLIC_*
// is shipped to the browser, so never put a secret key in it.
const rpcUrl = process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL?.trim() || undefined;

export const wagmiConfig = createConfig({
  chains: [TARGET_CHAIN],
  // EIP-6963 discovery (on by default) lists every installed browser wallet;
  // the generic injected connector is the fallback for older wallets.
  connectors: [injected()],
  transports: {
    [TARGET_CHAIN.id]: http(rpcUrl, { batch: true }),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
