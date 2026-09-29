export function BrandLogo({ className = "h-10 w-auto" }: { className?: string; priority?: boolean }) {
  return (
    // A plain image avoids the optimizer, which was rejecting this file.
    // eslint-disable-next-line @next/next/no-img-element
    <img alt="Buana Medika Jaya" className={className} src="/logo.png" />
  );
}
