import Reveal from './Reveal';
import { t } from '../_tokens';

type Props = {
  src: string;
  alt: string;
  delay?: number;
};

export default function LandingScreenshotFrame({ src, alt, delay = 0 }: Props) {
  return (
    <Reveal delay={delay}>
      <div
        style={{
          position: 'relative',
          borderRadius: 6,
          overflow: 'hidden',
          border: `1px solid ${t.border}`,
          boxShadow: 'var(--landing-shadow-card)',
        }}
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          width={2880}
          height={1800}
          style={{ display: 'block', width: '100%', height: 'auto' }}
        />
      </div>
    </Reveal>
  );
}
