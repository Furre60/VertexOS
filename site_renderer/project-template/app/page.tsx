/**
 * Placeholder landing page for the VertexOS demo-site project-template.
 *
 * This page exists so the template is a complete, buildable Next.js
 * project on its own. From Sprint 6 onward, site_renderer/build/compose.ts
 * overwrites this file with a real page assembled from the selected
 * components (Hero, About, Services, ...) for a given business.
 */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
        VertexOS
      </p>
      <h1 className="text-3xl font-semibold text-neutral-900 sm:text-4xl">
        Demo site template
      </h1>
      <p className="max-w-md text-base text-neutral-600">
        This page is a placeholder. Generated demo sites replace it with a
        real page built from your business content.
      </p>
    </main>
  );
}
