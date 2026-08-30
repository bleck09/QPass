import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Quita el padding interno (para tablas a sangre, listas). */
  sinPadding?: boolean;
}

export function Card({ children, sinPadding, className, ...resto }: CardProps) {
  return (
    <div
      className={cn(styles.card, sinPadding && styles.sinPadding, className)}
      {...resto}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(styles.header, className)}>{children}</div>;
}
