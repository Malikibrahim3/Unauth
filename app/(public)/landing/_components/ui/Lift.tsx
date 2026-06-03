'use client';

import { motion, useReducedMotion } from 'motion/react';

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function Lift({ children, className }: Props) {
  const reduced = useReducedMotion();
  if (reduced) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >
      {children}
    </motion.div>
  );
}
