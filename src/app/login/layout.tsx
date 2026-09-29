import { Plus_Jakarta_Sans } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export default function LoginLayout({ children }: LayoutProps<"/login">) {
  return (
    <div
      className={`${jakarta.className} min-h-screen bg-white text-slate-800 antialiased selection:bg-slate-200 selection:text-slate-900`}
    >
      {children}
    </div>
  );
}
