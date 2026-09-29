"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";

import content from "@/data/content.json";
import type { LoadResult } from "@/lib/catalog";

const copy = content.store;
const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-green-deep focus:ring-2 focus:ring-brand-green/30";

type StoreLocation = {
  id: string;
  name: string;
  address: string;
  google_maps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  is_published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

type StoreSettings = {
  business_name: string | null;
  whatsapp_number: string | null;
  email: string | null;
  operating_hours: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  footer_text: string | null;
  whatsapp_message_template: string | null;
  about_title: string | null;
  about_summary: string | null;
  about_body: string | null;
  locations: StoreLocation[];
  updated_at: string | null;
};

type SettingsDraft = {
  business_name: string;
  whatsapp_number: string;
  email: string;
  operating_hours: string;
  instagram_url: string;
  facebook_url: string;
  tiktok_url: string;
  footer_text: string;
  whatsapp_message_template: string;
  about_title: string;
  about_summary: string;
  about_body: string;
};

type LocationDraft = {
  name: string;
  address: string;
  google_maps_url: string;
  latitude: string;
  longitude: string;
  display_order: string;
  is_published: boolean;
};

export function StoreManager() {
  const [store, setStore] = useState<StoreSettings | null>(null);
  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [settingsErrors, setSettingsErrors] = useState<Partial<Record<keyof SettingsDraft, string>>>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<StoreLocation | "new" | null>(null);
  const [removing, setRemoving] = useState<StoreLocation | null>(null);
  const [movingId, setMovingId] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void loadStore(controller.signal).then((result) => {
      if (controller.signal.aborted || !result) return;
      if (!result.ok) {
        setLoadError(result.error);
        return;
      }
      setStore(result.data);
      setDraft((current) => current ?? draftFromStore(result.data));
      setLoadError("");
    });
    return () => controller.abort();
  }, [reloadKey]);

  const locations = store?.locations ?? [];
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return locations;
    return locations.filter((item) => `${item.name} ${item.address}`.toLowerCase().includes(needle));
  }, [locations, query]);

  function patchLocation(id: string, patch: Partial<StoreLocation>) {
    setStore((current) =>
      current ? { ...current, locations: current.locations.map((item) => (item.id === id ? { ...item, ...patch } : item)) } : current,
    );
  }

  async function refreshLocations() {
    const result = await loadStore();
    if (!result?.ok) {
      if (result) setNotice(result.error);
      return;
    }
    setStore((current) => (current ? { ...current, locations: result.data.locations } : result.data));
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const nextErrors = validateSettings(draft);
    setSettingsErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSavingSettings(true);
    setSettingsError("");
    const result = await sendStore("PATCH", "/api/admin/store", settingsBody(draft));
    setSavingSettings(false);
    if (!result.ok) {
      setSettingsError(result.error);
      return;
    }
    const saved = result.data as StoreSettings;
    setStore((current) => ({ ...saved, locations: current?.locations ?? saved.locations }));
    setDraft(draftFromStore(saved));
    setNotice(copy.saved);
  }

  async function toggle(item: StoreLocation, isPublished: boolean) {
    patchLocation(item.id, { is_published: isPublished });
    const result = await sendStore("PATCH", `/api/admin/store/locations/${item.id}`, { is_published: isPublished });
    if (!result.ok) {
      patchLocation(item.id, { is_published: item.is_published });
      setNotice(result.error);
    }
  }

  async function move(item: StoreLocation, direction: -1 | 1) {
    if (!store) return;
    const index = store.locations.findIndex((entry) => entry.id === item.id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= store.locations.length) return;
    const previous = store.locations;
    const reordered = [...store.locations];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(next, 0, moved);
    setStore({ ...store, locations: reordered.map((entry, order) => ({ ...entry, display_order: order })) });
    setMovingId(item.id);
    setNotice("");
    for (const [order, entry] of reordered.entries()) {
      if (entry.display_order === order) continue;
      const result = await sendStore("PATCH", `/api/admin/store/locations/${entry.id}`, { display_order: order });
      if (!result.ok) {
        setStore((current) => (current ? { ...current, locations: previous } : current));
        setNotice(result.error);
        setMovingId("");
        return;
      }
    }
    setMovingId("");
  }

  const messagePreview = draft ? previewMessage(draft.whatsapp_message_template) : "";
  const whatsappLink = draft ? whatsAppHref(draft.whatsapp_number, messagePreview) : "";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{copy.title}</h1>
        <p className="mt-1 max-w-xl text-sm text-slate-500">{copy.subtitle}</p>
      </header>

      {notice ? <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">{notice}</p> : null}

      {!store || !draft ? (
        loadError ? (
          <div className="dashboard-card rounded-2xl border border-slate-100 bg-white px-6 py-16 text-center">
            <p className="text-sm text-slate-600">{loadError}</p>
            <button className="mt-4 text-sm font-semibold text-brand-green-deep" onClick={() => setReloadKey((current) => current + 1)} type="button">
              {copy.retry}
            </button>
          </div>
        ) : (
          <div className="dashboard-card space-y-3 rounded-2xl border border-slate-100 bg-white p-6">
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
          </div>
        )
      ) : (
        <>
          <form className="dashboard-card rounded-2xl border border-slate-100 bg-white p-4 sm:p-6" onSubmit={saveSettings}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{copy.contactTitle}</h2>
                <p className="mt-1 max-w-xl text-sm text-slate-500">{copy.contactHint}</p>
              </div>
              {store.updated_at ? <p className="text-xs text-slate-400">{copy.updated} {formatWhen(store.updated_at)}</p> : null}
            </div>
            {settingsError ? <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{settingsError}</p> : null}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label={copy.businessName}>
                <input className={fieldClass} onChange={(event) => setDraft({ ...draft, business_name: event.target.value })} value={draft.business_name} />
              </Field>
              <Field error={settingsErrors.whatsapp_number} hint={copy.whatsappHint} label={copy.whatsapp}>
                <input className={fieldClass} inputMode="tel" onChange={(event) => setDraft({ ...draft, whatsapp_number: event.target.value })} value={draft.whatsapp_number} />
              </Field>
              <div className="sm:col-span-2">
                <Field error={settingsErrors.whatsapp_message_template} hint={copy.messageTemplateHint} label={copy.messageTemplate}>
                  <GrowingTextarea
                    onChange={(whatsapp_message_template) => setDraft({ ...draft, whatsapp_message_template })}
                    placeholder={copy.messageTemplatePlaceholder}
                    value={draft.whatsapp_message_template}
                  />
                </Field>
                {messagePreview ? (
                  <p className="mt-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-600">{copy.messagePreview}: </span>
                    {messagePreview}
                  </p>
                ) : null}
              </div>
              <Field error={settingsErrors.email} label={copy.email}>
                <input className={fieldClass} inputMode="email" onChange={(event) => setDraft({ ...draft, email: event.target.value })} value={draft.email} />
              </Field>
              <Field label={copy.hours}>
                <input className={fieldClass} onChange={(event) => setDraft({ ...draft, operating_hours: event.target.value })} value={draft.operating_hours} />
              </Field>
              <Field error={settingsErrors.instagram_url} hint={copy.urlHint} label={copy.instagram}>
                <input className={fieldClass} onChange={(event) => setDraft({ ...draft, instagram_url: event.target.value })} value={draft.instagram_url} />
              </Field>
              <Field error={settingsErrors.facebook_url} hint={copy.urlHint} label={copy.facebook}>
                <input className={fieldClass} onChange={(event) => setDraft({ ...draft, facebook_url: event.target.value })} value={draft.facebook_url} />
              </Field>
              <Field error={settingsErrors.tiktok_url} hint={copy.urlHint} label={copy.tiktok}>
                <input className={fieldClass} onChange={(event) => setDraft({ ...draft, tiktok_url: event.target.value })} value={draft.tiktok_url} />
              </Field>
              <Field label={copy.footer}>
                <GrowingTextarea onChange={(footer_text) => setDraft({ ...draft, footer_text })} value={draft.footer_text} />
              </Field>
              <div className="border-t border-slate-100 pt-6 sm:col-span-2">
                <h3 className="text-base font-bold text-slate-900">{copy.aboutSection}</h3>
                <p className="mt-1 max-w-xl text-sm text-slate-500">{copy.aboutHint}</p>
              </div>
              <div className="sm:col-span-2">
                <Field error={settingsErrors.about_title} hint={copy.aboutHeadingHint} label={copy.aboutHeading}>
                  <input className={fieldClass} onChange={(event) => setDraft({ ...draft, about_title: event.target.value })} value={draft.about_title} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field error={settingsErrors.about_summary} hint={copy.aboutSummaryHint} label={copy.aboutSummary}>
                  <GrowingTextarea onChange={(about_summary) => setDraft({ ...draft, about_summary })} value={draft.about_summary} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field error={settingsErrors.about_body} hint={copy.aboutBodyHint} label={copy.aboutBody}>
                  <GrowingTextarea onChange={(about_body) => setDraft({ ...draft, about_body })} value={draft.about_body} />
                </Field>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              {whatsappLink ? (
                <a className="text-sm font-semibold text-brand-green-deep hover:underline" href={whatsappLink} rel="noreferrer" target="_blank">
                  {copy.whatsappTry}
                </a>
              ) : (
                <span />
              )}
              <button className="rounded-xl bg-brand-green-deep px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60" disabled={savingSettings} type="submit">
                {savingSettings ? copy.saving : copy.save}
              </button>
            </div>
          </form>

          <section className="dashboard-card rounded-2xl border border-slate-100 bg-white p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-lg font-bold text-slate-900">{copy.locationsTitle}</h2>
              <button
                className="rounded-xl bg-brand-green-deep px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95"
                onClick={() => {
                  setNotice("");
                  setEditor("new");
                }}
                type="button"
              >
                {copy.add}
              </button>
            </div>
            <label className="mt-4 block max-w-sm">
              <span className="sr-only">{copy.searchPlaceholder}</span>
              <input className={fieldClass} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchPlaceholder} value={query} />
            </label>

            {visible.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-base font-semibold text-slate-800">{query.trim() ? copy.noMatch : copy.emptyTitle}</p>
                {query.trim() ? null : <p className="mt-1 text-sm text-slate-500">{copy.emptyBody}</p>}
                {query.trim() ? (
                  <button className="mt-4 text-sm font-semibold text-brand-green-deep" onClick={() => setQuery("")} type="button">
                    {copy.reset}
                  </button>
                ) : null}
              </div>
            ) : (
              <>
                <p className="mt-4 text-xs font-medium text-slate-400">
                  {visible.length} {copy.count}
                </p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-200 border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] tracking-wider text-slate-400 uppercase">
                        <th className="px-3 py-3 font-semibold">{copy.name}</th>
                        <th className="px-3 py-3 font-semibold">{copy.order}</th>
                        <th className="px-3 py-3 font-semibold">{copy.publish}</th>
                        <th className="px-3 py-3 font-semibold">{copy.edit}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visible.map((item) => {
                        const index = locations.findIndex((entry) => entry.id === item.id);
                        return (
                          <tr className="align-middle transition-colors hover:bg-slate-50" key={item.id}>
                            <td className="px-3 py-4">
                              <div className="font-semibold text-slate-900">{item.name}</div>
                              <p className="mt-1 max-w-md text-xs text-slate-500">{item.address}</p>
                              {item.google_maps_url && validUrl(item.google_maps_url) ? (
                                <a className="mt-1 inline-block text-xs font-semibold text-brand-green-deep hover:underline" href={item.google_maps_url} rel="noreferrer" target="_blank">
                                  {copy.openMaps}
                                </a>
                              ) : null}
                            </td>
                            <td className="px-3 py-4">
                              <div className="flex items-center gap-2 text-xs font-semibold">
                                <button className="text-slate-500 disabled:opacity-30" disabled={Boolean(movingId) || index <= 0} onClick={() => void move(item, -1)} type="button">
                                  {copy.moveEarlier}
                                </button>
                                <span className="text-slate-700">{item.display_order}</span>
                                <button
                                  className="text-slate-500 disabled:opacity-30"
                                  disabled={Boolean(movingId) || index === locations.length - 1}
                                  onClick={() => void move(item, 1)}
                                  type="button"
                                >
                                  {copy.moveLater}
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-4">
                              <Switch
                                checked={item.is_published}
                                label={item.is_published ? copy.published : copy.draft}
                                onChange={(checked) => void toggle(item, checked)}
                              />
                            </td>
                            <td className="px-3 py-4">
                              <div className="flex items-center gap-2">
                                <button className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-green-deep hover:bg-brand-green/10" onClick={() => setEditor(item)} type="button">
                                  {copy.edit}
                                </button>
                                <button className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50" onClick={() => setRemoving(item)} type="button">
                                  {copy.delete}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </>
      )}

      {editor ? (
        <LocationEditor
          location={editor === "new" ? null : editor}
          onClose={() => setEditor(null)}
          onSaved={(message) => {
            setEditor(null);
            setNotice(message);
            void refreshLocations();
          }}
        />
      ) : null}

      {removing ? (
        <ConfirmDelete
          location={removing}
          onClose={() => setRemoving(null)}
          onDeleted={() => {
            setRemoving(null);
            setNotice(copy.deleted);
            void refreshLocations();
          }}
        />
      ) : null}
    </div>
  );
}

function LocationEditor({ location, onClose, onSaved }: { location: StoreLocation | null; onClose: () => void; onSaved: (message: string) => void }) {
  const titleId = useId();
  const [draft, setDraft] = useState<LocationDraft>(() => (location ? draftFromLocation(location) : emptyLocation()));
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"name" | "address" | "google_maps_url" | "latitude" | "longitude" | "display_order", string>>>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  function update(patch: Partial<LocationDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateLocation(draft);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setPending(true);
    setError("");
    const result = await sendStore(
      location ? "PATCH" : "POST",
      location ? `/api/admin/store/locations/${location.id}` : "/api/admin/store/locations",
      locationBody(draft),
    );
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSaved(copy.locationSaved);
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button aria-label={copy.close} className="absolute inset-0 bg-slate-900/30" disabled={pending} onClick={onClose} type="button" />
      <form aria-labelledby={titleId} className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl" onSubmit={submit} role="dialog">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900" id={titleId}>
              {location ? copy.editTitle : copy.createTitle}
            </h2>
            {location ? (
              <p className="mt-1 text-xs text-slate-400">
                {copy.updated} {formatWhen(location.updated_at)}
              </p>
            ) : null}
          </div>
          <button className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100" disabled={pending} onClick={onClose} type="button">
            {copy.close}
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
          {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          <Field error={fieldErrors.name} label={copy.name} required>
            <input autoFocus className={fieldClass} onChange={(event) => update({ name: event.target.value })} required value={draft.name} />
          </Field>
          <Field error={fieldErrors.address} label={copy.address} required>
            <GrowingTextarea onChange={(address) => update({ address })} required value={draft.address} />
          </Field>
          <Field error={fieldErrors.google_maps_url} hint={copy.urlHint} label={copy.maps}>
            <input className={fieldClass} onChange={(event) => update({ google_maps_url: event.target.value })} value={draft.google_maps_url} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field error={fieldErrors.latitude} hint={copy.coordinatesHint} label={copy.latitude}>
              <input className={fieldClass} inputMode="decimal" onChange={(event) => update({ latitude: event.target.value })} value={draft.latitude} />
            </Field>
            <Field error={fieldErrors.longitude} label={copy.longitude}>
              <input className={fieldClass} inputMode="decimal" onChange={(event) => update({ longitude: event.target.value })} value={draft.longitude} />
            </Field>
          </div>
          <Field error={fieldErrors.display_order} label={copy.order} required>
            <input className={fieldClass} inputMode="numeric" onChange={(event) => update({ display_order: event.target.value })} required value={draft.display_order} />
          </Field>
          <div className="rounded-2xl bg-slate-50 p-4">
            <Switch checked={draft.is_published} label={copy.publish} onChange={(checked) => update({ is_published: checked })} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100" disabled={pending} onClick={onClose} type="button">
            {copy.cancel}
          </button>
          <button className="rounded-xl bg-brand-green-deep px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60" disabled={pending} type="submit">
            {pending ? copy.saving : copy.saveLocation}
          </button>
        </div>
      </form>
    </div>
  );
}

function ConfirmDelete({ location, onClose, onDeleted }: { location: StoreLocation; onClose: () => void; onDeleted: () => void }) {
  const titleId = useId();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function remove() {
    setPending(true);
    setError("");
    const result = await sendStore("DELETE", `/api/admin/store/locations/${location.id}`);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDeleted();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button aria-label={copy.close} className="absolute inset-0 bg-slate-900/30" disabled={pending} onClick={onClose} type="button" />
      <div aria-labelledby={titleId} className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" role="alertdialog">
        <h2 className="text-lg font-bold text-slate-900" id={titleId}>
          {copy.confirmDelete}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {location.name}. {copy.confirmDeleteBody}
        </p>
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100" disabled={pending} onClick={onClose} type="button">
            {copy.cancel}
          </button>
          <button className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60" disabled={pending} onClick={() => void remove()} type="button">
            {pending ? copy.saving : copy.delete}
          </button>
        </div>
      </div>
    </div>
  );
}

function GrowingTextarea({
  value,
  onChange,
  placeholder,
  required = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      className={`${fieldClass} min-h-24 resize-none overflow-hidden`}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      ref={ref}
      required={required}
      value={value}
    />
  );
}

function Switch({ checked, disabled = false, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className={`inline-flex items-center gap-3 ${disabled ? "opacity-60" : "cursor-pointer"}`}>
      <input checked={checked} className="peer sr-only" disabled={disabled} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      <span className="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-brand-green-deep peer-focus-visible:ring-2 peer-focus-visible:ring-brand-green/40">
        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : ""}`} />
      </span>
      <span className="text-sm text-slate-600">{label}</span>
    </label>
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

function emptyLocation(): LocationDraft {
  return { name: "", address: "", google_maps_url: "", latitude: "", longitude: "", display_order: "0", is_published: false };
}

function draftFromStore(store: StoreSettings): SettingsDraft {
  return {
    business_name: store.business_name ?? "",
    whatsapp_number: store.whatsapp_number ?? "",
    email: store.email ?? "",
    operating_hours: store.operating_hours ?? "",
    instagram_url: store.instagram_url ?? "",
    facebook_url: store.facebook_url ?? "",
    tiktok_url: store.tiktok_url ?? "",
    footer_text: store.footer_text ?? "",
    whatsapp_message_template: store.whatsapp_message_template ?? "",
    about_title: store.about_title ?? "",
    about_summary: store.about_summary ?? "",
    about_body: store.about_body ?? "",
  };
}

function draftFromLocation(location: StoreLocation): LocationDraft {
  return {
    name: location.name,
    address: location.address,
    google_maps_url: location.google_maps_url ?? "",
    latitude: location.latitude == null ? "" : String(location.latitude),
    longitude: location.longitude == null ? "" : String(location.longitude),
    display_order: String(location.display_order),
    is_published: location.is_published,
  };
}

function validateSettings(draft: SettingsDraft) {
  const errors: Partial<Record<keyof SettingsDraft, string>> = {};
  if (!validWhatsApp(draft.whatsapp_number)) errors.whatsapp_number = copy.errors.whatsapp;
  if (draft.whatsapp_message_template.trim().length > 500) errors.whatsapp_message_template = copy.errors.message;
  if (draft.about_title.trim().length > 160) errors.about_title = copy.errors.aboutHeading;
  if (draft.about_summary.trim().length > 600) errors.about_summary = copy.errors.aboutSummary;
  if (draft.about_body.trim().length > 5000) errors.about_body = copy.errors.aboutBody;
  if (!validEmail(draft.email)) errors.email = copy.errors.email;
  if (!validUrl(draft.instagram_url)) errors.instagram_url = copy.errors.url;
  if (!validUrl(draft.facebook_url)) errors.facebook_url = copy.errors.url;
  if (!validUrl(draft.tiktok_url)) errors.tiktok_url = copy.errors.url;
  return errors;
}

function validateLocation(draft: LocationDraft) {
  const errors: Partial<Record<"name" | "address" | "google_maps_url" | "latitude" | "longitude" | "display_order", string>> = {};
  if (!draft.name.trim()) errors.name = copy.errors.name;
  if (!draft.address.trim()) errors.address = copy.errors.address;
  if (!validUrl(draft.google_maps_url)) errors.google_maps_url = copy.errors.url;
  if (!/^\d+$/.test(draft.display_order.trim())) errors.display_order = copy.errors.order;
  const latitude = draft.latitude.trim();
  const longitude = draft.longitude.trim();
  if ((latitude && !longitude) || (!latitude && longitude)) errors.latitude = copy.errors.coordinates;
  if (latitude && longitude) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors.latitude = copy.errors.latitude;
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) errors.longitude = copy.errors.longitude;
  }
  return errors;
}

function settingsBody(draft: SettingsDraft) {
  return {
    business_name: draft.business_name.trim() || null,
    whatsapp_number: draft.whatsapp_number.trim() || null,
    email: draft.email.trim() || null,
    operating_hours: draft.operating_hours.trim() || null,
    instagram_url: draft.instagram_url.trim() || null,
    facebook_url: draft.facebook_url.trim() || null,
    tiktok_url: draft.tiktok_url.trim() || null,
    footer_text: draft.footer_text.trim() || null,
    whatsapp_message_template: draft.whatsapp_message_template.trim() || null,
    about_title: draft.about_title.trim() || null,
    about_summary: draft.about_summary.trim() || null,
    about_body: draft.about_body.trim() || null,
  };
}

function locationBody(draft: LocationDraft) {
  const latitude = draft.latitude.trim();
  const longitude = draft.longitude.trim();
  return {
    name: draft.name.trim(),
    address: draft.address.trim(),
    google_maps_url: draft.google_maps_url.trim() || null,
    latitude: latitude ? Number(latitude) : null,
    longitude: longitude ? Number(longitude) : null,
    display_order: Number(draft.display_order),
    is_published: draft.is_published,
  };
}

function validEmail(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function validUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function validWhatsApp(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const digits = trimmed.replace(/\D/g, "");
  return /^\+?[\d\s-]+$/.test(trimmed) && digits.length >= 8 && digits.length <= 15;
}

function whatsAppHref(value: string, text = "") {
  if (!validWhatsApp(value)) return "";
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const message = text.trim();
  return message ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : `https://wa.me/${digits}`;
}

function previewMessage(template: string) {
  const text = template.trim();
  if (!text) return "";
  return text.replaceAll("{nama_produk}", copy.messageSample);
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(date);
}

async function loadStore(signal?: AbortSignal): Promise<LoadResult<StoreSettings> | null> {
  try {
    const response = await fetch("/api/admin/store", { signal });
    const payload = (await response.json()) as StoreSettings & { error?: string };
    if (!response.ok || !payload || !Array.isArray(payload.locations)) {
      return { ok: false, error: payload?.error || copy.errors.unavailable };
    }
    return { ok: true, data: payload };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return null;
    return { ok: false, error: copy.errors.unavailable };
  }
}

async function sendStore(method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown) {
  try {
    const response = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) return { ok: false as const, error: payload?.error || copy.errors.unavailable };
    return { ok: true as const, data: payload ?? {} };
  } catch {
    return { ok: false as const, error: copy.errors.unavailable };
  }
}
