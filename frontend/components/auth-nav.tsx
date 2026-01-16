"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

export function AuthNav() {
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-4">
        <div className="h-9 w-20 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-4">
        <Link href="/app" className="hover:opacity-60 transition-opacity">
          Get Started
        </Link>
        <Link
          href="/profile"
          className="hover:opacity-60 transition-opacity border-l pl-4 flex justify-between items-center gap-1"
        >
          {/* <Button variant="outline" size="sm" className="font-mono gap-2"> */}
          <User className="w-4 h-4" />
          {user.username}
          {/* </Button> */}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Link href="/app" className="hover:opacity-60 transition-opacity">
        Get Started
      </Link>
      <Link
        href="/sign-in"
        className="hover:opacity-60 transition-opacity border-l pl-4"
      >
        Sign In
      </Link>
      <Link
        href="/sign-up"
        className="hover:opacity-60 transition-opacity border-l pl-4"
      >
        {/* <Button variant="outline" size="sm" className="font-mono"> */}
        Sign Up
        {/* </Button> */}
      </Link>
    </div>
  );
}
