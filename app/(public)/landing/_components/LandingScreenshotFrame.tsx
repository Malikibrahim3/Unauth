import Reveal from './Reveal';
import { t } from '../_tokens';

type Props = {
  src: string;
  alt: string;
  delay?: number;
};

export default function LandingScreenshotFrame({ src, alt, delay = 0 }: Props) {
  return (
    <Reveal delay={delay} duration={1092}>
      <div
        className="ua-glass-card"
        style={{
          border: `1px solid ${t.border}`,
          background: '#ffffff',
          boxShadow: '0 10px 36px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.07)',
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
