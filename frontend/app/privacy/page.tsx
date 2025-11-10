"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PrivacyPage() {
  const router = useRouter();

  const handleClose = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
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
            <button
              onClick={handleClose}
              className="font-mono text-xl font-bold hover:opacity-80 transition-opacity"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            <div>
              <h1 className="font-mono text-2xl md:text-3xl font-bold tracking-tight uppercase">
                Privacy Policy
              </h1>
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mt-2">
                Last Updated: 10 November 2025
              </p>
            </div>

            <div className="font-mono space-y-6 text-sm leading-relaxed">
              <p>
                This Privacy Policy explains how Sixty Lens collects, uses,
                stores, and protects personal information when you use FOURPAGE.
              </p>

              <section className="space-y-3">
                <h2 className="text-lg font-bold">1. Who We Are</h2>
                <p>
                  Sixty Lens ("we", "us", "our") operates the FOURPAGE Service.
                  We are responsible for handling your data under applicable
                  law.
                </p>
                <p>
                  Contact:{" "}
                  <a
                    href="mailto:support@sixtylens.com"
                    className="underline hover:opacity-80"
                  >
                    support@sixtylens.com
                  </a>
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold">2. Information We Collect</h2>
                <p>We collect only what is necessary to operate the Service:</p>

                <div className="space-y-3 pl-4">
                  <div>
                    <p className="font-bold">Information you provide</p>
                    <ul className="list-disc pl-6 space-y-1 mt-1">
                      <li>Email + account credentials</li>
                      <li>Uploaded audio + project files</li>
                      <li>In-product settings & project data</li>
                      <li>
                        Communications sent to us (support requests, bug
                        reports)
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-bold">Automatically collected</p>
                    <ul className="list-disc pl-6 space-y-1 mt-1">
                      <li>
                        Basic usage analytics (e.g. which features are used,
                        performance metrics)
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-bold">We do NOT collect:</p>
                    <ul className="list-disc pl-6 space-y-1 mt-1">
                      <li>IP address</li>
                      <li>Device type</li>
                      <li>Operating system</li>
                    </ul>
                  </div>
                </div>

                <p>
                  We avoid collecting identifying metadata unless required for
                  login.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold">3. How We Use Data</h2>
                <p>We use your data to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Provide core Service functionality</li>
                  <li>Save your projects</li>
                  <li>Improve usability and features</li>
                  <li>Maintain security</li>
                  <li>Provide support</li>
                </ul>
                <p>
                  Usage analytics may be anonymized or aggregated to improve the
                  Service.
                </p>
                <p className="font-bold">We do not:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Sell personal information</li>
                  <li>Use User Content for advertising</li>
                  <li>Commercially exploit your User Content</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold">4. Legal Basis</h2>
                <p>Depending on region, processing is based on:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Performance of contract (providing FOURPAGE)</li>
                  <li>Legitimate interests (service improvement, stability)</li>
                  <li>Consent (e.g. for non-essential cookies)</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold">5. Sharing & Disclosure</h2>
                <p>We may share data with:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Cloud hosting/service providers</li>
                  <li>Authentication services</li>
                  <li>Analytics services</li>
                </ul>
                <p>Only to support operation + improvement.</p>
                <p>We may disclose information if required by law.</p>
                <p className="font-bold">We do not sell personal data.</p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold">6. Data Retention</h2>
                <ul className="list-disc pl-6 space-y-1">
                  <li>
                    We keep project + account data while your account is active.
                  </li>
                  <li>
                    If you delete your account, we delete personal data within{" "}
                    <strong>30 days</strong>.
                  </li>
                  <li>Aggregated/anonymized analytics may be retained.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold">7. Cookies</h2>
                <p>We may use:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Strictly necessary cookies (authentication)</li>
                  <li>Optional analytics cookies (with consent)</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold">8. Security</h2>
                <p>
                  We use reasonable technical and organizational measures to
                  protect your data. No system is perfectly secure — use at your
                  own risk.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold">9. Your Rights</h2>
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
                    className="underline hover:opacity-80"
                  >
                    support@sixtylens.com
                  </a>
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold">10. Changes</h2>
                <p>
                  We may update this Policy and will notify you of significant
                  changes. Continued use = acceptance.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold">11. Contact</h2>
                <p>Sixty Lens</p>
                <p>
                  Email:{" "}
                  <a
                    href="mailto:support@sixtylens.com"
                    className="underline hover:opacity-80"
                  >
                    support@sixtylens.com
                  </a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
