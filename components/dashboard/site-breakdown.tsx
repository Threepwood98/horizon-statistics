import { Badge } from "@/components/ui/badge";

interface SiteData {
  name: string;
  total: number;
}

interface SiteBreakdownProps {
  data: SiteData[];
}

export function SiteBreakdown({ data }: SiteBreakdownProps) {
  const maxSite = Math.max(...data.map((s) => s.total));

  return (
    <div className="space-y-4">
      {data.map((site) => (
        <div key={site.name}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span>{site.name}</span>
            <Badge variant="secondary" className="font-mono">
              ${site.total.toFixed(2)}
            </Badge>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(site.total / maxSite) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
