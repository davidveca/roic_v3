"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { updateMemberRole, removeMember, inviteMember } from "@/app/actions/team";

type OrgRole = "ADMIN" | "FINANCE" | "EDITOR" | "CONTRIBUTOR" | "VIEWER";

const roleColors: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-800",
  FINANCE: "bg-purple-100 text-purple-800",
  EDITOR: "bg-blue-100 text-blue-800",
  CONTRIBUTOR: "bg-green-100 text-green-800",
  VIEWER: "bg-gray-100 text-gray-800",
};

const roleLabels: Record<string, string> = {
  ADMIN: "Admin",
  FINANCE: "Finance Reviewer",
  EDITOR: "Initiative Owner",
  CONTRIBUTOR: "Contributor",
  VIEWER: "Viewer",
};

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  orgRole: OrgRole;
  createdAt: Date;
}

interface TeamListProps {
  members: TeamMember[];
  currentUserId: string;
  isAdmin: boolean;
}

export function TeamList({ members, currentUserId, isAdmin }: TeamListProps) {
  const router = useRouter();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: OrgRole) => {
    setUpdatingRole(userId);
    try {
      await updateMemberRole({ userId, role: newRole });
      toast.success("Role updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleRemove = async (userId: string) => {
    setIsSubmitting(true);
    try {
      await removeMember({ userId });
      toast.success("Member removed from organization");
      setShowRemoveDialog(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await inviteMember(inviteEmail.trim());
      if (result.success) {
        toast.success(result.message);
        setShowInviteDialog(false);
        setInviteEmail("");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to invite member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const memberToRemove = members.find((m) => m.id === showRemoveDialog);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Organization Members</CardTitle>
            <CardDescription>
              {members.length} member{members.length !== 1 ? "s" : ""} in your organization
            </CardDescription>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {member.name?.charAt(0) ?? member.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {member.name ?? "No name"}
                      {member.id === currentUserId && (
                        <span className="text-xs text-muted-foreground ml-2">(you)</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {isAdmin && member.id !== currentUserId ? (
                    <Select
                      value={member.orgRole}
                      onValueChange={(value) => handleRoleChange(member.id, value as OrgRole)}
                      disabled={updatingRole === member.id}
                    >
                      <SelectTrigger className="w-[180px]">
                        {updatingRole === member.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="FINANCE">Finance Reviewer</SelectItem>
                        <SelectItem value="EDITOR">Initiative Owner</SelectItem>
                        <SelectItem value="CONTRIBUTOR">Contributor</SelectItem>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={roleColors[member.orgRole]}>
                      {roleLabels[member.orgRole]}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    Joined {new Date(member.createdAt).toLocaleDateString()}
                  </span>
                  {isAdmin && member.id !== currentUserId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setShowRemoveDialog(member.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Enter the email address of the person you want to add.
              They must have an existing account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={isSubmitting || !inviteEmail.trim()}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!showRemoveDialog} onOpenChange={() => setShowRemoveDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToRemove?.name || memberToRemove?.email} from
              your organization? They will lose access to all initiatives and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showRemoveDialog && handleRemove(showRemoveDialog)}
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
