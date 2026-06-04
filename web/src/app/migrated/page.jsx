import Link from 'next/link';
import styles from './page.module.css';

const PAYLOAD_URL =
  process.env.NEXT_PUBLIC_PAYLOAD_URL ?? 'http://localhost:3001';

async function fetchCollection(slug) {
  const res = await fetch(`${PAYLOAD_URL}/api/${slug}?limit=100`, {
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.docs ?? [];
}

export default async function MigratedPage() {
  const [pages, caseStudies, teamMembers, services] = await Promise.all([
    fetchCollection('pages'),
    fetchCollection('case-studies'),
    fetchCollection('team-members'),
    fetchCollection('services'),
  ]);

  return (
    <main className={styles.shell}>
      <div className={styles.grain} aria-hidden="true" />

      {/* ---- Hero band (full-bleed) ---- */}
      <section className={styles.heroBand}>
        <div className={`site-container ${styles.heroInner}`}>
          <span className={styles.eyebrow}>
            Storyblok <span aria-hidden="true">&rarr;</span> Payload
          </span>
          <h1 className={styles.title}>Migrated&nbsp;Content</h1>
          <p className={styles.lede}>
            Everything below was lifted out of Storyblok and rebuilt natively in
            Payload CMS. Open a page to see the rendered result.
          </p>
          <dl className={styles.stats}>
            <div className={styles.stat}>
              <dt>Pages</dt>
              <dd>{pages.length}</dd>
            </div>
            <div className={styles.stat}>
              <dt>Case studies</dt>
              <dd>{caseStudies.length}</dd>
            </div>
            <div className={styles.stat}>
              <dt>Team</dt>
              <dd>{teamMembers.length}</dd>
            </div>
            <div className={styles.stat}>
              <dt>Services</dt>
              <dd>{services.length}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ---- Pages band ---- */}
      <section className={styles.band}>
        <div className={`site-container ${styles.bandInner}`}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Pages</h2>
            <span className={styles.count}>{pages.length}</span>
          </div>
          {pages.length === 0 ? (
            <p className={styles.empty}>No pages found.</p>
          ) : (
            <ul className={styles.pageList}>
              {pages.map((page) => (
                <li key={page.id} className={styles.pageItem}>
                  <Link
                    className={styles.pageLink}
                    href={`/migrated/${page.slug}`}
                  >
                    <span className={styles.pageTitle}>{page.title}</span>
                    <span className={styles.pageSlug}>/{page.slug}</span>
                    <span className={styles.pageArrow} aria-hidden="true">
                      &rarr;
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ---- Case studies band (alt background) ---- */}
      <section className={`${styles.band} ${styles.bandAlt}`}>
        <div className={`site-container ${styles.bandInner}`}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Case Studies</h2>
            <span className={styles.count}>{caseStudies.length}</span>
          </div>
          {caseStudies.length === 0 ? (
            <p className={styles.empty}>No case studies found.</p>
          ) : (
            <ul className={styles.cardList}>
              {caseStudies.map((cs) => (
                <li key={cs.id} className={styles.card}>
                  <strong className={styles.cardTitle}>{cs.title}</strong>
                  {cs.tags && cs.tags.length > 0 && (
                    <span className={styles.tags}>
                      {cs.tags.map((t) => (
                        <span key={t.id ?? t.tag} className={styles.tag}>
                          {t.tag}
                        </span>
                      ))}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ---- Team band ---- */}
      <section className={styles.band}>
        <div className={`site-container ${styles.bandInner}`}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Team Members</h2>
            <span className={styles.count}>{teamMembers.length}</span>
          </div>
          {teamMembers.length === 0 ? (
            <p className={styles.empty}>No team members found.</p>
          ) : (
            <ul className={styles.cardList}>
              {teamMembers.map((member) => (
                <li key={member.id} className={styles.card}>
                  <strong className={styles.cardTitle}>{member.name}</strong>
                  <span className={styles.cardMeta}>{member.role}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ---- Services band (alt background) ---- */}
      <section className={`${styles.band} ${styles.bandAlt}`}>
        <div className={`site-container ${styles.bandInner}`}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Services</h2>
            <span className={styles.count}>{services.length}</span>
          </div>
          {services.length === 0 ? (
            <p className={styles.empty}>No services found.</p>
          ) : (
            <ul className={styles.cardList}>
              {services.map((service) => (
                <li key={service.id} className={styles.card}>
                  <strong className={styles.cardTitle}>{service.title}</strong>
                  <span className={styles.cardMeta}>{service.description}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
