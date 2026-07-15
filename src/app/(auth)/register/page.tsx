"use client";

import { useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Eye, EyeOff, UserPlus, AlertCircle } from "lucide-react";
import { registerAction, type AuthFormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthFormState = { error: null };

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="animate-in fade-in duration-500">
      {/* Heading */}
      <div className="mb-7">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Apni shop register karein
        </h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Naya account banayein — sirf 1 minute lagega
        </p>
      </div>

      {/* Form */}
      <form action={formAction} className="space-y-4">
        {/* Business name */}
        <div className="space-y-1.5">
          <Label htmlFor="reg-businessName" className="text-slate-700 font-medium">
            Shop / Business Name
          </Label>
          <Input
            id="reg-businessName"
            name="businessName"
            placeholder="e.g. Babar General Store"
            required
            autoFocus
            className="h-10 rounded-xl border-slate-200 bg-white px-3.5 text-sm shadow-sm transition-all placeholder:text-slate-400 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
          />
        </div>

        {/* Owner name */}
        <div className="space-y-1.5">
          <Label htmlFor="reg-ownerName" className="text-slate-700 font-medium">
            Owner Name
          </Label>
          <Input
            id="reg-ownerName"
            name="ownerName"
            required
            className="h-10 rounded-xl border-slate-200 bg-white px-3.5 text-sm shadow-sm transition-all placeholder:text-slate-400 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
          />
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="reg-phone" className="text-slate-700 font-medium">
            Phone <span className="text-slate-400 font-normal">(optional)</span>
          </Label>
          <Input
            id="reg-phone"
            name="phone"
            type="tel"
            placeholder="0300 1234567"
            className="h-10 rounded-xl border-slate-200 bg-white px-3.5 text-sm shadow-sm transition-all placeholder:text-slate-400 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="reg-email" className="text-slate-700 font-medium">
            Email
          </Label>
          <Input
            id="reg-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="aap@example.com"
            className="h-10 rounded-xl border-slate-200 bg-white px-3.5 text-sm shadow-sm transition-all placeholder:text-slate-400 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
          />
        </div>

        {/* Password with eye toggle */}
        <div className="space-y-1.5">
          <Label htmlFor="reg-password" className="text-slate-700 font-medium">
            Password
          </Label>
          <div className="relative">
            <Input
              id="reg-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={6}
              required
              placeholder="••••••••"
              className="h-10 rounded-xl border-slate-200 bg-white px-3.5 pr-10 text-sm shadow-sm transition-all placeholder:text-slate-400 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-slate-400 transition-colors hover:text-slate-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-[18px] w-[18px]" />
              ) : (
                <Eye className="h-[18px] w-[18px]" />
              )}
            </button>
          </div>
        </div>

        {/* Error alert */}
        {state.error && (
          <div
            className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <span>{state.error}</span>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          disabled={pending}
          className="h-10 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-sm font-semibold text-white shadow-md shadow-emerald-600/25 transition-all hover:from-emerald-700 hover:to-teal-700 hover:shadow-lg hover:shadow-emerald-600/30 active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? (
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Creating account…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Create Account
            </span>
          )}
        </Button>
      </form>

      {/* Login link */}
      <p className="mt-6 text-center text-sm text-slate-500">
        Pehle se account hai?{" "}
        <Link
          href="/login"
          className="font-semibold text-emerald-600 transition-colors hover:text-emerald-700 hover:underline"
        >
          Login karein
        </Link>
      </p>
    </div>
  );
}
