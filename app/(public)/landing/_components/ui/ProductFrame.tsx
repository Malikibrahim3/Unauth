import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Tag } from './Tag';

type Annotation = { label: string; x: string; y: string };

type Props = {
  src: string;
  alt: string;
  chrome?: 'browser' | 'none';
  priority?: boolean;
  annotations?: Annotation[];
  className?: string;
  width?: number;
  height?: number;
};

export function ProductFrame({
  src,
  alt,
  chrome = 'browser',
  priority = false,
  annotations = [],
  className,
  width = 2880,
  height = 1800,
}: Props) {
  return (
    <div className={cn('ua-product-frame', className)}>
      {chrome === 'browser' && (
        <div className="ua-product-frame-chrome">
          <span className="ua-product-frame-dot" />
          <span className="ua-product-frame-dot" />
          <span className="ua-product-frame-dot" />
          <span className="ua-product-frame-url">app.unauth.co</span>
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          sizes="(max-width: 1024px) 100vw, 60vw"
          style={{ display: 'block', width: '100%', height: 'auto' }}
        />
        {annotations.map((a) => (
          <div
            key={a.label}
            className="ua-product-frame-annotation"
            style={{ left: a.x, top: a.y }}
          >
            <Tag variant="info">{a.label}</Tag>
          </div>
        ))}
      </div>
    </div>
  );
}
