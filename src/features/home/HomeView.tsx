import { About, FAQ, FinalCTA, SiteFooter } from './Closing';
import { Community, Roles, Workflow } from './Engagement';
import { Hero, TrustRibbon } from './Hero';
import styles from './landing.module.css';
import { Ecosystem, Services } from './Offerings';
import { ScrollProgress } from './ScrollProgress';
import { SiteHeader } from './SiteHeader';

/**
 * ECOVIA landing page, rebuilt from docs/ECOVIA_Project/index.html.
 * A server component: sections render to static HTML and only the
 * interactive islands (header actions, hero cards, role tabs, community
 * chips, reveal, scroll progress, footer dialogs) hydrate on the client.
 */
export function HomeView() {
  return (
    <div className={styles.landing}>
      <ScrollProgress />
      <SiteHeader />
      <main>
        <Hero />
        <TrustRibbon />
        <Ecosystem />
        <Services />
        <Roles />
        <Workflow />
        <Community />
        <About />
        <FAQ />
        <FinalCTA />
      </main>
      <SiteFooter />
    </div>
  );
}
