import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * מוצג מיד עם הלחיצה בתפריט, בזמן שהעמוד הבא נטען בשרת.
 * בלי גבול Suspense כזה הדפדפן היה נשאר תקוע על העמוד הקודם עד סיום השאילתות.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="טוען את העמוד">
      <div className="space-y-2.5">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-7 w-16" />
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="space-y-3 p-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-11 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}
