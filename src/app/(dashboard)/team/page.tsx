import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users } from "lucide-react";

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

export default async function TeamPage() {
  const user = await requireAuth();

  const teamMembers = await prisma.user.findMany({
    where: { orgId: user.orgId },
    orderBy: [{ orgRole: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      orgRole: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Team Members
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your organization's team and permissions.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Members</CardTitle>
          <CardDescription>
            {teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""} in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamMembers.map((member) => (
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
                    <p className="font-medium">{member.name ?? "No name"}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className={roleColors[member.orgRole]}>
                    {roleLabels[member.orgRole]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Joined {new Date(member.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
