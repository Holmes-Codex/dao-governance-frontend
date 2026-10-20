# DAO Governance Frontend

A lightweight Next.js frontend for the DAO Governance smart contracts deployed on **Arbitrum Sepolia (chain ID 421614)**.

This is a testnet project and is still under development. The frontend must be tested before it is considered ready. It connects to existing contracts and does not deploy, replace, or modify them.

> **Safety:** Testnet only. Never enter a wallet seed phrase or private key into this application, its source code, or its environment variables.

## Current implementation

The repository contains an early frontend implementation, including:

- Responsive dashboard layout and wallet connection components.
- Arbitrum Sepolia network configuration and wrong-network handling.
- Contract address configuration and ABIs.
- Contract status and account-related components.
- Proposal-reading hooks and proposal-related utilities.
- Delegation UI components and transaction-handling utilities.

These components and hooks have not yet been fully validated as an end-to-end dApp. Build checks, contract integration, wallet interactions, governance transactions, and error handling still need to be tested.

## Existing contract deployments

| Contract | Arbitrum Sepolia address |
| --- | --- |
| DAOGovernanceToken (DGT) | `0x8FcDB0BAb4ACbb198A7C3C8D773ffd7Ba7b39956` |
| TimelockController | `0xe980153b81836be6AC5A6ef95C0C64BbF325EEc6` |
| DAOGovernor | `0xB4E7cF3fD3aD5F2Bcb9D62a219f97aF9879738f9` |
| ExecutionTarget | `0x0e99da430D9881aDC58A29fC6FFA9d0EAFBA0909` |

These are existing testnet deployments. Do not redeploy contracts or change their addresses as part of frontend work without explicit authorization.

## Requirements

- Node.js 20.9 or later.
- pnpm 10.
- A browser wallet, such as MetaMask or Rabby, for wallet interactions.

## Local development

Clone this standalone repository:

```bash
git clone https://github.com/Holmes-Codex/dao-governance-frontend.git
cd dao-governance-frontend
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`.

The environment file is optional because defaults are provided. Never commit `.env.local` or any secret credentials.

## Environment variables

All supported `NEXT_PUBLIC_*` variables are public browser configuration, not secret storage.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL` | Optional RPC endpoint override |
| `NEXT_PUBLIC_TOKEN_ADDRESS` | Optional token address override |
| `NEXT_PUBLIC_TIMELOCK_ADDRESS` | Optional timelock address override |
| `NEXT_PUBLIC_GOVERNOR_ADDRESS` | Optional governor address override |
| `NEXT_PUBLIC_EXECUTION_TARGET_ADDRESS` | Optional execution target address override |
| `NEXT_PUBLIC_GOVERNOR_DEPLOY_BLOCK` | Optional starting block for proposal-event discovery |

Never put private keys, seed phrases, or other secrets in `NEXT_PUBLIC_*` variables.

## Validation commands

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Run these checks and test the complete dApp against Arbitrum Sepolia before treating it as ready for use.

## Deployment

For a Vercel deployment, import this repository and use the repository root (`.`) as the Root Directory. Select the Next.js framework and configure the build using the package scripts.

## Scope

This repository contains the frontend only. The Solidity contracts and their tests are maintained separately. Frontend changes must preserve the existing contract deployments and must not modify unrelated repositories or projects.
