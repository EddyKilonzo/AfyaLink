import { EmptyMap } from "@/components/illustrations";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNav } from "@/components/site/site-nav";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main id="main" className="mx-auto flex min-h-[80dvh] max-w-md flex-col items-center justify-center gap-3 px-5 pt-16 text-center">
        <EmptyMap className="w-40 sm:w-48" />
        <h1 className="text-h1 mt-2">This page doesn&apos;t exist</h1>
        <p className="text-[0.9375rem] text-muted">The link may be old, or the address mistyped.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <ButtonLink href="/">AfyaLink home</ButtonLink>
          <ButtonLink href="/login" variant="outline">
            Sign in
          </ButtonLink>
        </div>
      </main>
      <SiteFooter variant="compact" />
    </>
  );
}
