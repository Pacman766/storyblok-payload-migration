import Link from 'next/link';
import styles from './not-found.module.css';

export default function MigratedNotFound() {
  return (
    <main className={styles.shell}>
      <div className={styles.card}>
        <span className={styles.code}>404</span>
        <h1 className={styles.title}>No such migrated page</h1>
        <p className={styles.copy}>
          The slug you requested doesn&rsquo;t exist in the Payload content set.
        </p>
        <Link className={styles.back} href="/migrated">
          <span aria-hidden="true">&larr;</span> Back to migrated content
        </Link>
      </div>
    </main>
  );
}
