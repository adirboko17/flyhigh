"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

interface AdminSectionProps {
  /** משמש כעוגן לגלילה לסקציה. */
  id: string;
  icon: string;
  title: string;
  count: number;
  totalCount: number;
  onNew: () => void;
  newLabel: string;
  children: React.ReactNode;
}

export function AdminSection({
  id,
  icon,
  title,
  count,
  totalCount,
  onNew,
  newLabel,
  children,
}: AdminSectionProps) {
  const isFiltered = count !== totalCount;

  return (
    <Card id={id} className="scroll-mt-6 overflow-hidden">
      <CardHeader className="flex-wrap">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="text-lg">
            {icon}
          </span>
          <CardTitle>{title}</CardTitle>
          <Badge tone={isFiltered ? "brand" : "neutral"}>
            {isFiltered ? `${count} מתוך ${totalCount}` : totalCount}
          </Badge>
        </div>
        <Button type="button" size="sm" onClick={onNew}>
          {newLabel}
        </Button>
      </CardHeader>
      {children}
    </Card>
  );
}
