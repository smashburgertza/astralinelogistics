import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'navy';
}

const variantStyles = {
  default: {
    card: 'bg-card border border-border',
    icon: 'bg-muted text-muted-foreground',
    value: 'text-foreground',
  },
  primary: {
    card: 'bg-gradient-to-br from-primary to-brand-gold-dark text-primary-foreground',
    icon: 'bg-white/20 text-white',
    value: 'text-white',
  },
  success: {
    card: 'bg-gradient-to-br from-success to-emerald-600 text-white',
    icon: 'bg-white/20 text-white',
    value: 'text-white',
  },
  warning: {
    card: 'bg-gradient-to-br from-warning to-amber-600 text-white',
    icon: 'bg-white/20 text-white',
    value: 'text-white',
  },
  navy: {
    card: 'bg-gradient-to-br from-brand-navy to-brand-navy-dark text-white',
    icon: 'bg-white/20 text-white',
    value: 'text-white',
  },
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <div className={cn(
      "rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
      styles.card
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center",
          styles.icon
        )}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className={cn(
            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
            trend.isPositive 
              ? "bg-success/20 text-success" 
              : "bg-destructive/20 text-destructive"
          )}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      
      <p className={cn(
        "text-3xl font-bold font-heading mb-1",
        styles.value
      )}>
        {value}
      </p>
      
      <p className={cn(
        "text-sm",
        variant === 'default' ? 'text-muted-foreground' : 'text-white/70'
      )}>
        {title}
      </p>
      
      {subtitle && (
        <p className={cn(
          "text-xs mt-1",
          variant === 'default' ? 'text-muted-foreground/70' : 'text-white/50'
        )}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
