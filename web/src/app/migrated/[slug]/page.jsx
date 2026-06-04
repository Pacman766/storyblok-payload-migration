import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from './page.module.css';

const PAYLOAD_URL =
  process.env.NEXT_PUBLIC_PAYLOAD_URL ?? 'http://localhost:3001';

const mediaUrl = (media) =>
  media?.url ? `${PAYLOAD_URL}${media.url}` : null;

async function fetchPage(slug) {
  const res = await fetch(
    `${PAYLOAD_URL}/api/pages?where[slug][equals]=${encodeURIComponent(
      slug
    )}&depth=1`,
    { cache: 'no-store' }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.docs?.[0] ?? null;
}

function Hero({ block }) {
  const img = mediaUrl(block.image);
  return (
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <span className={styles.kicker}>Hero</span>
        <h2 className={styles.heroHeadline}>{block.headline}</h2>
        {block.subheadline && (
          <p className={styles.heroSub}>{block.subheadline}</p>
        )}
        {block.cta_label && block.cta_url && (
          <a className={styles.cta} href={block.cta_url}>
            {block.cta_label}
            <span aria-hidden="true" className={styles.ctaArrow}>
              &rarr;
            </span>
          </a>
        )}
      </div>
      {img && (
        <figure className={styles.heroMedia}>
          {/* CMS media is served from PAYLOAD_URL on a different port; src must be prefixed */}
          <img src={img} alt={block.headline ?? ''} loading="eager" />
        </figure>
      )}
    </section>
  );
}

function Testimonial({ block }) {
  const photo = mediaUrl(block.author_photo);
  return (
    <section className={styles.testimonial}>
      <span className={styles.quoteMark} aria-hidden="true">
        &ldquo;
      </span>
      <blockquote className={styles.quote}>{block.quote}</blockquote>
      <figcaption className={styles.author}>
        {photo && (
          <img
            className={styles.authorPhoto}
            src={photo}
            alt={block.author_name ?? ''}
            loading="lazy"
          />
        )}
        <span className={styles.authorMeta}>
          <strong className={styles.authorName}>{block.author_name}</strong>
          {block.author_role && (
            <span className={styles.authorRole}>{block.author_role}</span>
          )}
        </span>
      </figcaption>
    </section>
  );
}

function Block({ block }) {
  switch (block.blockType) {
    case 'hero':
      return <Hero block={block} />;
    case 'testimonial':
      return <Testimonial block={block} />;
    default:
      return null;
  }
}

export default async function MigratedDetailPage({ params }) {
  const { slug } = await params;
  const page = await fetchPage(slug);

  if (!page) notFound();

  const body = Array.isArray(page.body) ? page.body : [];

  return (
    <main className={styles.shell}>
      <div className={styles.grain} aria-hidden="true" />

      {/* ---- Title / hero band ---- */}
      <section className={styles.heroBand}>
        <div className={`site-container ${styles.heroInner}`}>
          <nav className={styles.topbar} aria-label="Breadcrumb">
            <Link className={styles.back} href="/migrated">
              <span aria-hidden="true">&larr;</span> Migrated content
            </Link>
            <span className={styles.badge}>Payload CMS</span>
          </nav>

          <div className={styles.titleBlock}>
            <span className={styles.slug}>/{page.slug}</span>
            <h1 className={styles.title}>{page.title}</h1>
          </div>
        </div>
      </section>

      {/* ---- Content band ---- */}
      <section className={styles.contentBand}>
        <div className="site-container">
          {body.length === 0 ? (
            <p className={styles.empty}>This page has no content blocks yet.</p>
          ) : (
            <div className={styles.blocks}>
              {body.map((block) => (
                <Block key={block.id} block={block} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
