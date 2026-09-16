export default function PageHero({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <section className="border-b border-border bg-gradient-to-b from-primary-light to-bg-main">
      <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-text-primary md:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-text-secondary">{description}</p>
      </div>
    </section>
  );
}
