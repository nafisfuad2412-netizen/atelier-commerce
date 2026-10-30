export default function SetupPage({ title, children }) {
  return (
    <section className="max-w-2xl space-y-6">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-green-800">Atelier Commerce · Project setup</p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">{title}</h1>
      <p className="text-lg leading-relaxed text-stone-600">{children}</p>
    </section>
  );
}
