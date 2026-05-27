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
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Migrated Content</h1>

      <section>
        <h2>Pages</h2>
        {pages.length === 0 ? (
          <p>No pages found.</p>
        ) : (
          <ul>
            {pages.map((page) => (
              <li key={page.id}>
                <strong>{page.title}</strong> &mdash; /{page.slug}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Case Studies</h2>
        {caseStudies.length === 0 ? (
          <p>No case studies found.</p>
        ) : (
          <ul>
            {caseStudies.map((cs) => (
              <li key={cs.id}>
                <strong>{cs.title}</strong>
                {cs.tags && cs.tags.length > 0 && (
                  <span>
                    {' '}
                    &mdash; {cs.tags.map((t) => t.tag).join(', ')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Team Members</h2>
        {teamMembers.length === 0 ? (
          <p>No team members found.</p>
        ) : (
          <ul>
            {teamMembers.map((member) => (
              <li key={member.id}>
                <strong>{member.name}</strong> &mdash; {member.role}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Services</h2>
        {services.length === 0 ? (
          <p>No services found.</p>
        ) : (
          <ul>
            {services.map((service) => (
              <li key={service.id}>
                <strong>{service.title}</strong> &mdash; {service.description}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
