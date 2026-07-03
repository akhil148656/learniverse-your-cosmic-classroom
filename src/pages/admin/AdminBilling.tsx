import { useState, useEffect, useCallback } from "react";
import { CreditCard, Plus, Loader2, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/cards/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClassData {
  id: string;
  name: string;
}

interface BillData {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  status: "pending" | "paid" | "overdue";
  student_id: string;
  student_name?: string;
  class_name?: string;
}

export default function AdminBilling() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [bills, setBills] = useState<BillData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    classId: "",
    title: "",
    description: "",
    amount: "",
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  });

  const fetchBillingInfo = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: adminProf } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("user_id", user.id)
        .single();

      if (!adminProf?.school_id) return;
      const schoolId = adminProf.school_id;

      // 1. Fetch Classes for dropdown
      const { data: classesData } = await supabase
        .from("classes")
        .select("id, name")
        .eq("school_id", schoolId)
        .order("name", { ascending: true });

      const classList = (classesData || []) as ClassData[];
      setClasses(classList);
      if (classList.length > 0) {
        setFormData((prev) => ({ ...prev, classId: classList[0].id }));
      }

      // 2. Fetch Bills in school
      const { data: billsData, error: billsError } = await supabase
        .from("fee_bills")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (billsError) throw billsError;

      const billsList = (billsData || []) as BillData[];

      // 3. Resolve student names & class names
      const studentIds = Array.from(new Set(billsList.map((b) => b.student_id)));
      if (studentIds.length > 0) {
        const { data: studentsData } = await supabase
          .from("students")
          .select("id, user_id, classes(name)")
          .in("id", studentIds);

        const studentProfileIds = (studentsData || []).map((s) => s.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", studentProfileIds);

        const profilesMap = new Map((profilesData || []).map((p) => [p.user_id, p.full_name]));
        const studentsMap = new Map(
          (studentsData || []).map((s) => [
            s.id,
            {
              name: profilesMap.get(s.user_id) || "Student",
              className: (s.classes as any)?.name || "Individual",
            },
          ])
        );

        const enrichedBills = billsList.map((bill) => {
          const studentMeta = studentsMap.get(bill.student_id) || { name: "Student", className: "N/A" };
          return {
            ...bill,
            student_name: studentMeta.name,
            class_name: studentMeta.className,
          };
        });
        setBills(enrichedBills);
      } else {
        setBills([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load school billing registry");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingInfo();
  }, [fetchBillingInfo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.classId || !formData.title || !formData.amount) {
      toast.error("Classroom, Invoice Title, and Amount are required fields");
      return;
    }
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthenticated");

      const { data: adminProf } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("user_id", user.id)
        .single();

      if (!adminProf?.school_id) throw new Error("School not set");
      const schoolId = adminProf.school_id;

      // 1. Fetch all students in the selected class
      const { data: studentsData, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("class_id", formData.classId);

      if (studentError) throw studentError;

      if (!studentsData || studentsData.length === 0) {
        toast.error("No students enrolled in this classroom to bill!");
        setIsSubmitting(false);
        return;
      }

      // 2. Insert invoices for all students in bulk
      const bulkBills = studentsData.map((student) => ({
        student_id: student.id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        amount: Number(formData.amount),
        due_date: formData.dueDate,
        status: "pending",
        school_id: schoolId,
      }));

      const { error } = await supabase.from("fee_bills").insert(bulkBills);
      if (error) throw error;

      toast.success(`Invoices generated successfully for ${studentsData.length} students!`);
      setIsDialogOpen(false);
      setFormData((prev) => ({ ...prev, title: "", description: "", amount: "" }));
      fetchBillingInfo();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate class invoices");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PortalLayout role="admin">
      <div className="space-y-6 admin-portal-theme">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-foreground">Billing Center</h1>
              <p className="text-sm text-muted-foreground">Manage invoices, collect outstanding fees, and track transaction ledgers</p>
            </div>
          </div>

          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-gradient-cosmic text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Generate Invoices
          </Button>
        </div>

        {/* Invoice List Card */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/40 overflow-hidden">
          <CardHeader className="border-b border-border/30">
            <CardTitle className="text-lg font-display font-semibold flex items-center gap-2">
              Outstanding & Paid Register
            </CardTitle>
            <CardDescription>Ledger showing invoices generated across school classrooms.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground font-display animate-pulse">Scanning ledger...</span>
              </div>
            ) : bills.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="No Invoices Logged"
                  description="Generate tuition or lab fee invoices for classroom students."
                  icon={CreditCard}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="border-b border-border/30">
                      <TableHead className="font-semibold text-foreground font-display py-4">Student Name</TableHead>
                      <TableHead className="font-semibold text-foreground font-display py-4">Classroom</TableHead>
                      <TableHead className="font-semibold text-foreground font-display py-4">Invoice Title</TableHead>
                      <TableHead className="font-semibold text-foreground font-display py-4">Due Date</TableHead>
                      <TableHead className="font-semibold text-foreground font-display py-4">Amount</TableHead>
                      <TableHead className="font-semibold text-foreground font-display text-center py-4">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.map((bill) => (
                      <TableRow key={bill.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                        <TableCell className="font-medium text-foreground py-3.5">
                          {bill.student_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground py-3.5">
                          {bill.class_name}
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div>
                            <span className="block font-semibold text-sm">{bill.title}</span>
                            {bill.description && (
                              <span className="text-xs text-muted-foreground block truncate max-w-xs">{bill.description}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm py-3.5">
                          {bill.due_date}
                        </TableCell>
                        <TableCell className="font-bold text-foreground py-3.5">
                          ${bill.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center py-3.5">
                          {bill.status === "paid" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Settled
                            </span>
                          ) : bill.status === "overdue" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/25">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
                              <Clock className="w-3.5 h-3.5" />
                              Pending
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog Form */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-2xl border-border/50">
            <DialogHeader>
              <DialogTitle className="text-xl font-display font-bold">Generate Class Invoices</DialogTitle>
              <DialogDescription>Create a fee invoice in bulk for all students enrolled in a class.</DialogDescription>
            </DialogHeader>

            {classes.length === 0 ? (
              <div className="py-6 text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  No classrooms registered under your school yet. Please create a class first.
                </p>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-border">
                  Cancel
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 py-2">
                {/* Class select */}
                <div className="space-y-2">
                  <Label htmlFor="class">Target Classroom</Label>
                  <Select
                    value={formData.classId}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, classId: val }))}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Select Classroom" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Invoice Title</Label>
                  <Input
                    id="title"
                    required
                    placeholder="e.g. Term 1 Tuition Fee, Annual Sports Fee"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    className="bg-input border-border"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="e.g. Tuition fee covering Aug-Dec astrophysics curriculum"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    className="bg-input border-border"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      required
                      min="0"
                      placeholder="e.g. 250"
                      value={formData.amount}
                      onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                      className="bg-input border-border"
                    />
                  </div>

                  {/* Due Date */}
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      required
                      value={formData.dueDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                      className="bg-input border-border dark:[color-scheme:dark]"
                    />
                  </div>
                </div>

                <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="border-border hover:bg-muted"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-cosmic text-white font-medium hover:opacity-90"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate Bills"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PortalLayout>
  );
}
