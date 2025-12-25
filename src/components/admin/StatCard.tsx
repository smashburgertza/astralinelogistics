import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

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
    card: 'bg-card border border-border/50',
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
    value: 'text-foreground',
    title: 'text-muted-foreground',
    subtitle: 'text-muted-foreground/70',
  },
  primary: {
    card: 'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500',
    iconBg: 'bg-white/20 backdrop-blur-sm',
    iconColor: 'text-white',
    value: 'text-white',
    title: 'text-white/90',
    subtitle: 'text-white/70',
  },
  success: {
    card: 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600',
    iconBg: 'bg-white/20 backdrop-blur-sm',
    iconColor: 'text-white',
    value: 'text-white',
    title: 'text-white/90',
    subtitle: 'text-white/70',
  },
  warning: {
    card: 'bg-gradient-to-br from-orange-400 via-orange-500 to-red-500',
    iconBg: 'bg-white/20 backdrop-blur-sm',
    iconColor: 'text-white',
    value: 'text-white',
    title: 'text-white/90',
    subtitle: 'text-white/70',
  },
  navy: {
    card: 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700',
    iconBg: 'bg-white/20 backdrop-blur-sm',
    iconColor: 'text-white',
    value: 'text-white',
    title: 'text-white/90',
    subtitle: 'text-white/70',
  },
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group",
      styles.card
    )}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110",
            styles.iconBg
          )}>
            <Icon className={cn("w-7 h-7", styles.iconColor)} />
          </div>
          {trend && (
            <div className={cn(
              "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm",
              trend.isPositive 
                ? "bg-emerald-500/20 text-emerald-100" 
                : "bg-red-500/20 text-red-100"
            )}>
              {trend.isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        
        <p className={cn(
          "text-4xl font-bold tracking-tight mb-1",
          styles.value
        )}>
          {value}
        </p>
        
        <p className={cn(
          "text-sm font-medium",
          styles.title
        )}>
          {title}
        </p>
        
        {subtitle && (
          <p className={cn(
            "text-xs mt-1.5 font-medium",
            styles.subtitle
          )}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}