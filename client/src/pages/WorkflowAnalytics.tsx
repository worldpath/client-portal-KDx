import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Users, AlertTriangle, CheckCircle, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

export default function WorkflowAnalytics() {
  const { data: analytics, isLoading } = trpc.analytics.getWorkflowAnalytics.useQuery();
  const sendRemindersMutation = trpc.analytics.sendWorkflowReminders.useMutation();
  const [sending, setSending] = useState(false);

  const handleSendReminders = async () => {
    setSending(true);
    try {
      const result = await sendRemindersMutation.mutateAsync({ daysThreshold: 3 });
      toast.success(`Sent ${result.sent} reminders successfully`);
      if (result.failed > 0) {
        toast.warning(`${result.failed} reminders failed to send`);
      }
    } catch (error) {
      toast.error('Failed to send reminders');
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container py-8">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Workflow Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Performance metrics and insights for workflow approval processes
          </p>
        </div>
        <Button
          onClick={handleSendReminders}
          disabled={sending}
          className="gap-2"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
          Send Reminders
        </Button>
      </div>

      {/* Completion Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Workflow Completion Rates
          </CardTitle>
          <CardDescription>
            Percentage of workflows completed vs started
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.completionRates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completion data available</p>
          ) : (
            <div className="space-y-4">
              {analytics.completionRates.map((rate, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{rate.templateName}</span>
                    <span className="text-muted-foreground">
                      {rate.totalCompleted} / {rate.totalStarted} ({rate.completionRate.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${rate.completionRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Average Approval Times */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Average Approval Times by Stage
          </CardTitle>
          <CardDescription>
            Average days to complete each workflow stage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.averageApprovalTimes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approval time data available</p>
          ) : (
            <div className="space-y-4">
              {analytics.averageApprovalTimes.map((time, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{time.templateName}</p>
                    <p className="text-xs text-muted-foreground">{time.stageName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{time.averageDays.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">days</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviewer Workload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Reviewer Workload
          </CardTitle>
          <CardDescription>
            Pending and completed reviews by reviewer
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.reviewerWorkload.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviewer data available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-4 text-sm font-medium text-muted-foreground">Reviewer</th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-muted-foreground">Pending</th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-muted-foreground">Completed</th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-muted-foreground">Avg Response (days)</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.reviewerWorkload.map((reviewer, idx) => (
                    <tr key={idx} className="border-b border-border/50">
                      <td className="py-3 px-4 text-sm font-medium">{reviewer.reviewerName}</td>
                      <td className="py-3 px-4 text-sm text-right">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                          {reviewer.pendingCount}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-medium">
                          {reviewer.completedCount}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-muted-foreground">
                        {reviewer.averageResponseDays.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottlenecks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Workflow Bottlenecks
          </CardTitle>
          <CardDescription>
            Stages with high pending counts and long wait times
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.bottlenecks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bottlenecks detected</p>
          ) : (
            <div className="space-y-3">
              {analytics.bottlenecks.map((bottleneck, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border border-orange-200 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm text-orange-900">{bottleneck.templateName}</p>
                    <p className="text-xs text-orange-700">{bottleneck.stageName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-orange-900">{bottleneck.pendingCount} pending</p>
                    <p className="text-xs text-orange-700">{bottleneck.averagePendingDays.toFixed(1)} days avg wait</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
