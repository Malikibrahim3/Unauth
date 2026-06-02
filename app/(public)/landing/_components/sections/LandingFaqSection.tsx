import Link from 'next/link';
import Reveal from '../Reveal';
import { FAQ_ALL } from '../../landingPageConstants';

export function LandingFaqSection() {
  return (
    <>
      <section className="ua-landing-faq-section">
        <div className="mx-auto max-w-[1100px] px-6 md:px-10 py-16 md:py-24 lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-12 xl:gap-16">

          <div className="mb-12 lg:mb-0">
            <Reveal className="lg:sticky lg:top-24" delay={40}>
              <p className="ua-landing-faq-eyebrow">
                § 6 - FREQUENT QUESTIONS
              </p>
              <h2 className="ua-landing-faq-heading">
                <span className="whitespace-nowrap">Everything you&rsquo;d ask</span>
                <br />
                <span className="ua-landing-faq-heading-italic">before committing.</span>
              </h2>
              <p className="ua-landing-faq-lead">
                Data handling, privacy, integration, evidence - answered directly.
              </p>
              <Link href="/audit" className="ua-landing-faq-cta-link">
                Run a free audit →
              </Link>
            </Reveal>
          </div>

          <div>
            {FAQ_ALL.map((item, i) => (
              <Reveal
                key={item.q}
                delay={Math.min(320, 60 + i * 22)}
              >
              <details
                className={`ua-faq-item group ua-landing-faq-item${i === 0 ? ' ua-landing-faq-item-first' : ''}`}
              >
                <summary className="ua-landing-faq-details">
                  <span className="ua-landing-faq-question-text">{item.q}</span>
                  <span aria-hidden="true" className="ua-faq-icon ua-landing-faq-icon" />
                </summary>
                <p className="ua-landing-faq-answer">
                  {item.a}
                </p>
              </details>
              </Reveal>
            ))}
          </div>
        </div>

        <style>{`
          .ua-faq-item[open] > summary .ua-faq-icon {
            background: var(--landing-accent);
            border-color: var(--landing-accent);
            color: var(--landing-accent-fg);
          }
          .ua-faq-item[open] > summary .ua-faq-icon::after {
            content: '−';
          }
          .ua-faq-item > summary .ua-faq-icon::after {
            content: '+';
          }
.ua-faq-item summary::-webkit-details-marker { display: none; }
          .ua-faq-item summary::marker { display: none; }
          .ua-faq-item > summary:hover .ua-faq-icon {
            background: rgba(255,255,255,0.06);
          }
          .ua-faq-item[open] > summary:hover .ua-faq-icon {
            background: var(--landing-accent-hover);
          }
        `}</style>
      </section>

    </>
  );
}
