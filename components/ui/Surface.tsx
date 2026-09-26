import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react';

export type SurfaceStructure = 'working' | 'joined' | 'inset' | 'floating' | 'unframed' | 'raised' | 'overlay' | 'selected' | 'muted';
export type SurfacePad = 'none' | 'dense' | 'standard' | 'relaxed';
export type SurfaceRadius = 'control' | 'surface' | 'overlay';

const structureStyle: Record<SurfaceStructure, CSSProperties> = {
  working: { overflow: 'hidden', borderRadius: 12, border: '1px solid #e4e3e0', background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.04)' },
  joined: { overflow: 'hidden', borderRadius: 12, border: '1px solid #e4e3e0', background: '#fff' },
  inset: { overflow: 'hidden', borderRadius: 12, border: '1px solid #e4e3e0', background: '#f4f3f1' },
  floating: { overflow: 'hidden', borderRadius: 14, border: '1px solid #e4e3e0', background: '#fff', boxShadow: '0 12px 32px rgba(28,27,25,.12)' },
  unframed: { background: 'transparent' },
  raised: { overflow: 'hidden', borderRadius: 12, border: '1px solid #e4e3e0', background: '#fff', boxShadow: '0 4px 16px rgba(28,27,25,.08)' },
  overlay: { overflow: 'hidden', borderRadius: 14, border: '1px solid #e4e3e0', background: '#fff', boxShadow: '0 16px 40px rgba(28,27,25,.16)' },
  selected: { borderRadius: 8, border: '1px solid #e0a97a', background: '#fff3e9' },
  muted: { overflow: 'hidden', borderRadius: 12, border: '1px solid #e4e3e0', background: '#ffffff' },
};
const padStyle: Record<SurfacePad, CSSProperties> = { none: {}, dense: { padding: 12 }, standard: { padding: 16 }, relaxed: { padding: 20 } };
const radii: Record<SurfaceRadius, number> = { control: 8, surface: 12, overlay: 14 };

export function Surface({ structure = 'working', pad = 'none', bordered, radius, as: Component = 'div', className: _className, style, children, ...props }: {
  structure?: SurfaceStructure;
  pad?: SurfacePad;
  bordered?: boolean;
  radius?: SurfaceRadius;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, 'children'> & { [dataAttribute: `data-${string}`]: string | undefined }) {
  const borderStyle = bordered === false ? { border: 0 } : bordered === true ? { border: '1px solid #e4e3e0' } : {};
  return <Component style={{ ...structureStyle[structure], ...padStyle[pad], ...borderStyle, ...(radius ? { borderRadius: radii[radius] } : {}), ...style }} data-material={structure === 'working' ? 'ledger-sheet' : undefined} {...props}>{children}</Component>;
}
