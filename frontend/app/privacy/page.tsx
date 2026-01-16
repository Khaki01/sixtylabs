import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b-2 border-foreground p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <Link href="/">
              <h1 className="text-2xl font-bold font-mono hover:opacity-60 transition-opacity">FOURPAGE</h1>
            </Link>
            <span className="text-muted-foreground text-sm">by Sixty Lens</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/app" className="hover:opacity-60 transition-opacity">
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <section className="flex-1 px-6 py-20">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2">Privacy Policy</h1>
            <p className="text-muted-foreground">Last Updated: 10 November 2025</p>
          </div>

          <div className="space-y-8 text-muted-foreground leading-relaxed">
            <p>
              This Privacy Policy explains how Sixty Lens collects, uses,
              stores, and protects personal information when you use FOURPAGE.
            </p>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">1. Who We Are</h2>
              <p>
                Sixty Lens ("we", "us", "our") operates the FOURPAGE Service.
                We are responsible for handling your data under applicable
                law.
              </p>
              <p>
                Contact:{" "}
                <a
                  href="mailto:support@sixtylens.com"
                  className="underline hover:opacity-80 text-foreground"
                >
                  support@sixtylens.com
                </a>
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">2. Information We Collect</h2>
              <p>We collect only what is necessary to operate the Service:</p>

              <div className="space-y-4 pl-6">
                <div>
                  <p className="font-bold text-foreground">Information you provide</p>
                  <ul className="list-disc pl-6 space-y-1 mt-2">
                    <li>Email + account credentials</li>
                    <li>Uploaded audio + project files</li>
                    <li>In-product settings & project data</li>
                    <li>Communications sent to us (support requests, bug reports)</li>
                  </ul>
                </div>

                <div>
                  <p className="font-bold text-foreground">Automatically collected</p>
                  <ul className="list-disc pl-6 space-y-1 mt-2">
                    <li>Basic usage analytics (e.g. which features are used, performance metrics)</li>
                  </ul>
                </div>

                <div>
                  <p className="font-bold text-foreground">We do NOT collect:</p>
                  <ul className="list-disc pl-6 space-y-1 mt-2">
                    <li>IP address</li>
                    <li>Device type</li>
                    <li>Operating system</li>
                  </ul>
                </div>
              </div>

              <p>We avoid collecting identifying metadata unless required for login.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">3. How We Use Data</h2>
              <p>We use your data to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Provide core Service functionality</li>
                <li>Save your projects</li>
                <li>Improve usability and features</li>
                <li>Maintain security</li>
                <li>Provide support</li>
              </ul>
              <p>Usage analytics may be anonymized or aggregated to improve the Service.</p>
              <p className="font-bold text-foreground">We do not:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Sell personal information</li>
                <li>Use User Content for advertising</li>
                <li>Commercially exploit your User Content</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">4. Legal Basis</h2>
              <p>Depending on region, processing is based on:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Performance of contract (providing FOURPAGE)</li>
                <li>Legitimate interests (service improvement, stability)</li>
                <li>Consent (e.g. for non-essential cookies)</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">5. Sharing & Disclosure</h2>
              <p>We may share data with:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Cloud hosting/service providers</li>
                <li>Authentication services</li>
                <li>Analytics services</li>
              </ul>
              <p>Only to support operation + improvement.</p>
              <p>We may disclose information if required by law.</p>
              <p className="font-bold text-foreground">We do not sell personal data.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">6. Data Retention</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>We keep project + account data while your account is active.</li>
                <li>If you delete your account, we delete personal data within <strong>30 days</strong>.</li>
                <li>Aggregated/anonymized analytics may be retained.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">7. Cookies</h2>
              <p>We may use:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Strictly necessary cookies (authentication)</li>
                <li>Optional analytics cookies (with consent)</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">8. Security</h2>
              <p>
                We use reasonable technical and organizational measures to
                protect your data. No system is perfectly secure — use at your
                own risk.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">9. Your Rights</h2>
              <p>Depending on region, you may request:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Access</li>
                <li>Correction</li>
                <li>Deletion</li>
                <li>Data export</li>
                <li>Withdrawal of consent</li>
              </ul>
              <p>
                Contact:{" "}
                <a
                  href="mailto:support@sixtylens.com"
                  className="underline hover:opacity-80 text-foreground"
                >
                  support@sixtylens.com
                </a>
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">10. Changes</h2>
              <p>
                We may update this Policy and will notify you of significant
                changes. Continued use = acceptance.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">11. Contact</h2>
              <p>Sixty Lens</p>
              <p>
                Email:{" "}
                <a
                  href="mailto:support@sixtylens.com"
                  className="underline hover:opacity-80 text-foreground"
                >
                  support@sixtylens.com
                </a>
              </p>
            </section>
          </div>

          <div className="pt-8">
            <Link href="/">
              <Button variant="outline" className="border-2 border-foreground">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-foreground p-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>&copy; 2025 Sixty Lens. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
