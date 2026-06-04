import Link from 'next/link';
import styles from './not-found.module.css';

export default function StoryblokNotFound() {
  return (
    <main className={styles.shell}>
      <div className={styles.card}>
        <span className={styles.code}>404</span>
        <h1 className={styles.title}>We couldn&rsquo;t find that page</h1>
        <p className={styles.copy}>
          This route lives in a live Storyblok space. Some links &mdash; like the
          hero CTAs &mdash; only resolve when a Storyblok space is connected.
        </p>
        <Link className={styles.back} href="/migrated">
          <span aria-hidden="true">&larr;</span> Back to migrated content
        </Link>
      </div>
    </main>
  );
}
