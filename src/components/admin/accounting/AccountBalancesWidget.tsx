import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building, ChevronRight, Plus } from 'lucide-react';
import { useBankAccounts } from '@/hooks/useAccounting';
import { useExchangeRatesMap } from '@/hooks/useExchangeRates';
import { Skeleton } from '@/components/ui/skeleton';

interface AccountBalancesWidgetProps {
  onAddAccount?: () => void;
  onViewAll?: () => void;
}

export function AccountBalancesWidget({ onAddAccount, onViewAll }: AccountBalancesWidgetProps) {
  const { data: bankAccounts = [], isLoading } = useBankAccounts();
  const { getRate } = useExchangeRatesMap();

  const formatCurrency = (amount: number, currency: string = 'TZS') => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const convertToTZS = (amount: number, currency: string) => {
    const rate = getRate(currency);
    return amount * rate;
  };

  const totalBalanceTZS = bankAccounts.reduce((sum, account) => {
    return sum + convertToTZS(account.current_balance, account.currency);
  }, 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Account Balances</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Account Balances</CardTitle>
          {onAddAccount && (
            <Button variant="ghost" size="icon" onClick={onAddAccount}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {bankAccounts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Building className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No bank accounts</p>
            {onAddAccount && (
              <Button variant="link" size="sm" onClick={onAddAccount}>
                Add your first account
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {bankAccounts.slice(0, 5).map((account) => {
              const balanceInTZS = convertToTZS(account.current_balance, account.currency);
              const isPositive = account.current_balance >= 0;
              
              return (
                <div 
                  key={account.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Building className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{account.account_name}</p>
                      <p className="text-xs text-muted-foreground">{account.bank_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(account.current_balance, account.currency)}
                    </p>
                    {account.currency !== 'TZS' && (
                      <p className="text-xs text-muted-foreground">
                        ≈ {formatCurrency(balanceInTZS)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Total */}
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total (TZS)</span>
                <span className="font-bold text-lg">{formatCurrency(totalBalanceTZS)}</span>
              </div>
            </div>

            {bankAccounts.length > 5 && onViewAll && (
              <Button variant="ghost" className="w-full" onClick={onViewAll}>
                View all {bankAccounts.length} accounts
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
