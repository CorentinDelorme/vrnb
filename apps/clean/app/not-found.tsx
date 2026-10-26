import Link from 'next/link';

import { buttonVariants } from '../components/ui/button';

/**
 * Clean 404 page — the deliberate divergence from the legacy SPA, which served a
 * broken shell with status 200 (spec #3, US 25). Rendered by `notFound()`.
 */
export default function NotFound() {
  return (
    <section className="flex flex-col items-start gap-4">
      <h2 className="text-secondary text-2xl font-bold sm:text-4xl">Page introuvable</h2>
      <p>La page que vous cherchez n&apos;existe pas ou a été déplacée.</p>
      {/* Navigation, not an action: a Link carrying the button styling (the
      shadcn "As Link" pattern — never a `<Button>` inside or around a link). */}
      <Link href="/" className={buttonVariants({ variant: 'default', size: 'sm' })}>
        Retour &agrave; l&apos;accueil
      </Link>
    </section>
  );
}
