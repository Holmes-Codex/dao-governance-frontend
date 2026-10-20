import { Badge, Card, CardHeader, Skeleton } from "@/components/ui";

export default function ProposalDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Proposals</span>
        <span aria-hidden className="text-muted-foreground">/</span>
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-72" />
        <Badge tone="neutral">Loading</Badge>
      </div>
      <Card>
        <CardHeader title="Loading proposal…" />
        <div className="px-5 py-6">
          <Skeleton className="h-4 w-full" />
        </div>
      </Card>
    </div>
  );
}
