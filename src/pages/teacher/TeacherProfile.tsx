import { useState, useEffect, useRef } from "react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  User,
  Phone,
  Mail,
  School,
  BookOpen,
  FileText,
  Camera,
  Loader2,
  CheckCircle,
  Pencil,
} from "lucide-react";

interface TeacherProfileData {
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string;
  bio: string;
  school_name: string;
  subject_specialization: string;
}

function AvatarDisplay({
  url,
  name,
  size = 112,
}: {
  url: string | null;
  name: string;
  size?: number;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sizeClass = `w-28 h-28`;

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover ring-4 ring-primary/40 shadow-[0_0_30px_rgba(139,92,246,0.4)]"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className={`${sizeClass} rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center ring-4 ring-primary/40 shadow-[0_0_30px_rgba(139,92,246,0.4)]`}
    >
      <span className="font-display font-bold text-3xl text-white">
        {initials || "T"}
      </span>
    </div>
  );
}

export default function TeacherProfile() {
  const [profile, setProfile] = useState<TeacherProfileData>({
    full_name: "",
    email: "",
    phone: "",
    avatar_url: "",
    bio: "",
    school_name: "",
    subject_specialization: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "full_name, email, phone, avatar_url, bio, school_name, subject_specialization"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("TeacherProfile loadProfile error:", error);
        toast.error("Failed to load profile: " + error.message);
        return;
      }

      if (data) {
        setProfile({
          full_name: (data as any).full_name || "",
          email: (data as any).email || user.email || "",
          phone: (data as any).phone || "",
          avatar_url: (data as any).avatar_url || "",
          bio: (data as any).bio || "",
          school_name: (data as any).school_name || "",
          subject_specialization: (data as any).subject_specialization || "",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        if (uploadError.message?.toLowerCase().includes("bucket not found")) {
          toast.error("Upload failed: 'avatars' bucket not found. Please execute CREATE_AVATARS_BUCKET_AND_FIELDS.sql in your Supabase SQL Editor!");
        } else {
          toast.error("Upload failed: " + uploadError.message);
        }
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      const cacheBusted = publicUrl + "?t=" + Date.now();

      await supabase
        .from("profiles")
        .update({ avatar_url: cacheBusted } as any)
        .eq("user_id", user.id);

      setProfile((p) => ({ ...p, avatar_url: cacheBusted }));
      toast.success("Profile photo updated! ✨");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in again.");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name.trim(),
          phone: profile.phone.trim(),
          bio: profile.bio.trim(),
          school_name: profile.school_name.trim(),
          subject_specialization: profile.subject_specialization.trim(),
        } as any)
        .eq("user_id", user.id);

      if (error) {
        toast.error("Save failed: " + error.message);
        return;
      }

      setSaved(true);
      toast.success("Profile saved successfully! 🚀");
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const fields = [
    {
      key: "full_name",
      label: "Full Name",
      icon: <User className="w-4 h-4 text-primary" />,
      placeholder: "Enter your full name",
      type: "input",
      editable: true,
    },
    {
      key: "email",
      label: "Email",
      icon: <Mail className="w-4 h-4 text-muted-foreground" />,
      placeholder: "—",
      type: "input",
      editable: false,
    },
    {
      key: "phone",
      label: "Phone Number",
      icon: <Phone className="w-4 h-4 text-primary" />,
      placeholder: "Enter your phone number",
      type: "input",
      editable: true,
    },
    {
      key: "subject_specialization",
      label: "Subject Specialization",
      icon: <BookOpen className="w-4 h-4 text-secondary" />,
      placeholder: "e.g. Mathematics, Physics",
      type: "input",
      editable: true,
    },
    {
      key: "school_name",
      label: "School / Institution",
      icon: <School className="w-4 h-4 text-accent" />,
      placeholder: "Enter your school name",
      type: "input",
      editable: true,
    },
  ] as const;

  if (isLoading) {
    return (
      <PortalLayout role="teacher">
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mr-3" />
          Loading profile...
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout role="teacher">
      <div className="space-y-8 max-w-3xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">
            Manage your contact info and professional details
          </p>
        </div>

        {/* Avatar Card */}
        <Card className="bg-card border-border overflow-hidden">
          {/* Banner gradient */}
          <div className="h-28 bg-gradient-to-r from-primary/30 via-secondary/20 to-accent/30 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15)_0%,transparent_70%)]" />
          </div>
          <CardContent className="pt-0 pb-6 px-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-14">
              {/* Avatar + upload overlay */}
              <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                <AvatarDisplay
                  url={profile.avatar_url || null}
                  name={profile.full_name || "Teacher"}
                  size={112}
                />
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {isUploadingAvatar ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="text-center sm:text-left pb-2">
                <h2 className="font-display text-xl font-bold text-foreground">
                  {profile.full_name || "Your Name"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {profile.subject_specialization || "Teacher"}{" "}
                  {profile.school_name ? `• ${profile.school_name}` : ""}
                </p>
                <button
                  onClick={handleAvatarClick}
                  className="mt-1 text-xs text-primary hover:text-primary/80 underline underline-offset-2 flex items-center gap-1 mx-auto sm:mx-0"
                  disabled={isUploadingAvatar}
                >
                  <Pencil className="w-3 h-3" />
                  {isUploadingAvatar ? "Uploading..." : "Change photo"}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fields Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg text-foreground">
              Personal & Professional Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  {f.icon}
                  {f.label}
                  {!f.editable && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5 rounded">
                      Read-only
                    </span>
                  )}
                </Label>
                <Input
                  value={profile[f.key as keyof TeacherProfileData]}
                  onChange={(e) =>
                    f.editable &&
                    setProfile((p) => ({ ...p, [f.key]: e.target.value }))
                  }
                  placeholder={f.editable ? f.placeholder : ""}
                  disabled={!f.editable}
                  className={`bg-muted border-border ${
                    !f.editable ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                />
              </div>
            ))}

            {/* Bio */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <FileText className="w-4 h-4 text-primary" />
                Bio
                <span className="text-xs text-muted-foreground ml-auto">
                  {profile.bio.length}/300
                </span>
              </Label>
              <Textarea
                value={profile.bio}
                onChange={(e) =>
                  e.target.value.length <= 300 &&
                  setProfile((p) => ({ ...p, bio: e.target.value }))
                }
                placeholder="Share a short professional bio (optional)..."
                rows={4}
                className="bg-muted border-border resize-none"
              />
            </div>

            {/* Save */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {saved && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  Saved!
                </span>
              )}
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90 font-display font-semibold px-6"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {isSaving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
