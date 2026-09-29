"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import content from "@/data/content.json";
import type { AdminProfile } from "@/lib/api";

const copy = content.account;
const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-green-deep focus:ring-2 focus:ring-brand-green/30";

type Draft = {
  name: string;
  email: string;
  current_password: string;
  new_password: string;
  confirm_password: string;
};

export function AccountManager({ admin }: { admin: AdminProfile }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>({
    name: admin.name,
    email: admin.email,
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateAccount(draft, admin.email);
    setErrors(nextErrors);
    setNotice("");
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const response = await fetch("/api/admin/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          email: draft.email.trim(),
          current_password: draft.current_password,
          new_password: draft.new_password,
        }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string; name?: string; email?: string } | null;
      if (!response.ok || !body?.name || !body.email) {
        setFormError(body?.error || copy.errors.unavailable);
        return;
      }
      setDraft({
        name: body.name,
        email: body.email,
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      setNotice(copy.saved);
      router.refresh();
    } catch {
      setFormError(copy.errors.unavailable);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{copy.title}</h1>
        <p className="mt-1 max-w-xl text-sm text-slate-500">{copy.subtitle}</p>
      </header>
      <form className="dashboard-card rounded-2xl border border-slate-100 bg-white p-4 sm:p-6" onSubmit={onSubmit}>
        {formError ? <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p> : null}
        {notice ? <p className="mb-4 rounded-xl bg-brand-green/15 px-3 py-2 text-sm font-medium text-brand-green-deep">{notice}</p> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field error={errors.name} label={copy.name} required>
            <input className={fieldClass} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required value={draft.name} />
          </Field>
          <Field error={errors.email} label={copy.email} required>
            <input className={fieldClass} inputMode="email" onChange={(event) => setDraft({ ...draft, email: event.target.value })} required type="email" value={draft.email} />
          </Field>
          <PasswordField
            autoComplete="current-password"
            error={errors.current_password}
            hint={copy.currentPasswordHint}
            label={copy.currentPassword}
            onChange={(current_password) => setDraft({ ...draft, current_password })}
            value={draft.current_password}
          />
          <span className="hidden sm:block" />
          <PasswordField
            autoComplete="new-password"
            error={errors.new_password}
            hint={copy.newPasswordHint}
            label={copy.newPassword}
            onChange={(new_password) => setDraft({ ...draft, new_password })}
            value={draft.new_password}
          />
          <PasswordField
            autoComplete="new-password"
            error={errors.confirm_password}
            label={copy.confirmPassword}
            onChange={(confirm_password) => setDraft({ ...draft, confirm_password })}
            value={draft.confirm_password}
          />
        </div>
        <div className="mt-5 flex justify-end">
          <button className="rounded-xl bg-brand-green-deep px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60" disabled={saving} type="submit">
            {saving ? copy.saving : copy.save}
          </button>
        </div>
      </form>
    </div>
  );
}

function validateAccount(draft: Draft, originalEmail: string) {
  const errors: Partial<Record<keyof Draft, string>> = {};
  const email = draft.email.trim();
  const emailChanged = email.toLowerCase() !== originalEmail.trim().toLowerCase();
  const newPassword = draft.new_password;
  const confirm = draft.confirm_password;
  if (!draft.name.trim()) errors.name = copy.errors.name;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = copy.errors.email;
  if ((emailChanged || newPassword) && !draft.current_password) errors.current_password = copy.errors.currentRequired;
  if (newPassword && (newPassword.length < 8 || newPassword.length > 72)) errors.new_password = copy.errors.password;
  if (newPassword && confirm !== newPassword) errors.confirm_password = copy.errors.confirm;
  if (!newPassword && confirm) errors.confirm_password = copy.errors.confirmEmpty;
  return errors;
}

function PasswordField({
  label,
  hint,
  error,
  value,
  autoComplete,
  onChange,
}: {
  label: string;
  hint?: string;
  error?: string;
  value: string;
  autoComplete: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="text-xs font-semibold text-slate-600" htmlFor={id}>
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          autoComplete={autoComplete}
          className={`${fieldClass} pr-11`}
          id={id}
          onChange={(event) => onChange(event.target.value)}
          type={visible ? "text" : "password"}
          value={value}
        />
        <button
          aria-controls={id}
          aria-label={visible ? copy.hidePassword : copy.showPassword}
          aria-pressed={visible}
          className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error ? <span className="mt-1 block text-xs text-rose-700">{error}</span> : hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </div>
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
      <path d="M6.2 7.2C4.2 8.6 2.5 12 2.5 12S6 17.5 12 17.5c1.5 0 2.8-.4 4-.9M10.2 6.7A10 10 0 0 1 12 6.5c6 0 9.5 5.5 9.5 5.5a16 16 0 0 1-2.2 2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Field({
  label,
  hint,
  error,
  required = false,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-600">
        {label}
        {required ? (
          <>
            <span aria-hidden="true" className="text-rose-600">
              {" "}
              *
            </span>
            <span className="sr-only"> ({copy.requiredMark})</span>
          </>
        ) : null}
      </span>
      <div className="mt-1.5">{children}</div>
      {error ? <span className="mt-1 block text-xs text-rose-700">{error}</span> : hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}
