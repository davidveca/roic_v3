"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileStack,
  BarChart3,
  Settings,
  Users,
  BookOpen,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { signOut } from "next-auth/react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const mainNav: NavItem[] = [
  {
    title: "Initiatives",
    href: "/initiatives",
    icon: FileStack,
  },
  {
    title: "Portfolio",
    href: "/portfolio",
    icon: BarChart3,
  },
];

const secondaryNav: NavItem[] = [
  {
    title: "Driver Library",
    href: "/drivers",
    icon: BookOpen,
  },
  {
    title: "Team",
    href: "/team",
    icon: Users,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  user: {
    name: string | null;
    email: string;
    orgName?: string;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-gray-50/40 dark:bg-gray-900/40">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/initiatives" className="flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-blue-600" />
          <span className="font-semibold text-lg">ROIC Modeler</span>
        </Link>
      </div>

      {/* Organization */}
      {user.orgName && (
        <div className="px-6 py-3 border-b">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Organization</p>
          <p className="font-medium truncate">{user.orgName}</p>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
              {item.badge && (
                <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <Separator className="my-4" />

        <nav className="space-y-1">
          {secondaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          ))}
        </nav>
      </ScrollArea>

      {/* User Section */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-sm font-medium text-blue-700">
              {user.name?.charAt(0) ?? user.email.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name ?? "User"}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-gray-600"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
