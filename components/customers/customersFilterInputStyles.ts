export const inputCls =
  'h-9 w-full rounded-md px-3 text-[13px] focus:outline-none';
export const inputStyle = {
  background: 'var(--bg-inset)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
};
export const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = 'var(--border-strong)';
  e.target.style.outline = '2px solid var(--focus-ring)';
  e.target.style.outlineOffset = '2px';
};
export const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = 'var(--border)';
  e.target.style.outline = 'none';
};
