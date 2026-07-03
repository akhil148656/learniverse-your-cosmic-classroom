import { useState, useEffect, useCallback } from "react";
import { Building, Plus, Loader2, Calendar } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/cards/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SchoolItem {
  id: string;
  name: string;
  school_code: string;
  created_at: string;
}

export default function SuperAdminSchools() {
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schoolName, setSchoolName] = useState("");

  const fetchSchools = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setSchools((data || []) as SchoolItem[]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load school tenant directory");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim()) return;
    setIsSubmitting(true);

    try {
      const generatedCode = `SCH-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      const { error } = await supabase.from("schools").insert([
        {
          name: schoolName.trim(),
          school_code: generatedCode,
        },
      ]);

      if (error) throw error;

      toast.success(`School "${schoolName}" registered successfully!`);
      setIsDialogOpen(false);
      setSchoolName("");
      fetchSchools();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create school");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PortalLayout role="super_admin">
      <div className="space-y-6 super-admin-portal-theme">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-foreground">School Tenancy Registry</h1>
              <p className="text-sm text-muted-foreground">Provision and manage isolated school workspaces</p>
            </div>
          </div>

          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-gradient-cosmic text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Register School
          </Button>
        </div>

        {/* Directory List */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/40 overflow-hidden">
          <CardHeader className="border-b border-border/30">
            <CardTitle className="text-lg font-display font-semibold flex items-center gap-2">
              Registered School Systems
            </CardTitle>
            <CardDescription>Overview of school databases active on Learniverse.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground font-display animate-pulse">Accessing directory...</span>
              </div>
            ) : schools.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="No School Systems Provisioned"
                  description="Register a new school tenant to establish isolated classroom portals."
                  icon={Building}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="border-b border-border/30">
                      <TableHead className="font-semibold text-foreground font-display py-4">School Name</TableHead>
                      <TableHead className="font-semibold text-foreground font-display py-4">School Code</TableHead>
                      <TableHead className="font-semibold text-foreground font-display py-4">Tenant ID</TableHead>
                      <TableHead className="font-semibold text-foreground font-display py-4">Created Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schools.map((school) => (
                      <TableRow key={school.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                        <TableCell className="font-medium text-foreground py-3.5">
                          {school.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-primary py-3.5">
                          {school.school_code}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground py-3.5">
                          {school.id}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs py-3.5 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          {new Date(school.created_at).toLocaleDateString()}
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
              <DialogTitle className="text-xl font-display font-bold">Register School Tenant</DialogTitle>
              <DialogDescription>Establish a new tenant and generate their school registration code.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">School Name</Label>
                <Input
                  id="name"
                  required
                  placeholder="e.g. Orion International Academy"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="bg-input border-border"
                />
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
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Register School"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PortalLayout>
  );
}
