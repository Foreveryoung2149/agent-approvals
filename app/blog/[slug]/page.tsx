import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "../../components/Footer";
import { Icon } from "../../components/Icon";
import Navbar from "../../components/Navbar";
import {
  blogPosts,
  getAdjacentBlogPosts,
  getBlogPost,
  type BlogPost,
} from "../posts";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

function formatPublishedDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function buildArticleJsonLd(post: BlogPost) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    mainEntityOfPage: `https://nodsend.com/blog/${post.slug}`,
    author: {
      "@type": "Organization",
      name: "Nodsend",
      url: "https://nodsend.com",
    },
    publisher: {
      "@type": "Organization",
      name: "Nodsend",
      url: "https://nodsend.com",
    },
  };
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return {};
  }

  const url = `/blog/${post.slug}`;

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article",
      publishedTime: post.publishedAt,
      authors: ["Nodsend"],
      section: post.tag,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const adjacentPosts = getAdjacentBlogPosts(post.slug);
  const articleJsonLd = JSON.stringify(buildArticleJsonLd(post)).replace(/</g, "\\u003c");

  return (
    <main className="marketing-shell">
      <Navbar />
      <article id="main-content" className="blog-article" tabIndex={-1}>
        <header className="blog-article-hero">
          <div className="container blog-article-hero-inner">
            <Link href="/blog" className="blog-back-link">
              <Icon name="arrow" size={14} />
              All field notes
            </Link>
            <div className="blog-article-kicker">
              <span>{post.tag}</span>
              <span aria-hidden="true">/</span>
              <span>Field note {post.sequence}</span>
            </div>
            <h1>{post.title}</h1>
            <p>{post.description}</p>
            <div className="blog-article-meta">
              <span>By Nodsend engineering</span>
              <span aria-hidden="true">/</span>
              <time dateTime={post.publishedAt}>{formatPublishedDate(post.publishedAt)}</time>
              <span aria-hidden="true">/</span>
              <span>{post.readingTime}</span>
            </div>
          </div>
        </header>

        <div className="container blog-article-layout">
          <aside className="blog-article-toc" aria-label="Article contents">
            <span>In this note</span>
            <nav>
              {post.sections.map((section, index) => (
                <a href={`#${section.id}`} key={section.id}>
                  <code>{String(index + 1).padStart(2, "0")}</code>
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>

          <div className="blog-article-content">
            {post.sections.map((section, index) => (
              <section id={section.id} className="blog-article-section" key={section.id}>
                <span className="blog-section-index">
                  {String(index + 1).padStart(2, "0")} / {String(post.sections.length).padStart(2, "0")}
                </span>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets ? (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                {section.callout ? (
                  <aside className="blog-callout" aria-label={section.callout.label}>
                    <Icon name="approval" size={19} />
                    <div>
                      <strong>{section.callout.label}</strong>
                      <p>{section.callout.text}</p>
                    </div>
                  </aside>
                ) : null}
                {section.code ? (
                  <div className="blog-code-block">
                    <div>{section.code.label}</div>
                    <pre tabIndex={0} aria-label={`${section.code.label} code example`}>
                      <code>{section.code.value}</code>
                    </pre>
                  </div>
                ) : null}
              </section>
            ))}

            <section className="blog-article-cta" aria-labelledby="article-cta-title">
              <div>
                <span className="signal-label">Put the pattern to work</span>
                <h2 id="article-cta-title">Build a checkpoint your application can trust.</h2>
                <p>Start with one approval request, then connect the signed outcome to your workflow.</p>
              </div>
              <div className="blog-article-cta-actions">
                <Link href="/docs#quick-start" className="btn-primary">
                  Read the quick start <Icon name="arrow" size={15} />
                </Link>
                <Link href="/signup" className="btn-secondary">Create a workspace</Link>
              </div>
            </section>
          </div>
        </div>

        <nav className="container blog-article-pagination" aria-label="More field notes">
          {adjacentPosts.previous ? (
            <Link href={`/blog/${adjacentPosts.previous.slug}`} data-direction="previous">
              <span>Previous field note</span>
              <strong>{adjacentPosts.previous.title}</strong>
            </Link>
          ) : <span />}
          {adjacentPosts.next ? (
            <Link href={`/blog/${adjacentPosts.next.slug}`} data-direction="next">
              <span>Next field note</span>
              <strong>{adjacentPosts.next.title}</strong>
            </Link>
          ) : <span />}
        </nav>
      </article>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: articleJsonLd }} />
    </main>
  );
}
