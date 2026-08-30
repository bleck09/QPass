import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';
import styles from './Badge.module.css';

export type TonoBadge = 'neutro' | 'marca' | 'info' | 'exito' | 'aviso' | 'error';

interface BadgeProps {
  tono?: TonoBadge;
  children: ReactNode;
  className?: string;
}

export function Badge({ tono = 'neutro', children, className }: BadgeProps) {
  return <span className={cn(styles.badge, styles[tono], className)}>{children}</span>;
}
