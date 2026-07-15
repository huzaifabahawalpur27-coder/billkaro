"use client";

import { useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import { loginAction, type AuthFormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthFormState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="animate-in fade-in duration-500">
      {/* Heading */}
      <div className="mb-7">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Apni dukaan mein login karein
        </h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Email aur password enter karein
        </p>
      </div>

      {/* Form */}
      <form action={formAction} className="space-y-5">
        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="login-email" className="text-slate-700 font-medium">
            Email
          </Label>
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            placeholder="aap@example.com"
            className="h-10 rounded-xl border-slate-200 bg-white px-3.5 text-sm shadow-sm transition-all placeholder:text-slate-400 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
          />
        </div>

        {/* Password with eye toggle */}
        <div className="space-y-1.5">
          <Label htmlFor="login-password" className="text-slate-700 font-medium">
            Password
          </Label>
          <div className="relative">
            <Input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
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
              Logging in…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              Login
            </span>
          )}
        </Button>
      </form>

      {/* Register link */}
      <p className="mt-6 text-center text-sm text-slate-500">
        Naya account?{" "}
        <Link
          href="/register"
          className="font-semibold text-emerald-600 transition-colors hover:text-emerald-700 hover:underline"
        >
          Register karein
        </Link>
      </p>
    </div>
  );
}
