import type { ButtonHTMLAttributes } from 'react';
import styles from './public.module.css';
export function PublicButton({variant='primary',className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'secondary'}) {
 return <button {...props} className={[styles.button,variant==='secondary'?styles.secondary:'',className].join(' ')} />;
}
