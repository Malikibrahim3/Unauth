import { SectionBody, SectionEyebrow, SectionHeadline } from '@/components/ui';

/**
 * Consistent section opener: mono eyebrow, display headline, measured body.
 * `tone="dark"` variant is used on graphite sections (privacy, final CTA).
 */
export default function SectionHeader({
  eyebrow,
  headline,
  body,
  tone = 'light',
  align = 'left',
}: {
  eyebrow: string;
  headline: string;
  body?: string;
  tone?: 'light' | 'dark';
  align?: 'left' | 'center';
}) {
  const alignCls = align === 'center' ? 'mx-auto text-center' : '';
  return (
    <div className={`max-w-[40rem] ${alignCls}`}>
      <SectionEyebrow tone={tone}>{eyebrow}</SectionEyebrow>
      <SectionHeadline tone={tone}>{headline}</SectionHeadline>
      {body ? <SectionBody tone={tone}>{body}</SectionBody> : null}
    </div>
  );
}
