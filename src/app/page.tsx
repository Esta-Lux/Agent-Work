import { UserWorkspace } from "@/components/user-workspace";

export default function Home() {
  return (
    <main className="min-h-screen bg-cloud">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-6 py-7">
          <nav className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xl font-semibold text-ink">BootRise</p>
              <p className="mt-1 text-sm text-steel">Bootstrap startups from idea to deployment with evidence</p>
            </div>
            <a
              className="rounded border border-line px-4 py-2 text-sm font-semibold text-graphite"
              href="/admin"
            >
              Admin
            </a>
          </nav>
          <div className="py-8">
            <p className="text-sm font-semibold uppercase text-signal">User workspace</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-normal text-ink">
              Plan with your agent, fix code safely, export when ready.
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-graphite">
              Paste code, describe what you need, and BootRise reports what it fixed, what may break, and how to keep
              building. Download a bundle or push to GitHub when you are done.
            </p>
          </div>
        </div>
      </section>

      <UserWorkspace />
    </main>
  );
}
