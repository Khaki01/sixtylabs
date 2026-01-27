"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmEmail } from "@/lib/api";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

function ConfirmEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid confirmation link. No token provided.");
      return;
    }

    const confirm = async () => {
      try {
        const response = await confirmEmail(token);
        setStatus("success");
        setMessage(response.message);
        // Redirect to sign-in after a short delay
        setTimeout(() => {
          router.push("/sign-in");
        }, 3000);
      } catch (err: unknown) {
        setStatus("error");
        const errorMessage = err instanceof Error ? err.message : "Failed to confirm email";
        setMessage(errorMessage);
      }
    };

    confirm();
  }, [token, router]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="border-2 border-foreground">
          {/* Header */}
          <div className="border-b-2 border-foreground p-6 bg-background">
            <Link
              href="/"
              className="font-mono text-xl font-bold tracking-tight hover:opacity-80 transition-opacity"
            >
              FOURPAGE{" "}
              <span className="text-sm font-normal text-muted-foreground">
                Sixty Lens
              </span>
            </Link>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {status === "loading" && (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 border-2 border-foreground flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <h1 className="font-mono text-2xl font-bold tracking-tight uppercase">
                  Confirming Email
                </h1>
                <p className="font-mono text-sm text-muted-foreground">
                  Please wait while we verify your email address...
                </p>
              </div>
            )}

            {status === "success" && (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 border-2 border-green-500 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h1 className="font-mono text-2xl font-bold tracking-tight uppercase">
                  Email Confirmed
                </h1>
                <p className="font-mono text-sm text-muted-foreground">
                  {message}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  Redirecting to sign in...
                </p>
                <Button
                  onClick={() => router.push("/sign-in")}
                  className="w-full font-mono uppercase tracking-wider"
                >
                  Sign In Now
                </Button>
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 border-2 border-red-500 flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="font-mono text-2xl font-bold tracking-tight uppercase">
                  Confirmation Failed
                </h1>
                <p className="font-mono text-sm text-red-500">
                  {message}
                </p>
                <div className="space-y-2 w-full">
                  <Button
                    onClick={() => router.push("/sign-up")}
                    variant="outline"
                    className="w-full font-mono uppercase tracking-wider"
                  >
                    Sign Up Again
                  </Button>
                  <Button
                    onClick={() => router.push("/sign-in")}
                    className="w-full font-mono uppercase tracking-wider"
                  >
                    Sign In
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
          <div className="font-mono text-xl">Loading...</div>
        </div>
      }
    >
      <ConfirmEmailContent />
    </Suspense>
  );
}
