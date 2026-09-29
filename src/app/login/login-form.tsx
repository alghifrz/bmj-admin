"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import content from "@/data/content.json";

const copy = content.login;

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [remember, setRemember] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(body?.error || copy.errors.unavailable);
        setPending(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError(copy.errors.unavailable);
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <div className="relative rounded-xl border border-slate-200 bg-white transition-all focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200">
          <label className="block px-3.5 pt-2.5 text-[11px] font-medium text-slate-400 select-none" htmlFor="email">
            {copy.emailLabel}
          </label>
          <input
            autoComplete="username"
            className="block w-full border-0 bg-transparent px-3.5 pt-0.5 pb-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-0 focus:outline-none disabled:opacity-60"
            disabled={pending}
            id="email"
            inputMode="email"
            maxLength={254}
            name="email"
            placeholder={copy.emailPlaceholder}
            required
            type="email"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
          />
        </div>
      </div>

      <div>
        <div className="relative rounded-xl border border-slate-200 bg-white transition-all focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200">
          <label
            className="block px-3.5 pt-2.5 text-[11px] font-medium text-slate-400 select-none"
            htmlFor="password"
          >
            {copy.passwordLabel}
          </label>
          <input
            autoComplete="current-password"
            className={`block w-full border-0 bg-transparent px-3.5 pt-0.5 pr-11 pb-2.5 font-sans text-sm text-slate-800 placeholder:text-slate-400 placeholder:tracking-widest focus:ring-0 focus:outline-none disabled:opacity-60 ${passwordVisible ? "tracking-normal" : "tracking-widest"}`}
            disabled={pending}
            id="password"
            maxLength={72}
            name="password"
            placeholder={copy.passwordPlaceholder}
            required
            type={passwordVisible ? "text" : "password"}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
          />
          <button
            aria-controls="password"
            aria-label={passwordVisible ? copy.hidePassword : copy.showPassword}
            aria-pressed={passwordVisible}
            className="absolute right-2 bottom-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            onClick={() => setPasswordVisible((visible) => !visible)}
            type="button"
          >
            {passwordVisible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 pb-1">
        <span className="text-xs font-normal text-slate-500 sm:text-sm" id="remember-label">
          {copy.remember}
        </span>
        <label className="relative inline-flex cursor-pointer items-center select-none" htmlFor="remember-toggle">
          <input
            aria-labelledby="remember-label"
            checked={remember}
            className="peer sr-only"
            disabled={pending}
            id="remember-toggle"
            onChange={(event) => setRemember(event.target.checked)}
            type="checkbox"
          />
          <div className="h-6 w-11 rounded-full bg-slate-300 transition-colors duration-200 ease-in-out peer-checked:bg-slate-800 peer-focus-visible:ring-2 peer-focus-visible:ring-slate-300 peer-focus-visible:ring-offset-2" />
          <div className="pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out peer-checked:translate-x-5" />
        </label>
      </div>

      {error ? (
        <p className="text-sm text-red-700" id="login-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="pt-2">
        <button
          className="w-full rounded-xl bg-brand-green px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-green-deep focus:outline-2 focus:outline-offset-2 focus:outline-slate-900 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
          disabled={pending}
          type="submit"
        >
          {pending ? copy.submitting : copy.submit}
        </button>
      </div>
    </form>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M4 4.5 20 19.5" strokeLinecap="round" />
      <path d="M9.5 9.8A3 3 0 0 0 12 15a3 3 0 0 0 2.2-1" strokeLinecap="round" />
      <path
        d="M6.2 7.2C4.2 8.6 2.5 12 2.5 12S6 17.5 12 17.5c1.5 0 2.8-.4 4-.9M10.2 6.7A10 10 0 0 1 12 6.5c6 0 9.5 5.5 9.5 5.5a16 16 0 0 1-2.2 2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
