"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TermsPage() {
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
                Terms of Service
              </h1>
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mt-2">
                Last Updated: 10 November 2025
              </p>
            </div>

            <div className="font-mono space-y-6 text-sm leading-relaxed">
              <p>
                These Terms of Service ("Terms") apply to your use of the
                FOURPAGE audio application and related services ("Service")
                operated by <strong>Sixty Lens</strong> ("we", "us", "our"). By
                creating an account, uploading content, or using the Service,
                you agree to these Terms. If you do not agree, you must not use
                the Service.
              </p>

              <section className="space-y-3">
                <h2 className="font-bold text-base">1. Eligibility</h2>
                <p>
                  You must be at least 13 years old (or the minimum legal age in
                  your jurisdiction). If accessing the Service on behalf of
                  another person or entity, you confirm you are authorized to
                  bind that entity.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="font-bold text-base">
                  2. Description of Service
                </h2>
                <p>
                  FOURPAGE is a web-based audio environment that allows users to
                  upload audio, chop, arrange and manipulate samples, apply
                  effects, save projects, and export results. The Service is
                  provided in <strong>Beta</strong>, meaning features may
                  change, break, or be removed without notice.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="font-bold text-base">3. Accounts</h2>
                <p>
                  You must create an account to save projects. You must provide
                  accurate information and safeguard your login credentials. You
                  are responsible for all activity under your account.
                </p>
                <p>
                  We may suspend or terminate your account at any time if you
                  violate these Terms.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="font-bold text-base">4. User Content</h2>

                <div className="space-y-2">
                  <h3 className="font-semibold">4.1 Definition</h3>
                  <p>
                    "User Content" means any audio files, samples, project
                    files, settings, metadata, or other materials you upload,
                    import, or create using the Service.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">4.2 Ownership</h3>
                  <p>
                    You retain all rights to your User Content. We do{" "}
                    <strong>not</strong> claim ownership over your User Content.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">4.3 Responsibility</h3>
                  <p>
                    You are solely responsible for your User Content. This
                    includes ensuring that any sampling, uploading, processing,
                    or exporting complies with copyright, licensing, and other
                    applicable laws.
                  </p>
                  <p>
                    We do not monitor or verify User Content for rights or
                    legality.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">
                    4.4 Limited Licence to Sixty Lens
                  </h3>
                  <p>
                    To provide and improve the Service, you grant Sixty Lens a{" "}
                    <strong>
                      limited, non-exclusive, worldwide, royalty-free licence
                    </strong>{" "}
                    to:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>receive</li>
                    <li>store</li>
                    <li>process (e.g., DSP, automated usage analysis)</li>
                    <li>transmit</li>
                    <li>display back to you</li>
                  </ul>
                  <p className="font-semibold">
                    solely as necessary to operate, maintain, and improve the
                    Service.
                  </p>
                  <p>
                    We will <strong>not</strong>:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>publicly distribute,</li>
                    <li>sell,</li>
                    <li>license,</li>
                    <li>or otherwise commercially exploit</li>
                  </ul>
                  <p>your User Content without your explicit permission.</p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">4.5 Removal</h3>
                  <p>
                    We may remove User Content if legally required to do so
                    (e.g. rights-holder complaint). We do not proactively
                    monitor.
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="font-bold text-base">
                  5. Intellectual Property — Service
                </h2>
                <p>
                  All rights in FOURPAGE, including software, design, UI,
                  trademarks, and documentation, belong to Sixty Lens or its
                  licensors. You receive a limited licence to use the Service
                  subject to these Terms.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="font-bold text-base">6. Beta Disclaimer</h2>
                <p>
                  The Service is provided on a <strong>Beta</strong>, "AS IS"
                  and "AS AVAILABLE" basis. Features may fail or change without
                  notice. Use is at your own risk.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="font-bold text-base">7. Third-Party Services</h2>
                <p>
                  We may rely on third-party hosting, analytics or
                  authentication providers. Your data may be stored or processed
                  by such providers solely to support the Service.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="font-bold text-base">8. Termination</h2>
                <p>
                  You may delete your account at any time. We may suspend or
                  terminate your account at any time for any reason. Upon
                  termination, we will delete your personal data according to
                  our Privacy Policy.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="font-bold text-base">
                  9. Warranties & Disclaimers
                </h2>
                <p>
                  To the maximum extent permitted by law, we disclaim all
                  warranties, express or implied, including:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>merchantability,</li>
                  <li>fitness for purpose,</li>
                  <li>non-infringement,</li>
                  <li>uninterrupted use.</li>
                </ul>
                <p>
                  We do not guarantee that the Service will meet your needs or
                  be error-free.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="font-bold text-base">
                  10. Limitation of Liability
                </h2>
                <p>
                  To the fullest extent permitted by law, Sixty Lens is not
                  liable for:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>indirect,</li>
                  <li>incidental,</li>
                  <li>special,</li>
                  <li>consequential</li>
                </ul>
                <p>damages.</p>
                <p>
                  Our total liability arising from the Service is limited to{" "}
                  <strong>USD $100</strong>.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="font-bold text-base">11. Indemnification</h2>
                <p>
                  You agree to indemnify Sixty Lens from claims arising from:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>your use of the Service,</li>
                  <li>your User Content,</li>
                  <li>your violation of these Terms.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="font-bold text-base">12. Changes</h2>
                <p>
                  We may change these Terms at any time. Significant changes
                  will be posted or emailed. Continued use indicates acceptance.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="font-bold text-base">13. Governing Law</h2>
                <p>
                  These Terms are governed by the laws of{" "}
                  <strong>England and Wales</strong>. Any dispute will be
                  handled exclusively in the courts of England and Wales.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="font-bold text-base">14. Contact</h2>
                <p>
                  Sixty Lens
                  <br />
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
