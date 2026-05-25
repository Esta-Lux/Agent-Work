import { UserWorkspace } from "@/components/user-workspace";

export default function Home() {
  return (
    <main className="min-h-screen bg-cloud">
      <header className="sticky top-0 z-10 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <p className="text-lg font-semibold text-ink">BootRise</p>
            <span className="hidden text-sm text-steel sm:inline">Build → fix → verify → ship</span>
          </div>
          <a
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-graphite hover:bg-cloud"
            href="/admin"
          >
            Admin
          </a>
        </div>
      </header>

      <UserWorkspace />
    </main>
  );
}
