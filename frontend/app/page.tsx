import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Scissors, Waves, Download } from "lucide-react";
import { LandingAudioDemo } from "@/components/landing-audio-demo";
import { AuthNav } from "@/components/auth-nav";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b-2 border-foreground p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold font-mono">FOURPAGE</h1>
            <span className="text-muted-foreground text-sm">by Sixty Lens</span>
          </div>
          <nav className="flex items-center gap-6">
            <AuthNav />
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <h2 className="font-bold leading-tight text-balance text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
            Experimental Audio Manipulation
            <br />
            <span className="text-muted-foreground">In Your Browser</span>
          </h2>

          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed text-lg sm:text-xl md:text-2xl">
            Transform your audio with studio-grade effects. Sample chopping,
            granular synthesis, beat repeat, tremolo, and more. No installation
            required.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <Link href="/app">
              <Button
                size="lg"
                className="text-lg h-14 px-8 border-2 border-foreground"
              >
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Product Preview - Interactive Audio Demo */}
      <section className="border-t-2 border-foreground px-6 py-20 bg-muted/20">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold mb-4 text-center">Try it now</h3>
          <p className="text-muted-foreground text-center mb-8">
            Click play and toggle effects to hear the difference
          </p>

          <LandingAudioDemo />
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t-2 border-foreground px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-4xl font-bold mb-12 text-center">
            Built for Creators
          </h3>

          <div className="grid md:grid-cols-3 gap-1 border-2 border-foreground">
            {/* Feature 1 */}
            <div className="p-8 border-r-0 md:border-r-2 border-b-2 md:border-b-0 border-foreground bg-background hover:bg-muted transition-colors">
              <div className="w-12 h-12 border-2 border-foreground flex items-center justify-center mb-4">
                <Scissors className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold mb-2">
                Sample Chopping & Sequencer
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                Slice and dice your audio samples. Arrange and sequence your
                chops with precision timing.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 border-r-0 md:border-r-2 border-b-2 md:border-b-0 border-foreground bg-background hover:bg-muted transition-colors">
              <div className="w-12 h-12 border-2 border-foreground flex items-center justify-center mb-4">
                <Waves className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold mb-2">Experimental Effects</h4>
              <p className="text-muted-foreground leading-relaxed">
                Granular synthesis, beat repeat, reverb, tremolo, and more.
                Real-time processing with zero latency.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 bg-background hover:bg-muted transition-colors">
              <div className="w-12 h-12 border-2 border-foreground flex items-center justify-center mb-4">
                <Download className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold mb-2">Export Quality</h4>
              <p className="text-muted-foreground leading-relaxed">
                Download your processed audio with all effects rendered at full
                quality. No compromises.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t-2 border-foreground px-6 py-20 bg-foreground text-background">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h3 className="text-4xl md:text-5xl font-bold">Ready to create?</h3>
          <p className="text-xl opacity-80">
            No signup required. Start processing audio in seconds.
          </p>
          <Link href="/app">
            <Button
              size="lg"
              variant="default"
              className="text-lg h-14 px-8 border-2 border-background bg-background text-foreground hover:bg-background/90"
            >
              Get Started
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-foreground p-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>&copy; 2025 Sixty Lens. All rights reserved.</p>
          <div className="flex gap-6">
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
