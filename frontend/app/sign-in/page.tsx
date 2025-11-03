// "use client"

// import type React from "react"

// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import Link from "next/link"
// import { useState } from "react"

// export default function SignInPage() {
//   const [email, setEmail] = useState("")
//   const [password, setPassword] = useState("")

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault()
//     // No functionality - just UI
//     console.log("Sign in form submitted (no backend)")
//   }

//   return (
//     <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
//       <div className="w-full max-w-md">
//         <div className="border-2 border-foreground">
//           {/* Header */}
//           <div className="border-b-2 border-foreground p-6 bg-background flex items-center justify-between">
//             <Link href="/" className="font-mono text-xl font-bold tracking-tight hover:opacity-80 transition-opacity">
//               FOURPAGE <span className="text-sm font-normal text-muted-foreground">Sixty Lens</span>
//             </Link>
//             <Link
//               href="/"
//               className="font-mono text-xl font-bold hover:opacity-80 transition-opacity"
//               aria-label="Close"
//             >
//               ×
//             </Link>
//           </div>

//           {/* Form */}
//           <div className="p-6 space-y-6">
//             <div>
//               <h1 className="font-mono text-2xl font-bold tracking-tight uppercase">Sign In</h1>
//               <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mt-2">
//                 Access your account
//               </p>
//             </div>

//             <form onSubmit={handleSubmit} className="space-y-4">
//               <div className="space-y-2">
//                 <label className="font-mono text-xs uppercase tracking-wider">Email</label>
//                 <Input
//                   type="email"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   placeholder="your@email.com"
//                   className="font-mono"
//                   required
//                 />
//               </div>

//               <div className="space-y-2">
//                 <label className="font-mono text-xs uppercase tracking-wider">Password</label>
//                 <Input
//                   type="password"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   placeholder="••••••••"
//                   className="font-mono"
//                   required
//                 />
//               </div>

//               <Button type="submit" className="w-full font-mono uppercase tracking-wider">
//                 Sign In
//               </Button>
//             </form>

//             <div className="border-t-2 border-foreground pt-4">
//               <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider text-center">
//                 Don't have an account?{" "}
//                 <Link href="/sign-up" className="text-foreground hover:opacity-80 transition-opacity">
//                   Sign Up
//                 </Link>
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }


"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { login } from "@/lib/api"
import { setToken } from "@/lib/auth"

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await login({ email, password })
      setToken(response.access_token)
      router.push("/") // Redirect to home
    } catch (err: any) {
      setError(err.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="border-2 border-foreground">
          {/* Header */}
          <div className="border-b-2 border-foreground p-6 bg-background flex items-center justify-between">
            <Link href="/" className="font-mono text-xl font-bold tracking-tight hover:opacity-80 transition-opacity">
              FOURPAGE <span className="text-sm font-normal text-muted-foreground">Sixty Lens</span>
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
              <h1 className="font-mono text-2xl font-bold tracking-tight uppercase">Sign In</h1>
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mt-2">
                Access your account
              </p>
            </div>

            {error && (
              <div className="border-2 border-red-500 bg-red-500/10 p-3">
                <p className="font-mono text-xs text-red-500 uppercase tracking-wider">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="font-mono text-xs uppercase tracking-wider">Email</label>
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
                <label className="font-mono text-xs uppercase tracking-wider">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="font-mono"
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full font-mono uppercase tracking-wider"
                disabled={loading}
              >
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            <div className="border-t-2 border-foreground pt-4">
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider text-center">
                Don't have an account?{" "}
                <Link href="/sign-up" className="text-foreground hover:opacity-80 transition-opacity">
                  Sign Up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}