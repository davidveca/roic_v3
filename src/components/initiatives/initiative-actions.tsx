"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Play, Loader2, GitBranch } from "lucide-react";
import { toast } from "sonner";
import { computeAllScenarios } from "@/app/actions/calculations";
import { createVersion } from "@/app/actions/versions";
import { updateInitiative } from "@/app/actions/initiatives";

interface InitiativeActionsProps {
  initiativeId: string;
  versionId: string | null;
  initiative: {
    title: string;
    description: string | null;
  };
}

export function InitiativeActions({
  initiativeId,
  versionId,
  initiative,
}: InitiativeActionsProps) {
  const router = useRouter();
  const [isComputing, setIsComputing] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showNewVersionDialog, setShowNewVersionDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    title: initiative.title,
    description: initiative.description || "",
  });
  const [versionNotes, setVersionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCompute = async () => {
    if (!versionId) {
      toast.error("No version found to compute");
      return;
    }

    setIsComputing(true);
    try {
      const result = await computeAllScenarios(versionId);
      toast.success(
        `Computed ${Object.keys(result.results).length} scenario(s) successfully`
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to compute scenarios"
      );
    } finally {
      setIsComputing(false);
    }
  };

  const handleEditSave = async () => {
    setIsSubmitting(true);
    try {
      await updateInitiative(initiativeId, {
        title: editForm.title,
        description: editForm.description || undefined,
      });
      toast.success("Initiative updated");
      setShowEditDialog(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update initiative"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateVersion = async () => {
    setIsSubmitting(true);
    try {
      await createVersion({
        initiativeId,
        copyFromVersionId: versionId || undefined,
        notes: versionNotes || undefined,
      });
      toast.success("New version created");
      setShowNewVersionDialog(false);
      setVersionNotes("");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create version"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNewVersionDialog(true)}
        >
          <GitBranch className="h-4 w-4 mr-2" />
          New Version
        </Button>
        <Button size="sm" onClick={handleCompute} disabled={isComputing || !versionId}>
          {isComputing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Compute
        </Button>
      </div>

      {/* Edit Initiative Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Initiative</DialogTitle>
            <DialogDescription>
              Update the initiative title and description.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Version Dialog */}
      <Dialog open={showNewVersionDialog} onOpenChange={setShowNewVersionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Version</DialogTitle>
            <DialogDescription>
              {versionId
                ? "Create a new version copying all driver values and scenarios from the current version."
                : "Create the first version for this initiative."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Version Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="What changes are in this version?"
                value={versionNotes}
                onChange={(e) => setVersionNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewVersionDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateVersion} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
