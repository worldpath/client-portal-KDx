import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Loader2, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";

type SortBy = "pending" | "avgTime" | "approvalRate";

export default function ReviewerWorkloadWidget() {
  const [sortBy, setSortBy] = useState<SortBy>("pending");

  const { data: stats = [], isLoading } = trpc.workflow.reviewerWorkloadStats.useQuery();

  // Calculate approval rate and sort
  const enrichedStats = stats.map(stat => ({
    ...stat,
    approvalRate: stat.totalReviews > 0 
      ? ((stat.approvedCount / (stat.approvedCount + stat.rejectedCount)) * 100) || 0
      : 0,
  }));

  const sortedStats = [...enrichedStats].sort((a, b) => {
    switch (sortBy) {
      case "pending":
        return b.pendingCount - a.pendingCount;
      case "avgTime":
        return (a.avgReviewTimeHours || 999) - (b.avgReviewTimeHours || 999);
      case "approvalRate":
        return b.approvalRate - a.approvalRate;
      default:
        return 0;
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Reviewer Workload
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Reviewer Workload
            </CardTitle>
            <CardDescription>
              Performance metrics and pending reviews by reviewer
            </CardDescription>
          </div>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
            <SelectTrigger className="w-[180px]">
              <TrendingUp className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending Count</SelectItem>
              <SelectItem value="avgTime">Avg Review Time</SelectItem>
              <SelectItem value="approvalRate">Approval Rate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {sortedStats.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">
              No reviewer activity yet
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedStats.map((reviewer) => (
              <div
                key={reviewer.reviewerId}
                className="p-4 border border-border rounded-lg space-y-3 hover:bg-accent/5 transition-colors"
              >
                {/* Reviewer Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{reviewer.reviewerName}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="w-3 h-3" />
                        {reviewer.pendingCount} pending
                      </Badge>
                      {reviewer.avgReviewTimeHours !== null && (
                        <Badge variant="outline" className="gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {reviewer.avgReviewTimeHours.toFixed(1)}h avg
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-lg font-semibold">{reviewer.approvedCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Approved</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                      <XCircle className="w-4 h-4" />
                      <span className="text-lg font-semibold">{reviewer.rejectedCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Rejected</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-lg font-semibold">
                        {reviewer.approvalRate.toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Approval Rate</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
