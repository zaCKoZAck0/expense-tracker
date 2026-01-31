import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function SplitSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-50">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-9 w-32" />
      </div>

      <Card>
        <CardHeader>
           <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
           <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                 <div key={i} className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                       <Skeleton className="h-8 w-8 rounded-full" />
                       <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                 </div>
              ))}
           </div>
        </CardContent>
      </Card>

       <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex justify-between mb-2">
                 <Skeleton className="h-4 w-40" />
                 <Skeleton className="h-4 w-20" />
              </div>
               <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
