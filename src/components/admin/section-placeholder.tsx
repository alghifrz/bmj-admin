export function SectionPlaceholder({ title }: { title: string }) {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight text-brand-green-deep">{title}</h1>
    </div>
  );
}
