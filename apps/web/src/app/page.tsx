import Link from 'next/link';

/**
 * Landing Page
 * @see sprint.md T1.3: "Add landing page placeholder"
 * @see sdd.md §4.3 Page/View Structure - Landing: Marketing, conversion
 */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Logo/Brand */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Loa Constructs
            </h1>
            <p className="text-xl text-muted-foreground">
              Discover, install, and manage AI agent constructs for the Loa framework
            </p>
          </div>

          {/* Value Proposition */}
          <div className="space-y-4 text-lg text-muted-foreground">
            <p>
              Extend your Claude AI agents with powerful skills from our curated marketplace.
            </p>
            <p>
              From DevOps automation to marketing workflows, find the perfect skills for your
              projects.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/skills"
              className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Browse Skills
            </Link>
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Get Started
            </Link>
          </div>

          {/* Quick Install */}
          <div className="rounded-lg border bg-card p-6 text-left">
            <h3 className="mb-2 font-semibold">Quick Install</h3>
            <code className="block rounded bg-muted p-3 text-sm">
              loa skill install terraform-assistant
            </code>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="border-t bg-muted/40 px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-center text-2xl font-bold">Why Loa Constructs?</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="space-y-2">
              <h3 className="font-semibold">Curated Quality</h3>
              <p className="text-sm text-muted-foreground">
                Every skill is reviewed for quality, security, and compatibility.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Easy Installation</h3>
              <p className="text-sm text-muted-foreground">
                One command to install. Seamless integration with your Loa projects.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Flexible Licensing</h3>
              <p className="text-sm text-muted-foreground">
                Free tier for individuals, team plans for organizations, enterprise for scale.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-8">
        <div className="mx-auto max-w-5xl text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Loa Constructs. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
