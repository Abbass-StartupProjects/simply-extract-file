// icon name -> lucide component mapping helper
import {
  Code2, Briefcase, Smartphone, CreditCard, BrainCircuit, HeartPulse,
  ShoppingCart, GraduationCap, Gamepad2, Zap, Rocket,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Code2, Briefcase, Smartphone, CreditCard, BrainCircuit, HeartPulse,
  ShoppingCart, GraduationCap, Gamepad2, Zap, Rocket,
};

export function getIcon(name: string): LucideIcon {
  return iconMap[name] ?? Rocket;
}

export const stageColors: Record<string, string> = {
  Idea: 'bg-ink-100 text-ink-700',
  'Pre-seed': 'bg-brand-100 text-brand-700',
  Seed: 'bg-success-100 text-success-700',
  'Series A': 'bg-warning-100 text-warning-700',
  'Series B': 'bg-warning-100 text-warning-800',
  Growth: 'bg-error-100 text-error-700',
};

export const costColors: Record<string, string> = {
  Free: 'bg-success-100 text-success-700',
  Freemium: 'bg-brand-100 text-brand-700',
  Paid: 'bg-warning-100 text-warning-700',
};
