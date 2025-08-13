"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Phone } from "lucide-react"
import Image from "next/image"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          if (userData.role === "admin") {
            router.push("/admin")
          } else if (userData.role === "counter") {
            router.push("/counter")
          }
        }
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        if (userData.role === "admin") {
          router.push("/admin")
        } else if (userData.role === "counter") {
          router.push("/counter")
        }
      } else {
        setError("User role not found. Please contact administrator.")
      }
    } catch (error: any) {
      setError("Invalid credentials. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Image
                src="/sashambhu-new-logo.jpg"
                alt="Sashambhu Playzone & Skatepark Logo"
                width={120}
                height={120}
                className="rounded-lg shadow-lg"
                priority
              />
            </div>
          </div>

          <CardTitle className="text-2xl font-bold text-gray-800">Sashambhu Play Station</CardTitle>
          <CardDescription>
            <div className="text-gray-700 font-medium">PlayStation & Skateboard Gaming</div>
            <div className="text-sm text-gray-500 mt-1 flex flex-col items-center justify-center gap-1">
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                Mahalaxmi-9, Lalitpur
                <div className="w-1 h-1 bg-red-500 rounded-full"></div>
              </div>
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                <span className="font-semibold">Contact:</span> 9706531331, 9708904636
              </div>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
