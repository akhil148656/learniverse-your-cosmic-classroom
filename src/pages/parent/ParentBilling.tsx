import { useState, useEffect, useCallback } from "react";
import { CreditCard, Calendar, CheckCircle2, AlertCircle, Loader2, Sparkles, Receipt, Download } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/cards/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChildData {
  id: string; // student_id
  name: string;
  student_code: string;
}

interface BillData {
  id: string;
  student_id: string;
  title: string;
  description: string | null;
  amount: number;
  due_date: string;
  status: "pending" | "paid" | "overdue";
  student_name?: string;
}

interface PaymentData {
  id: string;
  bill_id: string;
  amount_paid: number;
  payment_method: string;
  transaction_id: string | null;
  payment_date: string;
  bill_title?: string;
}

export default function ParentBilling() {
  const [children, setChildren] = useState<ChildData[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("all");
  const [bills, setBills] = useState<BillData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Checkout Modal State
  const [activeCheckoutBill, setActiveCheckoutBill] = useState<BillData | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi" | "bank_transfer">("card");

  // Fetch children
  useEffect(() => {
    const fetchChildren = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch linked student relationships
      const { data: relations, error: relError } = await supabase
        .from("parent_students")
        .select("student_id")
        .eq("parent_id", user.id);

      if (relError) {
        toast.error("Failed to load linked student relations");
        return;
      }

      if (!relations || relations.length === 0) {
        setChildren([]);
        return;
      }

      const studentIds = relations.map((r) => r.student_id);

      // Fetch student codes and names
      const { data: studentsData, error: stuError } = await supabase
        .from("students")
        .select("id, user_id, student_code")
        .in("id", studentIds);

      if (stuError) {
        toast.error("Failed to load children info");
        return;
      }

      const userIds = studentsData.map((s) => s.user_id);

      // Fetch names from profiles
      const { data: profilesData, error: profError } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      if (profError) {
        toast.error("Failed to resolve children names");
        return;
      }

      const profilesMap = new Map(profilesData.map((p) => [p.user_id, p.full_name]));

      const enrichedChildren = studentsData.map((s) => ({
        id: s.id,
        student_code: s.student_code,
        name: profilesMap.get(s.user_id) || "Student",
      }));

      setChildren(enrichedChildren);
      if (enrichedChildren.length > 0) {
        setSelectedChild("all");
      }
    };
    fetchChildren();
  }, []);

  // Fetch Bills & Payments
  const fetchBillingLedger = useCallback(async () => {
    if (children.length === 0) return;
    setIsLoading(true);

    try {
      // Create student filter list
      const targetStudentIds = selectedChild === "all" ? children.map((c) => c.id) : [selectedChild];
      const childrenMap = new Map(children.map((c) => [c.id, c.name]));

      // 1. Fetch Bills
      const { data: billsData, error: billsError } = await supabase
        .from("fee_bills")
        .select("*")
        .in("student_id", targetStudentIds)
        .order("due_date", { ascending: true });

      if (billsError) throw billsError;

      const enrichedBills = (billsData || []).map((bill) => ({
        ...bill,
        student_name: childrenMap.get(bill.student_id) || "Child",
      })) as BillData[];
      setBills(enrichedBills);

      // 2. Fetch Payments
      const billIds = enrichedBills.map((b) => b.id);
      if (billIds.length > 0) {
        const { data: paymentsData, error: payError } = await supabase
          .from("fee_payments")
          .select("*")
          .in("bill_id", billIds)
          .order("payment_date", { ascending: false });

        if (payError) throw payError;

        const billsMap = new Map(enrichedBills.map((b) => [b.id, b.title]));
        const enrichedPayments = (paymentsData || []).map((pay) => ({
          ...pay,
          bill_title: billsMap.get(pay.bill_id) || "Fee Payment",
        })) as PaymentData[];
        setPayments(enrichedPayments);
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error("Error loading billing ledger:", error);
      toast.error("Failed to load billing invoices");
    } finally {
      setIsLoading(false);
    }
  }, [children, selectedChild]);

  useEffect(() => {
    fetchBillingLedger();
  }, [fetchBillingLedger]);

  const handleOpenCheckout = (bill: BillData) => {
    setActiveCheckoutBill(bill);
  };

  const handleExecutePayment = async () => {
    if (!activeCheckoutBill) return;
    setIsProcessingPayment(true);

    try {
      // Generate a mock transaction ID
      const mockTxId = `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // 1. Insert Payment Record
      const { error: payError } = await supabase.from("fee_payments").insert([
        {
          bill_id: activeCheckoutBill.id,
          amount_paid: activeCheckoutBill.amount,
          payment_method: paymentMethod,
          transaction_id: mockTxId,
        },
      ]);

      if (payError) throw payError;

      // 2. Update Bill Status to 'paid'
      const { error: billError } = await supabase
        .from("fee_bills")
        .update({ status: "paid" })
        .eq("id", activeCheckoutBill.id);

      if (billError) throw billError;

      toast.success("Cosmic fee paid successfully!");
      setActiveCheckoutBill(null);
      fetchBillingLedger();
    } catch (error: any) {
      console.error("Error executing payment:", error);
      toast.error(error.message || "Payment execution failed");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const pendingBills = bills.filter((b) => b.status === "pending" || b.status === "overdue");
  const paidBills = bills.filter((b) => b.status === "paid");

  return (
    <PortalLayout role="parent">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-foreground">Finance & Billing</h1>
              <p className="text-sm text-muted-foreground">Manage school fees, download receipts, and pay invoices</p>
            </div>
          </div>

          {/* Child Filter */}
          <div className="w-48 self-start sm:self-auto">
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger className="bg-card/50 backdrop-blur-xl border-border">
                <SelectValue placeholder="All Children" />
              </SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-2xl border-border">
                <SelectItem value="all">All Children</SelectItem>
                {children.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {children.length === 0 ? (
          <EmptyState
            title="No Child Accounts Linked"
            description="Go to 'Child Progress' page to link your child using their Student Code."
            icon={CreditCard}
          />
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <span className="text-sm text-muted-foreground font-display animate-pulse">Accessing Ledger...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Pending Bills & Payments List */}
            <div className="lg:col-span-2 space-y-6">
              {/* Outstanding Invoices */}
              <Card className="bg-card/50 backdrop-blur-xl border-border/40 overflow-hidden">
                <CardHeader className="border-b border-border/30">
                  <CardTitle className="text-lg font-display font-semibold flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    Outstanding Invoices
                  </CardTitle>
                  <CardDescription>Fees currently pending payment.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {pendingBills.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm italic font-display">
                      ✨ Clear skies! No outstanding bills.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/40">
                          <TableRow className="border-b border-border/30">
                            <TableHead className="font-semibold text-foreground py-3">Child</TableHead>
                            <TableHead className="font-semibold text-foreground py-3">Title</TableHead>
                            <TableHead className="font-semibold text-foreground py-3">Due Date</TableHead>
                            <TableHead className="font-semibold text-foreground py-3">Amount</TableHead>
                            <TableHead className="font-semibold text-foreground text-right py-3">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingBills.map((bill) => (
                            <TableRow key={bill.id} className="border-b border-border/20">
                              <TableCell className="font-medium text-foreground py-3.5">
                                {bill.student_name}
                              </TableCell>
                              <TableCell className="py-3.5">
                                <div className="font-semibold text-sm">{bill.title}</div>
                                {bill.description && (
                                  <div className="text-xs text-muted-foreground">{bill.description}</div>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm py-3.5">
                                {bill.due_date}
                              </TableCell>
                              <TableCell className="font-bold text-foreground py-3.5">
                                ${bill.amount.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right py-3.5">
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenCheckout(bill)}
                                  className="bg-gradient-cosmic text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                                >
                                  Pay Now
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment History */}
              <Card className="bg-card/50 backdrop-blur-xl border-border/40 overflow-hidden">
                <CardHeader className="border-b border-border/30">
                  <CardTitle className="text-lg font-display font-semibold flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-accent" />
                    Transaction Logs
                  </CardTitle>
                  <CardDescription>Historical ledger of payment operations.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {payments.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm italic font-display">
                      No payments logged yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/40">
                          <TableRow className="border-b border-border/30">
                            <TableHead className="font-semibold text-foreground py-3">Transaction ID</TableHead>
                            <TableHead className="font-semibold text-foreground py-3">Fee Invoice</TableHead>
                            <TableHead className="font-semibold text-foreground py-3">Date</TableHead>
                            <TableHead className="font-semibold text-foreground py-3">Method</TableHead>
                            <TableHead className="font-semibold text-foreground text-right py-3">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.map((pay) => (
                            <TableRow key={pay.id} className="border-b border-border/20">
                              <TableCell className="font-mono text-xs text-muted-foreground py-3">
                                {pay.transaction_id || "N/A"}
                              </TableCell>
                              <TableCell className="font-medium text-foreground py-3">
                                {pay.bill_title}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs py-3">
                                {new Date(pay.payment_date).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs uppercase py-3">
                                {pay.payment_method.replace("_", " ")}
                              </TableCell>
                              <TableCell className="font-bold text-emerald-400 text-right py-3">
                                +${pay.amount_paid.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right: Overview Stats */}
            <div className="space-y-6">
              <Card className="bg-gradient-cosmic text-white border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="font-display font-semibold text-sm uppercase tracking-wider text-white/80">
                    Outstanding Balance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-4xl font-bold font-display">
                    ${pendingBills.reduce((acc, b) => acc + b.amount, 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-white/70">
                    Due for the active billing cycle. Please settle pending dues before their deadlines.
                  </p>
                </CardContent>
              </Card>

              {/* Paid Invoices List */}
              <Card className="bg-card/50 backdrop-blur-xl border-border/40 overflow-hidden">
                <CardHeader className="border-b border-border/30">
                  <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Settled Accounts
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {paidBills.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-xs italic">
                      No invoices settled in this cycle.
                    </div>
                  ) : (
                    <div className="divide-y divide-border/20">
                      {paidBills.map((bill) => (
                        <div key={bill.id} className="p-4 flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-xs text-foreground">{bill.title}</div>
                            <div className="text-[10px] text-muted-foreground">{bill.student_name}</div>
                          </div>
                          <span className="text-xs font-bold text-emerald-400">
                            ${bill.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Mock Checkout Dialog */}
        <Dialog open={!!activeCheckoutBill} onOpenChange={(open) => !open && setActiveCheckoutBill(null)}>
          <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-2xl border-border/50">
            <DialogHeader>
              <DialogTitle className="text-xl font-display font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                Pay Invoice
              </DialogTitle>
              <DialogDescription>
                Submit payment safely via our secure mock integration.
              </DialogDescription>
            </DialogHeader>

            {activeCheckoutBill && (
              <div className="space-y-4 py-3">
                {/* Summary Info */}
                <div className="bg-muted/40 border border-border/40 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Invoice Title</span>
                    <span className="font-semibold text-foreground">{activeCheckoutBill.title}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Student name</span>
                    <span className="font-semibold text-foreground">{activeCheckoutBill.student_name}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-foreground border-t border-border/20 pt-2 mt-2">
                    <span>Total Amount</span>
                    <span className="text-gradient">${activeCheckoutBill.amount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Method selector */}
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(val) => setPaymentMethod(val as any)}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="card">💳 Credit / Debit Card (Mock)</SelectItem>
                      <SelectItem value="upi">✨ UPI QR Checkout (Mock)</SelectItem>
                      <SelectItem value="bank_transfer">🏦 Net Banking / Transfer (Mock)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                onClick={() => setActiveCheckoutBill(null)}
                className="border-border hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExecutePayment}
                disabled={isProcessingPayment}
                className="bg-gradient-cosmic text-white font-medium hover:opacity-90 flex items-center gap-2"
              >
                {isProcessingPayment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Settle Balance</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PortalLayout>
  );
}
