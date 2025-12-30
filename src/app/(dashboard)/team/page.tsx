import { requireAuth } from "@/lib/auth-utils";
import { getTeamMembers } from "@/app/actions/team";
import { TeamList } from "@/components/team/team-list";
import { Users } from "lucide-react";

export default async function TeamPage() {
  const user = await requireAuth();
  const members = await getTeamMembers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Team Members
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization's team and permissions.
        </p>
      </div>

      <TeamList
        members={members}
        currentUserId={user.id}
        isAdmin={user.orgRole === "ADMIN"}
      />
    </div>
  );
}
