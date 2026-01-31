import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function SavingsSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-50">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
               <div className="flex justify-between">
                 <Skeleton className="h-5 w-32" />
                 <Skeleton className="h-5 w-5 rounded-full" />
               </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24 mb-4" />
              <Skeleton className="h-2 w-full mb-2" />
              <div className="flex justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
