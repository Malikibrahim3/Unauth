import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { demoUrl } from '@/lib/demo/merchantCaseV1';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import styles from './public.module.css';

export function PublicRoot({ children }: { children: ReactNode }) {
  return <div className={styles.root} data-public-root data-visual-revision="unauth-ramp-cohesion-2026-09-23">{children}</div>;
}
export function PublicLink({ href, children, secondary = false, prominent = false, inverse = false }: { href: string; children: ReactNode; secondary?: boolean; prominent?: boolean; inverse?: boolean }) {
  const Component=href.startsWith('#')?'a':Link;
  return <Component href={href} className={`${styles.button} ${secondary ? styles.secondary : ''}${prominent ? ' '+styles.prominent : ''}${inverse ? ' '+styles.inverse : ''}`}>{children}</Component>;
}
const navigation = [{ href:'/landing#workflow', label:'How it works' }, { href:'/landing#examples', label:'Sample cases' }, { href:'/pricing', label:'Pricing' }];
export function PublicNav({ landing = false }: { landing?: boolean }) {
  const items = landing ? [{href:'/landing#product',label:'Product'},{href:'/landing#workflow',label:'How it works'},{href:'/pricing',label:'Pricing'}] : navigation;
  return <><a className={styles.skip} href="#public-content">Skip to content</a><header className={styles.nav}><div className={styles.navInner}>
    <Link className={styles.logo} href="/landing" aria-label="Unauth home"><UnauthLogo kind="lockup" tone="graphite" height={26} priority /></Link>
    <nav className={styles.navLinks} aria-label="Public navigation">{items.map(x=>landing&&x.href.startsWith('/landing#')?<a key={x.href} href={x.href.replace('/landing','')}>{x.label}</a>:<Link key={x.href} href={x.href}>{x.label}</Link>)}</nav>
    <div className={styles.actions}>{landing ? <><Link className={styles.navQuiet} href="/login">Sign in</Link><PublicLink href={demoUrl("not-received")}>See it in action</PublicLink></> : <><PublicLink href="/login" secondary>Sign in</PublicLink><PublicLink href="/pricing">View plans</PublicLink></>}</div>
    <details className={styles.menu}><summary>Menu</summary><nav className={styles.menuLinks} aria-label="Mobile public navigation">{items.map(x=>landing&&x.href.startsWith('/landing#')?<a key={x.href} href={x.href.replace('/landing','')}>{x.label}</a>:<Link key={x.href} href={x.href}>{x.label}</Link>)}<Link href="/login">Sign in on desktop</Link>{!landing&&<Link href="/pricing">View plans</Link>}{landing && <PublicLink href={demoUrl("not-received")}>See it in action</PublicLink>}</nav></details>
  </div></header></>;
}
export const legalLinks = [{href:'/legal/privacy',label:'Privacy policy'},{href:'/legal/data-handling',label:'Data handling'},{href:'/legal/pilot-terms',label:'Pilot terms'},{href:'/legal/dpa',label:'Data processing addendum'}];
export function PublicFooter({ landing = false }: { landing?: boolean }) {
  return <footer className={styles.footer+(landing ? ' '+styles.landingFooter : '')}><div className={styles.footerGrid}>
    <div className={styles.footerBrand}><Link href="/landing" aria-label="Unauth home"><UnauthLogo kind="lockup" tone="graphite" height={landing ? 48 : 32} /></Link><p className={styles.fine} style={{marginTop:24,maxWidth:320}}>{landing ? <>Your rules. Eligible recovery.<br />One connected workflow.</> : <>Evidence before the decision.<br />Accountability through the outcome.</>}</p></div>
    <nav className={styles.footerColumn} aria-label="Explore Unauth"><h2>Explore Unauth</h2>{landing&&<a href="mailto:support@unauth.app">Contact support</a>}{landing?<><a href="#product">Product</a><a href="#workflow">How it works</a></>:<Link href="/landing#workflow">How it works</Link>}<Link href={landing ? demoUrl("not-received") : "/demo"}>{landing?'See it in action':'Try a sample case'}</Link><Link href="/pricing">Pricing</Link><Link href="/login">Sign in</Link></nav>
    <nav className={styles.footerColumn} aria-label="Legal information"><h2>Legal &amp; data</h2>{legalLinks.map(x=><Link key={x.href} href={x.href}>{x.label}</Link>)}</nav>
  </div><p className={styles.footerBottom}>{landing ? 'Unauth' : 'Unauth · Merchant workflows and interactive samples require a desktop.'}</p></footer>;
}
export function ArtworkSlot({ id, description, ratio = '1 / 1' }: { id: string; description: string; ratio?: string }) {
  return <figure className={styles.artwork} data-artwork-slot={id} role="img" aria-label={`Artwork placeholder: ${description}`} style={{'--artwork-ratio':ratio} as CSSProperties}><span>Artwork placeholder</span><p aria-hidden="true">{description}</p><small aria-hidden="true">{id}</small></figure>;
}
export function PublicNotice({ children, error = false, id }: { children: ReactNode; error?: boolean; id?: string }) {
  return <div id={id} className={styles.notice} role={error?'alert':'status'}>{children}</div>;
}
export function AuthShell({ title, description, children, stateId, surfaceId }: { title:string; description:string; children:ReactNode; stateId?:string; surfaceId?:string }) {
  return <><PublicNav/><main id="public-content" className={styles.auth} data-state-id={stateId} data-surface-id={surfaceId}>
    <aside className={styles.authContext}><div><p className={styles.heading}>Your rules before money moves.</p><p className={styles.lead}>Bring the facts, your rules and the merchant decision together. Keep recovery and the financial outcome in view.</p></div><p className={styles.fine}>Unauth prepares the next step. Refunds, replacements and provider submissions happen in your existing tools.</p></aside>
    <section className={styles.authFormPanel}><div className={styles.authForm}><h1>{title}</h1><p className={styles.fine}>{description}</p>{children}<p className={styles.fine}><Link href="/legal/privacy">Privacy</Link> · <Link href="/legal/pilot-terms">Pilot terms</Link> · <Link href="/landing">Back to Unauth</Link></p></div></section>
  </main></>;
}
