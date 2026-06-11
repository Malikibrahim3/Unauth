import Image from 'next/image';
import { INTEGRATIONS, INTEGRATIONS_LINE } from '../_lib/content';

/**
 * Quiet integrations row — greyscale logos at rest, full color on hover.
 * Fixed heights to avoid layout shift.
 */
export default function IntegrationsStrip() {
  return (
    <section className="mx-auto w-full max-w-[70rem] px-5 py-14 sm:px-8">
      <p className="text-center font-mono text-xs uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
        Works where your team already works
      </p>
      <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-6 sm:gap-x-14">
        {INTEGRATIONS.map((integration) => (
          <li key={integration.name} className="flex items-center">
            <Image
              src={integration.src}
              alt={integration.name}
              width={112}
              height={28}
              className="h-6 w-auto opacity-55 grayscale transition-[opacity,filter] duration-200 hover:opacity-100 hover:grayscale-0 sm:h-7 motion-reduce:transition-none"
            />
          </li>
        ))}
      </ul>
      <p className="mt-8 text-center text-sm text-[var(--ink-tertiary)]">{INTEGRATIONS_LINE}</p>
    </section>
  );
}
