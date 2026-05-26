import { requireAdmin } from "@/lib/auth/admin-auth";
import { AdminConsole } from "@/components/admin-console";

export default async function AdminPage() {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-cloud">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-6 py-7">
          <nav className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xl font-semibold text-ink">BootRise Admin</p>
              <p className="mt-1 text-sm text-steel">Platform control and launch readiness — not the user build room</p>
            </div>
            <a className="rounded border border-line px-4 py-2 text-sm font-semibold text-graphite" href="/">
              User workspace
            </a>
          </nav>
          <div className="py-6">
            <h1 className="max-w-3xl text-3xl font-semibold text-ink">Operator overview</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-graphite">
              Monitor readiness, providers, and internal ops. Builders use the public workspace at{" "}
              <a className="font-semibold text-signal" href="/">
                /
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      <AdminConsole />
    </main>
  );
}
