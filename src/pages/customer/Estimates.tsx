import { useState } from "react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { useCustomerEstimates } from "@/hooks/useCustomerEstimates";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import {
  FileText,
  Check,
  X,
  Clock,
  MessageSquare,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomerEstimates() {
  const { estimates, isLoading, respondToEstimate } = useCustomerEstimates();
  const [selectedEstimate, setSelectedEstimate] = useState<any>(null);
  const [responseType, setResponseType] = useState<"approved" | "denied" | null>(null);
  const [comments, setComments] = useState("");

  const handleRespond = (estimate: any, type: "approved" | "denied") => {
    setSelectedEstimate(estimate);
    setResponseType(type);
    setComments("");
  };

  const submitResponse = () => {
    if (!selectedEstimate || !responseType) return;

    respondToEstimate.mutate(
      {
        estimateId: selectedEstimate.id,
        response: responseType,
        comments: comments.trim() || undefined,
      },
      {
        onSuccess: () => {
          setSelectedEstimate(null);
          setResponseType(null);
          setComments("");
        },
      }
    );
  };

  const getStatusBadge = (estimate: any) => {
    if (estimate.customer_response === "approved") {
      return (
        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      );
    }
    if (estimate.customer_response === "denied") {
      return (
        <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
          <XCircle className="h-3 w-3 mr-1" />
          Declined
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
        <Clock className="h-3 w-3 mr-1" />
        Awaiting Response
      </Badge>
    );
  };

  const pendingEstimates = estimates.filter(
    (e) => e.customer_response === "pending"
  );
  const respondedEstimates = estimates.filter(
    (e) => e.customer_response !== "pending"
  );

  return (
    <CustomerLayout title="Estimates" subtitle="Review and respond to shipping estimates">
      <div className="space-y-6">

        {/* Pending Estimates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Pending Review ({pendingEstimates.length})
            </CardTitle>
            <CardDescription>
              These estimates require your approval or feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : pendingEstimates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No pending estimates</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingEstimates.map((estimate) => (
                  <Card key={estimate.id} className="border-yellow-500/20">
                    <CardContent className="pt-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {estimate.estimate_number}
                            </span>
                            <Badge variant="outline" className="capitalize">
                              {estimate.estimate_type}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Created:{" "}
                            {format(new Date(estimate.created_at), "MMM d, yyyy")}
                            {estimate.valid_until && (
                              <span className="ml-2">
                                • Valid until:{" "}
                                {format(
                                  new Date(estimate.valid_until),
                                  "MMM d, yyyy"
                                )}
                              </span>
                            )}
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">
                              Weight: {estimate.weight_kg} kg @ {estimate.currency}{" "}
                              {estimate.rate_per_kg}/kg
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-2xl font-bold">
                              {estimate.currency} {estimate.total.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Total Amount
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleRespond(estimate, "denied")}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleRespond(estimate, "approved")}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      </div>
                      {estimate.notes && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-md text-sm">
                          <span className="font-medium">Note:</span>{" "}
                          {estimate.notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Response History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Response History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : respondedEstimates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No responded estimates yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estimate #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead>Responded On</TableHead>
                    <TableHead>Comments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {respondedEstimates.map((estimate) => (
                    <TableRow key={estimate.id}>
                      <TableCell className="font-medium">
                        {estimate.estimate_number}
                      </TableCell>
                      <TableCell className="capitalize">
                        {estimate.estimate_type}
                      </TableCell>
                      <TableCell>
                        {estimate.currency} {estimate.total.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(estimate)}</TableCell>
                      <TableCell>
                        {estimate.responded_at
                          ? format(
                              new Date(estimate.responded_at),
                              "MMM d, yyyy"
                            )
                          : "-"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {estimate.customer_comments || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Response Dialog */}
      <Dialog
        open={!!selectedEstimate}
        onOpenChange={() => setSelectedEstimate(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {responseType === "approved" ? (
                <span className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  Approve Estimate
                </span>
              ) : (
                <span className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  Decline Estimate
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {responseType === "approved"
                ? "Approving this estimate will automatically create an invoice for the amount shown."
                : "Please let us know why you're declining so we can provide a better estimate."}
            </DialogDescription>
          </DialogHeader>

          {selectedEstimate && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    {selectedEstimate.estimate_number}
                  </span>
                  <span className="text-xl font-bold">
                    {selectedEstimate.currency}{" "}
                    {selectedEstimate.total.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {responseType === "approved"
                    ? "Additional Comments (Optional)"
                    : "Reason for Declining"}
                </label>
                <Textarea
                  placeholder={
                    responseType === "approved"
                      ? "Any special instructions or notes..."
                      : "Please share why this estimate doesn't work for you..."
                  }
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedEstimate(null)}
              disabled={respondToEstimate.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={submitResponse}
              disabled={respondToEstimate.isPending}
              className={
                responseType === "approved"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {respondToEstimate.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : responseType === "approved" ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              {responseType === "approved" ? "Approve & Create Invoice" : "Decline Estimate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
}
