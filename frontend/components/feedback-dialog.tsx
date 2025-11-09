"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, X } from "lucide-react";
import FadeContent from "./fade-content";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function FeedbackDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<
    "bug" | "feedback" | "feature"
  >("feedback");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // TODO: Implement actual submission logic
    console.log("[v0] Feedback submitted:", { feedbackType, message });

    // Simulate submission
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setMessage("");
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="font-mono bg-transparent"
      >
        <MessageSquare className="w-4 h-4" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <FadeContent duration={200} initialOpacity={0}>
              <div className="border-2 border-foreground bg-background shadow-lg w-full max-w-md">
                {/* Header */}
                <div className="border-b-2 border-foreground p-4 flex items-center justify-between">
                  <h3 className="font-mono text-sm uppercase tracking-wider font-bold">
                    Feedback
                  </h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="hover:opacity-70 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                  <div className="space-y-2">
                    <label className="font-mono text-xs uppercase tracking-wider">
                      Type
                    </label>
                    <Select
                      value={feedbackType}
                      onValueChange={(value: "bug" | "feedback" | "feature") =>
                        setFeedbackType(value)
                      }
                    >
                      <SelectTrigger className="w-full font-mono uppercase tracking-wider border-2 border-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value="bug"
                          className="font-mono uppercase tracking-wider"
                        >
                          Bug Report
                        </SelectItem>
                        <SelectItem
                          value="feedback"
                          className="font-mono uppercase tracking-wider"
                        >
                          General Feedback
                        </SelectItem>
                        <SelectItem
                          value="feature"
                          className="font-mono uppercase tracking-wider"
                        >
                          Feature Request
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <label className="font-mono text-xs uppercase tracking-wider">
                      Message
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us what you think..."
                      className="w-full min-h-[120px] p-3 border-2 border-foreground bg-background font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-foreground"
                      required
                    />
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    className="w-full font-mono uppercase tracking-wider"
                    disabled={isSubmitting || !message.trim()}
                  >
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </Button>
                  <p className="text-xs font-mono text-muted-foreground text-center pt-0">
                    Contact us at{" "}
                    <a
                      href="mailto:support@sixtylens.com"
                      className="underline hover:text-foreground transition-colors"
                    >
                      support@sixtylens.com
                    </a>
                  </p>
                </form>
              </div>
            </FadeContent>
          </div>
        </>
      )}
    </div>
  );
}
