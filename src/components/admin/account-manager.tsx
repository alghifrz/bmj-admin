"use client";

import { useState, type FormEvent, type ReactNode } from "react";
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
          <Field error={errors.current_password} hint={copy.currentPasswordHint} label={copy.currentPassword}>
            <input
              autoComplete="current-password"
              className={fieldClass}
              onChange={(event) => setDraft({ ...draft, current_password: event.target.value })}
              type="password"
              value={draft.current_password}
            />
          </Field>
          <span className="hidden sm:block" />
          <Field error={errors.new_password} hint={copy.newPasswordHint} label={copy.newPassword}>
            <input
              autoComplete="new-password"
              className={fieldClass}
              onChange={(event) => setDraft({ ...draft, new_password: event.target.value })}
              type="password"
              value={draft.new_password}
            />
          </Field>
          <Field error={errors.confirm_password} label={copy.confirmPassword}>
            <input
              autoComplete="new-password"
              className={fieldClass}
              onChange={(event) => setDraft({ ...draft, confirm_password: event.target.value })}
              type="password"
              value={draft.confirm_password}
            />
          </Field>
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
