import Reveal from './Reveal';

type Tilt = 'left' | 'right' | 'none';

type Props = {
  src: string;
  alt: string;
  label?: string;
  delay?: number;
  tilt?: Tilt;
  dark?: boolean;
};

function transformFor(tilt: Tilt) {
  if (tilt === 'left') return 'perspective(1400px) rotateX(4deg) rotateY(-5deg)';
  if (tilt === 'right') return 'perspective(1400px) rotateX(4deg) rotateY(5deg)';
  return 'perspective(1400px) rotateX(0deg) rotateY(0deg)';
}

export default function LandingScreenshotFrame({
  src,
  alt,
  label,
  delay = 0,
  tilt = 'right',
  dark = false,
}: Props) {
  return (
    <Reveal delay={delay} className="ua-screenshot-shell">
      <div
        className="ua-screenshot-glow"
        style={{
          position: 'relative',
          padding: '18px',
          isolation: 'isolate',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: '-7% -4% auto',
            height: '46%',
            zIndex: -1,
            borderRadius: '50%',
            background: dark
              ? 'radial-gradient(ellipse at center, rgba(217, 121, 95, 0.26), transparent 68%)'
              : 'radial-gradient(ellipse at center, rgba(123, 45, 38, 0.17), transparent 68%)',
            filter: 'blur(18px)',
          }}
        />
        <figure
          style={{
            margin: 0,
            overflow: 'hidden',
            borderRadius: 8,
            border: dark ? '1px solid rgba(232,228,216,0.16)' : '1px solid #D8D0BD',
            background: dark ? '#15140F' : '#FDFBF6',
            boxShadow: dark
              ? '0 30px 80px -38px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.06) inset'
              : '0 34px 90px -44px rgba(26,24,20,0.46), 0 1px 0 rgba(255,255,255,0.75) inset',
            transform: transformFor(tilt),
            transformOrigin: '50% 70%',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: 34,
              padding: '0 12px',
              borderBottom: dark ? '1px solid rgba(232,228,216,0.12)' : '1px solid #ECE5D4',
              background: dark ? 'rgba(16, 15, 12, 0.96)' : '#F4F0E8',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {['#8A2828', '#C07838', '#8A8472'].map((color) => (
                <span key={color} style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'block' }} />
              ))}
            </div>
            {label && (
              <span
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: dark ? '#B7A98D' : '#8A8472',
                }}
              >
                {label}
              </span>
            )}
          </div>
          <img
            src={src}
            alt={alt}
            loading="lazy"
            style={{ display: 'block', width: '100%', height: 'auto' }}
          />
        </figure>
      </div>
    </Reveal>
  );
}
