"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { Checkbox } from "@/components/ui/checkbox";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!agreedToTerms) {
      setError(
        "Please acknowledge Terms of Service and Privacy Policies to proceed further."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await signUp({ email, username, password });
      setToken(response.access_token);
      router.push("/"); // Redirect to home
    } catch (err: any) {
      setError(err.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="border-2 border-foreground">
          {/* Header */}
          <div className="border-b-2 border-foreground p-6 bg-background flex items-center justify-between">
            <Link
              href="/"
              className="font-mono text-xl font-bold tracking-tight hover:opacity-80 transition-opacity"
            >
              FOURPAGE{" "}
              <span className="text-sm font-normal text-muted-foreground">
                Sixty Lens
              </span>
            </Link>
            <Link
              href="/"
              className="font-mono text-xl font-bold hover:opacity-80 transition-opacity"
              aria-label="Close"
            >
              ×
            </Link>
          </div>

          {/* Form */}
          <div className="p-6 space-y-6">
            <div>
              <h1 className="font-mono text-2xl font-bold tracking-tight uppercase">
                Sign Up
              </h1>
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mt-2">
                Create your account
              </p>
            </div>

            {error && (
              <div className="border-2 border-red-500 bg-red-500/10 p-3">
                <p className="font-mono text-xs text-red-500 uppercase tracking-wider">
                  {error}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="font-mono text-xs uppercase tracking-wider">
                  Username
                </label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className="font-mono"
                  required
                  minLength={3}
                />
              </div>

              <div className="space-y-2">
                <label className="font-mono text-xs uppercase tracking-wider">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="font-mono"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="font-mono text-xs uppercase tracking-wider">
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="font-mono"
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <label className="font-mono text-xs uppercase tracking-wider">
                  Confirm Password
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="font-mono"
                  required
                />
              </div>

              <div className="flex items-start gap-3 pt-2">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) =>
                    setAgreedToTerms(checked as boolean)
                  }
                  required
                  className="mt-0.5"
                />
                <label
                  htmlFor="terms"
                  className="font-mono text-xs leading-relaxed cursor-pointer"
                >
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    className="underline hover:opacity-80 transition-opacity"
                    target="_blank"
                  >
                    Terms and Conditions
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="underline hover:opacity-80 transition-opacity"
                    target="_blank"
                  >
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <Button
                type="submit"
                className="w-full font-mono uppercase tracking-wider"
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Sign Up"}
              </Button>
            </form>

            <div className="border-t-2 border-foreground pt-4">
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider text-center">
                Already have an account?{" "}
                <Link
                  href="/sign-in"
                  className="text-foreground hover:opacity-80 transition-opacity"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
