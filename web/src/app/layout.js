import './globals.css';
import Link from 'next/link';
import StoryblokProvider from '@/components/StoryblokProvider';

export const metadata = {
	title: 'Studio — Migrated Content',
	description: 'Storyblok content rebuilt natively in Payload CMS.',
};

export default function RootLayout({ children }) {
	const currentYear = new Date().getFullYear();
	const payloadUrl = process.env.NEXT_PUBLIC_PAYLOAD_URL ?? 'http://localhost:3001';
	return (
		<StoryblokProvider>
			<html lang="en">
				<body>
					<header className="site-header">
						<div className="site-container site-header__inner">
							<Link className="site-brand" href="/migrated">
								<span className="site-brand__mark" aria-hidden="true" />
								<span className="site-brand__name">Studio</span>
							</Link>
							<nav className="site-nav" aria-label="Primary">
								<Link className="site-nav__link" href="/migrated">
									Migrated
								</Link>
								<a
									className="site-nav__cta"
									href={`${payloadUrl}/admin`}
								>
									Payload Admin
								</a>
							</nav>
						</div>
					</header>

					{children}

					<footer className="site-footer">
						<div className="site-container site-footer__inner">
							<span className="site-footer__brand">Studio</span>
							<span className="site-footer__meta">
								Storyblok &rarr; Payload CMS migration
							</span>
							<span className="site-footer__copy">
								All rights reserved &copy; {currentYear}
							</span>
						</div>
					</footer>
				</body>
			</html>
		</StoryblokProvider>
	);
}
