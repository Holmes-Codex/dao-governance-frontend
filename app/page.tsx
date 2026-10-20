import { ContractStatus } from "@/components/contract-status";
import { PageShell } from "@/components/page-shell";

export default function Home() {
  return (
    <PageShell>
      <ContractStatus />
    </PageShell>
  );
}
