import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const LANGUAGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "ta", label: "Tamil" },
  { value: "te", label: "Telugu" },
  { value: "kn", label: "Kannada" },
  { value: "ml", label: "Malayalam" },
  { value: "bn", label: "Bengali" },
  { value: "mr", label: "Marathi" },
  { value: "gu", label: "Gujarati" },
  { value: "pa", label: "Punjabi" },
  { value: "ur", label: "Urdu" },
];

export default function StudentSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isJoiningClass, setIsJoiningClass] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [currentEmail, setCurrentEmail] = useState<string>("");
  const [newEmail, setNewEmail] = useState<string>("");

  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "prefer_not_to_say" | "">("");
  const [gradeLevel, setGradeLevel] = useState<string>("");
  const [preferredLanguage, setPreferredLanguage] = useState<string>("en");

  const [learningMode, setLearningMode] = useState<string | null>(null);
  const [currentClassName, setCurrentClassName] = useState<string | null>(null);
  const [currentClassCode, setCurrentClassCode] = useState<string | null>(null);
  const [newClassCode, setNewClassCode] = useState<string>("");

  const gradeOptions = useMemo(() => [6, 7, 8, 9, 10, 11, 12], []);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: userResp, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const user = userResp.user;
      if (!user) {
        navigate("/student-login");
        return;
      }

      setCurrentEmail(user.email || "");
      setNewEmail(user.email || "");

      const [profileResp, studentResp] = await Promise.all([
        supabase.from("profiles").select("full_name, phone, gender").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("students")
          .select("grade_level, preferred_language, learning_mode, class_id")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      let profile = profileResp.data as any;
      const profErr = profileResp.error as any;
      if (profErr) {
        const msg = String(profErr?.message || "");
        if (/gender/i.test(msg)) {
          const retry = await supabase.from("profiles").select("full_name, phone").eq("user_id", user.id).maybeSingle();
          if (retry.error) throw retry.error;
          profile = retry.data as any;
        } else {
          throw profErr;
        }
      }

      let student = studentResp.data as any;
      const studErr = studentResp.error as any;

      // Backward-compatible fallback for databases that haven't applied the preferred_language migration yet.
      if (studErr && typeof studErr.message === "string" && /preferred_language/i.test(studErr.message)) {
        const retry = await supabase
          .from("students")
          .select("grade_level, learning_mode, class_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (retry.error) throw retry.error;
        student = retry.data as any;
      } else if (studErr) {
        throw studErr;
      }

      setFullName(profile?.full_name || "");
      setPhone(profile?.phone || "");
      setGender((profile?.gender as any) || "");

      setGradeLevel(student?.grade_level ? String(student.grade_level) : "");
      setPreferredLanguage(student?.preferred_language || "en");
      setLearningMode(student?.learning_mode || null);

      if (student?.class_id) {
        const { data: cls, error: clsErr } = await supabase
          .from("classes")
          .select("name, class_code")
          .eq("id", student.class_id)
          .maybeSingle();
        if (!clsErr && cls) {
          setCurrentClassName(cls.name || null);
          setCurrentClassCode(cls.class_code || null);
        }
      } else {
        setCurrentClassName(null);
        setCurrentClassCode(null);
      }

      // After loading from DB, default to read-only mode.
      setIsEditing(false);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to load settings", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [navigate, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: userResp } = await supabase.auth.getUser();
      const user = userResp.user;
      if (!user) {
        navigate("/student-login");
        return;
      }

      // 1) Update email in auth if changed
      const normalizedNewEmail = newEmail.trim().toLowerCase();
      if (normalizedNewEmail && normalizedNewEmail !== (user.email || "").toLowerCase()) {
        const { error: authErr } = await supabase.auth.updateUser({ email: normalizedNewEmail });
        if (authErr) throw authErr;
      }

      // 2) Update profile fields
      const profileEmail = normalizedNewEmail || user.email || null;
      const profilePayload = {
        email: profileEmail,
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        gender: gender || null,
      } as any;

      const profileUpdate = await supabase
        .from("profiles")
        .update(profilePayload, { count: "exact" })
        .eq("user_id", user.id);

      if (profileUpdate.error) {
        const msg = String((profileUpdate.error as any)?.message || "");
        if (/gender/i.test(msg)) {
          // Backward-compatible retry if DB migration hasn't been applied yet.
          const retry = await supabase
            .from("profiles")
            .update({ email: profileEmail, full_name: profilePayload.full_name, phone: profilePayload.phone }, { count: "exact" })
            .eq("user_id", user.id);
          if (retry.error) throw retry.error;

          toast({
            title: "Saved (partial)",
            description: "Profile saved. Gender requires the latest database migration.",
          });
        } else {
          throw profileUpdate.error;
        }
      }

      // If the profile row doesn't exist (common for older accounts), create it.
      if ((profileUpdate.count ?? 0) === 0) {
        const insertPayload: any = { user_id: user.id, ...profilePayload };
        const profileInsert = await supabase.from("profiles").insert(insertPayload);
        if (profileInsert.error) {
          const msg = String((profileInsert.error as any)?.message || "");
          if (/row-level security/i.test(msg) || /violates row-level security/i.test(msg)) {
            throw new Error(
              "Profile row is missing, and the database blocked creating it (RLS). Apply the latest Supabase migrations, then try again."
            );
          }
          if (/gender/i.test(msg)) {
            // Backward-compatible insert if DB migration hasn't been applied yet.
            const fallbackInsert = await supabase
              .from("profiles")
              .insert({ user_id: user.id, email: profileEmail, full_name: profilePayload.full_name, phone: profilePayload.phone } as any);
            if (fallbackInsert.error) throw fallbackInsert.error;
          } else {
            throw profileInsert.error;
          }
        }
      }

      // 3) Update student fields
      const gradeNum = gradeLevel ? Number(gradeLevel) : null;
      const safeGrade = Number.isFinite(gradeNum) ? (gradeNum as number) : null;
      const safeLang = preferredLanguage?.trim() ? preferredLanguage.trim() : null;

      const primaryUpdate = await supabase
        .from("students")
        .update({
          grade_level: safeGrade,
          preferred_language: safeLang,
        })
        .eq("user_id", user.id);

      if (primaryUpdate.error) {
        const msg = String((primaryUpdate.error as any)?.message || "");
        if (/preferred_language/i.test(msg)) {
          // Retry without preferred_language if the column doesn't exist yet.
          const retryUpdate = await supabase
            .from("students")
            .update({ grade_level: safeGrade })
            .eq("user_id", user.id);
          if (retryUpdate.error) throw retryUpdate.error;

          toast({
            title: "Saved (partial)",
            description: "Profile saved. Language preference requires the latest database migration.",
          });
        } else {
          throw primaryUpdate.error;
        }
      }

      toast({
        title: "Saved",
        description:
          normalizedNewEmail !== (user.email || "").toLowerCase()
            ? "Settings saved. Check your inbox to confirm email change (if required)."
            : "Settings saved successfully.",
      });

      await load();
      setIsEditing(false);
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Something went wrong", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    await load();
  };

  const handleJoinNewClass = async () => {
    const code = newClassCode.trim().toUpperCase();
    if (code.length < 6) {
      toast({ title: "Invalid code", description: "Enter a 6-character class code", variant: "destructive" });
      return;
    }

    setIsJoiningClass(true);
    try {
      const { error } = await supabase.rpc("student_join_class_by_code", { _code: code });
      if (error) throw error;

      toast({ title: "Class updated", description: "Joined the new class successfully." });
      setNewClassCode("");
      await load();
    } catch (e: any) {
      toast({ title: "Could not change class", description: e?.message || "Try again", variant: "destructive" });
    } finally {
      setIsJoiningClass(false);
    }
  };

  return (
    <PortalLayout role="student">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Profile</h1>
          <p className="text-muted-foreground">Update your personal info and learning preferences</p>
        </div>

        <Card className="bg-card/80 backdrop-blur-xl border-border">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="bg-input border-border"
                disabled={isLoading || isSaving || !isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91..."
                className="bg-input border-border"
                disabled={isLoading || isSaving || !isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label>Gender</Label>
              <Select
                value={gender}
                onValueChange={(value) => setGender(value as any)}
                disabled={isLoading || isSaving || !isEditing}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-input border-border"
                disabled={isLoading || isSaving || !isEditing}
              />
              {currentEmail && newEmail.trim().toLowerCase() !== currentEmail.trim().toLowerCase() && (
                <p className="text-sm text-muted-foreground">
                  Changing email may require confirmation via email.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-xl border-border">
          <CardHeader>
            <CardTitle>Learning</CardTitle>
            <CardDescription>Preferences used to personalize content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Class / Grade Level</Label>
              <Select
                value={gradeLevel}
                onValueChange={(value) => setGradeLevel(value)}
                disabled={isLoading || isSaving || !isEditing}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Select your class" />
                </SelectTrigger>
                <SelectContent>
                  {gradeOptions.map((g) => (
                    <SelectItem key={g} value={String(g)}>
                      Class {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Preferred Learning Language</Label>
              <Select
                value={preferredLanguage}
                onValueChange={(value) => setPreferredLanguage(value)}
                disabled={isLoading || isSaving || !isEditing}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {learningMode === "classroom" && (
              <div className="space-y-3 pt-2">
                <div className="text-sm text-muted-foreground">
                  <div>Current class: {currentClassName || "(unknown)"}</div>
                  {currentClassCode ? <div>Class code: {currentClassCode}</div> : null}
                </div>

                <div className="space-y-2">
                  <Label>Change Classroom (enter new class code)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newClassCode}
                      onChange={(e) => setNewClassCode(e.target.value.toUpperCase())}
                      placeholder="ABC123"
                      maxLength={6}
                      className="bg-input border-border text-center tracking-widest"
                      disabled={isLoading || isSaving || isJoiningClass || !isEditing}
                    />
                    <Button
                      type="button"
                      onClick={handleJoinNewClass}
                      disabled={isLoading || isSaving || isJoiningClass || !isEditing || newClassCode.trim().length < 6}
                      variant="secondary"
                    >
                      {isJoiningClass ? "Joining..." : "Join"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate("/student/dashboard")}>
                Back
              </Button>
              {!isEditing ? (
                <Button type="button" onClick={() => setIsEditing(true)} disabled={isLoading || isSaving}>
                  Edit
                </Button>
              ) : (
                <>
                  <Button type="button" variant="secondary" onClick={handleCancel} disabled={isLoading || isSaving}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleSave} disabled={isLoading || isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
