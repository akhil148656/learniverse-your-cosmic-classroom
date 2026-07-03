import { useState, useEffect, useCallback } from "react";
import { Users, Edit2, Loader2, ShieldCheck } from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/cards/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  school_id: string | null;
  school_name?: string;
  created_at: string;
}

interface SchoolItem {
  id: string;
  name: string;
}

export default function SuperAdminAdmins() {
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Edit Dialog State
  const [activeAdmin, setActiveAdmin] = useState<AdminProfile | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("none");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchAdminsAndSchools = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch schools list
      const { data: schoolsData } = await supabase
        .from("schools")
        .select("id, name")
        .order("name", { ascending: true });
      
      const schoolList = (schoolsData || []) as SchoolItem[];
      setSchools(schoolList);
      const schoolsMap = new Map(schoolList.map((s) => [s.id, s.name]));

      // 2. Fetch admin profiles
      const { data: adminsData, error: adminsError } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "admin");

      if (adminsError) throw adminsError;

      const adminsList = (adminsData || []).map((admin) => ({
        ...admin,
        school_name: admin.school_id ? schoolsMap.get(admin.school_id) || "Assigned School" : "Not Linked",
      })) as AdminProfile[];

      setAdmins(adminsList);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load administrators directory");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminsAndSchools();
  }, [fetchAdminsAndSchools]);

  const handleOpenEdit = (admin: AdminProfile) => {
    setActiveAdmin(admin);
    setSelectedSchoolId(admin.school_id || "none");
  };

  const handleUpdateSchoolLink = async () => {
    if (!activeAdmin) return;
    setIsUpdating(true);

    try {
      const targetSchoolId = selectedSchoolId === "none" ? null : selectedSchoolId;

      const { error } = await supabase
        .from("profiles")
        .update({ school_id: targetSchoolId })
        .eq("id", activeAdmin.id);

      if (error) throw error;

      toast.success(`Administrator school link updated successfully!`);
      setActiveAdmin(null);
      fetchAdminsAndSchools();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update school connection");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <PortalLayout role="super_admin">
      <div className="space-y-6 super-admin-portal-theme">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Administrators Directory</h1>
            <p className="text-sm text-muted-foreground">Manage school admin clearances and school linkages</p>
          </div>
        </div>

        {/* Admins Table */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/40 overflow-hidden">
          <CardHeader className="border-b border-border/30">
            <CardTitle className="text-lg font-display font-semibold flex items-center gap-2">
              Registered Admins
            </CardTitle>
            <CardDescription>Roster of all registered school administrator accounts.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground font-display animate-pulse">Scanning admins...</span>
              </div>
            ) : admins.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="No Administrators"
                  description="School admin accounts will appear here once they register on the Admin portal."
                  icon={Users}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="border-b border-border/30">
                      <TableHead className="font-semibold text-foreground font-display py-4">Admin Name</TableHead>
                      <TableHead className="font-semibold text-foreground font-display py-4">Email Address</TableHead>
                      <TableHead className="font-semibold text-foreground font-display py-4">Linked Campus</TableHead>
                      <TableHead className="font-semibold text-foreground font-display py-4">Joined Date</TableHead>
                      <TableHead className="font-semibold text-foreground font-display text-right py-4">Clearance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins.map((admin) => (
                      <TableRow key={admin.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                        <TableCell className="font-medium text-foreground py-3.5">
                          {admin.full_name || "School Admin"}
                        </TableCell>
                        <TableCell className="text-muted-foreground py-3.5">
                          {admin.email || "N/A"}
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            admin.school_id 
                              ? "bg-primary/10 text-primary border border-primary/20" 
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {admin.school_name}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs py-3.5">
                          {new Date(admin.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right py-3.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenEdit(admin)}
                            className="text-muted-foreground hover:text-primary"
                            title="Edit School Linkage"
                          >
                            <Edit2 className="w-4 h-4" />
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

        {/* Edit School Linkage Dialog */}
        <Dialog open={!!activeAdmin} onOpenChange={(open) => !open && setActiveAdmin(null)}>
          <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-2xl border-border/50">
            <DialogHeader>
              <DialogTitle className="text-xl font-display font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Change Campus Linkage
              </DialogTitle>
              <DialogDescription>
                Assign or update the school database this admin manages.
              </DialogDescription>
            </DialogHeader>

            {activeAdmin && (
              <div className="space-y-4 py-3">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Administrator</span>
                  <p className="font-bold text-foreground">{activeAdmin.full_name || activeAdmin.email}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schoolLink">Assign School Tenant</Label>
                  <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Select Campus" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="none">Not Linked (Unassign)</SelectItem>
                      {schools.map((sch) => (
                        <SelectItem key={sch.id} value={sch.id}>
                          {sch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                onClick={() => setActiveAdmin(null)}
                className="border-border hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateSchoolLink}
                disabled={isUpdating}
                className="bg-gradient-cosmic text-white font-medium hover:opacity-90 flex items-center gap-2"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Linkage"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PortalLayout>
  );
}
