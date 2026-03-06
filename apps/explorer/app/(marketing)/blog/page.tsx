import Link from 'next/link';

export const revalidate = 3600;

export const metadata = {
  title: 'Blog',
  description: 'News, updates, and insights from the Constructs Network.',
};

// Placeholder posts — in production these would come from a CMS or API
const posts = [
  {
    slug: 'introducing-constructs-network',
    title: 'Introducing the Constructs Network',
    excerpt: 'The marketplace for AI agent expertise. Discover, install, and compose preserved skills.',
    date: '2026-02-01',
    author: 'Loa Team',
  },
  {
    slug: 'building-your-first-construct',
    title: 'Building Your First Construct',
    excerpt: 'A step-by-step guide to creating, testing, and publishing an AI agent construct.',
    date: '2026-02-08',
    author: 'Loa Team',
  },
];

export default function BlogPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-mono font-boldtext-bone-base">Blog</h1>
        <p className="text-sm font-mono text-bone-dim mt-1">News and updates from the Constructs Network.</p>
      </div>

      {posts.length === 0 ? (
        <p className="text-sm font-mono text-bone-ghost py-12 text-center">No posts yet. Check back soon.</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block border border-void-border p-5 hover:border-bone-ghost transition-colors"
            >
              <div className="flex items-center gap-3 mb-2 text-[10px] font-mono text-bone-ghost">
                <time>{new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time>
                <span>·</span>
                <span>{post.author}</span>
              </div>
              <h2 className="text-sm font-mono font-bold text-bone-base mb-1">{post.title}</h2>
              <p className="text-xs font-mono text-bone-muted">{post.excerpt}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
