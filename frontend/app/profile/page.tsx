"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/api";
import { getToken, removeToken, isAuthenticated } from "@/lib/auth";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/sign-in");
      return;
    }

    const fetchUser = async () => {
      try {
        const token = getToken();
        if (token) {
          const userData = await getCurrentUser(token);
          setUser(userData);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        router.push("/sign-in");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleSignOut = () => {
    removeToken();
    router.push("/");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
        <div className="font-mono text-xl">Loading...</div>
      </main>
    );
  }

  if (!user) return null;

  const initials = user.username.substring(0, 2).toUpperCase();
  const joinedDate = new Date(user.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="border-b-2 border-foreground pb-4 mb-6">
          <Link href="/">
            <Button
              variant="outline"
              size="text"
              className="font-mono uppercase tracking-wider bg-transparent mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="font-mono text-3xl md:text-4xl font-bold tracking-tight">
            PROFILE
          </h1>
        </div>

        <div className="border-2 border-foreground bg-muted/30 p-6 space-y-6">
          <div className="flex items-center gap-4 pb-4 border-b-2 border-foreground">
            <Avatar className="w-20 h-20 border-2 border-foreground">
              <AvatarFallback className="bg-foreground text-background font-mono text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-mono text-xl font-bold uppercase tracking-wider">
                {user.username}
              </h2>
              <p className="font-mono text-sm text-muted-foreground uppercase tracking-wider">
                User
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 border-2 border-foreground bg-background">
              <User className="w-5 h-5" />
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Username
                </p>
                <p className="font-mono text-sm">{user.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border-2 border-foreground bg-background">
              <Mail className="w-5 h-5" />
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Email
                </p>
                <p className="font-mono text-sm">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border-2 border-foreground bg-background">
              <Calendar className="w-5 h-5" />
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Member Since
                </p>
                <p className="font-mono text-sm">{joinedDate}</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t-2 border-foreground space-y-2">
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full font-mono uppercase tracking-wider bg-transparent"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
