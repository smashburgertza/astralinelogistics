import { useExchangeRates, convertToTZS } from '@/hooks/useExchangeRates';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface CurrencyDisplayProps {
  amount: number;
  currency: string;
  showTzsEquivalent?: boolean;
  className?: string;
  tzsClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function formatAmount(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency + ' ';
  
  if (currency === 'TZS') {
    return `TZS ${amount.toLocaleString('en-TZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function CurrencyDisplay({ 
  amount, 
  currency, 
  showTzsEquivalent = true,
  className,
  tzsClassName,
  size = 'md'
}: CurrencyDisplayProps) {
  const { data: exchangeRates } = useExchangeRates();
  
  const formattedAmount = formatAmount(amount, currency);
  const tzsAmount = currency !== 'TZS' && exchangeRates 
    ? convertToTZS(amount, currency, exchangeRates) 
    : null;

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold',
  };

  const tzsSizeClasses = {
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm',
  };

  return (
    <span className={cn('inline-flex flex-col', className)}>
      <span className={sizeClasses[size]}>{formattedAmount}</span>
      {showTzsEquivalent && tzsAmount !== null && (
        <span className={cn('text-muted-foreground', tzsSizeClasses[size], tzsClassName)}>
          ≈ TZS {tzsAmount.toLocaleString('en-TZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
      )}
    </span>
  );
}

// Inline version for tables
export function CurrencyInline({ 
  amount, 
  currency, 
  showTzsEquivalent = true,
  className,
}: Omit<CurrencyDisplayProps, 'size' | 'tzsClassName'>) {
  const { data: exchangeRates } = useExchangeRates();
  
  const formattedAmount = formatAmount(amount, currency);
  const tzsAmount = currency !== 'TZS' && exchangeRates 
    ? convertToTZS(amount, currency, exchangeRates) 
    : null;

  return (
    <span className={cn('whitespace-nowrap', className)}>
      {formattedAmount}
      {showTzsEquivalent && tzsAmount !== null && (
        <span className="text-muted-foreground text-xs ml-1">
          (≈TZS {Math.round(tzsAmount).toLocaleString()})
        </span>
      )}
    </span>
  );
}
