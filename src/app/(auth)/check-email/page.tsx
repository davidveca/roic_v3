import { Mail } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CheckEmailPage() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <Mail className="h-6 w-6 text-amber-600" />
        </div>
        <h2 className="mb-2 text-xl font-bold">Check your email</h2>
        <p className="text-gray-500">
          We sent a sign-in link to your email address.
        </p>
        <p className="mt-4 text-sm text-gray-400">
          Click the link in the email to sign in. The link expires in 24 hours.
        </p>
        <Button variant="outline" className="mt-6" asChild>
          <Link href="/login">Back to sign in</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
