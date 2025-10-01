export default function Page() {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
      <section className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">Welcome</h2>
          <p>ElectriScribe foundation is ready. Navigate via the sidebar to explore modules.</p>
          <ul className="list-disc ml-6 text-sm">
            <li>Auth scaffold (to be wired)</li>
            <li>API health endpoint</li>
            <li>Prisma + Postgres schema</li>
          </ul>
        </div>
      </section>
      <section className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">Quick Links</h2>
          <a className="link link-primary" href="/api/health">API Health</a>
        </div>
      </section>
    </div>
  )
}

