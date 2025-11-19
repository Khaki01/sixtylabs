"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Menu, X } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import FeedbackDialog from "@/components/feedback-dialog";
import { LogoLoop } from "@/components/logo-loop";
import "@/components/logo-loop.css";

export default function DesktopHomePage() {
  const { theme, setTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsSignedIn(isAuthenticated());
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  const workstationItems = Array(8)
    .fill(null)
    .map((_, i) => ({
      node: (
        <span className="font-mono text-sm uppercase tracking-wider">
          WORKSTATION
        </span>
      ),
    }));

  const folders = [
    {
      name: "PROJECTS",
      description: "Your Projects",
      route: "/projects", // Added route for projects folder
    },
  ];

  const apps = [
    {
      name: "FOURPAGE",
      route: "/",
      description: "Audio Manipulator",
    },
  ];

  return (
    <main className="min-h-screen bg-background p-8 flex flex-col">
      {/* Top Bar */}
      <div className="border-2 border-foreground p-3 mb-8 flex items-center justify-between">
        <div className="flex-1 overflow-hidden">
          <LogoLoop
            logos={workstationItems}
            speed={20}
            direction="left"
            width="100%"
            logoHeight={20}
            gap={48}
            pauseOnHover={false}
            hoverSpeed={10}
          />
        </div>
        <button
          onClick={() => setIsMenuOpen(true)}
          className="border-2 border-foreground p-2 hover:bg-foreground hover:text-background transition-colors ml-4"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            className="bg-background border-2 border-foreground w-full max-w-md font-mono relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b-2 border-foreground p-6 bg-background flex items-center justify-between">
              <h2 className="font-mono text-xl font-bold tracking-tight uppercase">
                MAIN MENU
              </h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="font-mono text-xl font-bold hover:opacity-80 transition-opacity"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-4">
                {isSignedIn ? (
                  <Link href="/profile" className="block">
                    <button
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full text-left hover:bg-foreground hover:text-background transition-colors px-3 py-2 tracking-widest text-sm"
                    >
                      1 PROFILE
                    </button>
                  </Link>
                ) : (
                  <Link href="/sign-in" className="block">
                    <button
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full text-left hover:bg-foreground hover:text-background transition-colors px-3 py-2 tracking-widest text-sm"
                    >
                      1 SIGN IN
                    </button>
                  </Link>
                )}
                <div className="relative">
                  <button
                    className="w-full text-left hover:bg-foreground hover:text-background transition-colors px-3 py-2 tracking-widest text-sm"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsFeedbackOpen(true);
                    }}
                  >
                    2 FEEDBACK
                  </button>
                </div>

                {mounted && (
                  <button
                    onClick={() => {
                      setTheme(theme === "dark" ? "light" : "dark");
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left hover:bg-foreground hover:text-background transition-colors px-3 py-2 tracking-widest text-sm"
                  >
                    3 {theme === "dark" ? "LIGHT MODE" : "DARK MODE"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-full">
        <FeedbackDialog
          openValue={isFeedbackOpen}
          onOpenChange={() => setIsFeedbackOpen(false)}
        />
      </div>

      {/* Desktop Grid */}
      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 content-start">
        {apps.map((app) => (
          <Link
            key={app.route}
            href={app.route}
            className="flex flex-col items-center gap-4 group"
          >
            {/* App Icon */}
            <div className="w-24 h-24 border-2 border-foreground bg-background flex items-center justify-center transition-colors hover:bg-foreground hover:text-background">
              <div className="flex items-center justify-center gap-[2px] h-6">
                <div className="w-[2px] bg-current h-0.5"></div>
                <div className="w-[2px] bg-current h-1"></div>
                <div className="w-[2px] bg-current h-1"></div>
                <div className="w-[2px] bg-current h-3"></div>
                <div className="w-[2px] bg-current h-3"></div>
                <div className="w-[2px] bg-current h-4"></div>
                <div className="w-[2px] bg-current h-3"></div>
                <div className="w-[2px] bg-current h-7"></div>
                <div className="w-[2px] h-6 bg-current"></div>
                <div className="w-[2px] bg-current h-5"></div>
                <div className="w-[2px] bg-current h-3"></div>
                <div className="w-[2px] bg-current h-2"></div>
                <div className="w-[2px] h-3 bg-current"></div>
                <div className="w-[2px] bg-current h-2"></div>
                <div className="w-[2px] bg-current h-2"></div>
                <div className="w-[2px] bg-current h-1"></div>
                <div className="w-[2px] bg-current h-0.5"></div>
              </div>
            </div>
            {/* App Label */}
            <div className="text-center">
              <div className="font-mono text-sm uppercase tracking-wider">
                {app.name}
              </div>
              <div className="font-mono text-xs text-muted-foreground">
                {app.description}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Bottom Bar */}
      <div className="border-2 border-foreground p-3 mt-8">
        <div className="font-mono text-xs uppercase tracking-wider text-center">
          {currentTime || "00:00:00"} | support@sixtylens.com
        </div>
      </div>
    </main>
  );
}
