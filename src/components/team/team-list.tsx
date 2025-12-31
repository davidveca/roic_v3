"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date;
}

interface TeamListProps {
  members: TeamMember[];
  currentUserId: string;
}

export function TeamList({ members, currentUserId }: TeamListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
        <CardDescription>
          {members.length} user{members.length !== 1 ? "s" : ""} with access
        </CardDescription>
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
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Joined {new Date(member.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
