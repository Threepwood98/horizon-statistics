import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  className?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("flex-1 min-w-32", className)}>
      <CardHeader className="flex flex-row items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 items-end">
        <div className="text-xl font-bold font-mono">{value}</div>
      </CardContent>
      <CardFooter className="justify-end">
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardFooter>
    </Card>
  );
}
