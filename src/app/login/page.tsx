import type { Metadata } from "next";

import { BrandLogo } from "@/components/admin/brand-logo";
import content from "@/data/content.json";

import { LoginForm } from "./login-form";

const copy = content.login;

export const metadata: Metadata = {
  title: {
    absolute: copy.metaTitle,
  },
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen w-full flex-col lg:flex-row">
      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden p-10 text-white lg:flex lg:w-5/12 xl:w-[42%] xl:p-14">
        {/* The photo address lives in content.json, so it is not limited to one image host. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={copy.heroImageAlt}
          className="absolute inset-0 h-full w-full object-cover object-center"
          src={copy.heroImageUrl}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/30 to-slate-900/45" />

        <div className="relative z-10 inline-flex w-fit">
          {/* <BrandLogo className="h-14 w-auto" /> */}
        </div>

        <div className="relative z-10 mb-4 max-w-lg">
          <blockquote className="mb-6 text-2xl leading-snug font-bold tracking-tight text-white xl:text-3xl">
            “{copy.quote}”
          </blockquote>
          <div>
            <p className="text-base font-semibold tracking-wide text-white">{copy.quoteAuthor}</p>
            <p className="mt-0.5 text-sm font-normal text-slate-300">{copy.quoteRole}</p>
          </div>
        </div>
      </section>

      <section className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 sm:px-12 md:px-16 lg:px-20 xl:px-28">
        <div className="mb-10 flex flex-col items-center self-cente">
          <BrandLogo className="h-20 w-auto" />
        </div>

        <div className="mx-auto flex w-full max-w-[390px] flex-col">
          <div className="mb-8 text-center">
            <h1 className="text-2xl leading-tight font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {copy.heading}
            </h1>
            <p className="mt-2 text-sm leading-relaxed font-normal text-slate-500">{copy.subheading}</p>
          </div>

          <LoginForm />

          <div className="mt-8 text-center">
            <p className="text-xs text-slate-400">
              {copy.supportPrefix}{" "}
              <a
                className="ml-0.5 font-semibold text-brand-green underline decoration-slate-300 underline-offset-2 transition-colors hover:text-brand-green-deep"
                href={copy.supportHref}
                rel="noopener noreferrer"
                target="_blank"
              >
                {copy.supportLink}
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
