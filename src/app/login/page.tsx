"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("carolina@skin360facebodyscalp.com");
  const [password, setPassword] = React.useState("••••••••••");

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-ivory px-4">
      {/* soft gold ambiance */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-gold-100/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -left-24 h-80 w-96 rounded-full bg-sand/60 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex size-16 items-center justify-center rounded-full border border-gold-200 bg-white shadow-sm">
            <span className="font-heading text-2xl text-gold-600">S</span>
          </div>
          <Logo className="text-center [&>div:first-child]:text-3xl" />
        </div>

        <div className="rounded-3xl border border-line bg-white p-8 shadow-sm sm:p-10">
          <h1 className="text-center text-2xl">Welcome back</h1>
          <p className="mt-1 text-center text-sm font-light text-muted-warm">
            Sign in to your business suite
          </p>

          <form
            className="mt-8 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              router.push("/dashboard");
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs tracking-wide uppercase text-muted-warm">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-warm" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-full border-line bg-ivory/50 pl-11 focus-visible:border-gold-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs tracking-wide uppercase text-muted-warm">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-warm" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-full border-line bg-ivory/50 pl-11 focus-visible:border-gold-300"
                />
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                className="text-xs font-light text-gold-700 hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" size="lg" className="w-full">
              Sign In
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs font-light text-muted-warm">
          Skin 360 Business Suite · Internal use only
        </p>
      </div>
    </div>
  );
}
