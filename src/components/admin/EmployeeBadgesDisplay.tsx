import { Badge as BadgeType, getBadgeDisplayInfo, BADGE_DEFINITIONS, BadgeTier } from '@/hooks/useEmployeeBadges';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { Crown, Medal, Award } from 'lucide-react';

interface EmployeeBadgesDisplayProps {
  badges: BadgeType[];
  compact?: boolean;
  maxDisplay?: number;
}

export function EmployeeBadgesDisplay({ badges, compact = false, maxDisplay = 6 }: EmployeeBadgesDisplayProps) {
  if (badges.length === 0) return null;

  const sortedBadges = [...badges].sort((a, b) => {
    const tierOrder: Record<BadgeTier, number> = { gold: 0, silver: 1, bronze: 2 };
    return tierOrder[a.badgeTier] - tierOrder[b.badgeTier];
  });

  const displayBadges = sortedBadges.slice(0, maxDisplay);
  const remainingCount = badges.length - maxDisplay;

  const getTierIcon = (tier: BadgeTier) => {
    switch (tier) {
      case 'gold': return <Crown className="w-3 h-3" />;
      case 'silver': return <Medal className="w-3 h-3" />;
      case 'bronze': return <Award className="w-3 h-3" />;
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        <TooltipProvider>
          {displayBadges.map((badge) => {
            const info = getBadgeDisplayInfo(badge);
            return (
              <Tooltip key={badge.id}>
                <TooltipTrigger>
                  <div className={`w-6 h-6 rounded-full ${info.bgColor} flex items-center justify-center text-white shadow-sm`}>
                    {getTierIcon(badge.badgeTier)}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  <p className="font-medium">{info.fullLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    Rank #{badge.rankAchieved} • {format(new Date(badge.achievedAt), 'MMM d, yyyy')}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger>
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                  +{remainingCount}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{remainingCount} more badge{remainingCount > 1 ? 's' : ''}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {displayBadges.map((badge) => {
        const info = getBadgeDisplayInfo(badge);
        return (
          <TooltipProvider key={badge.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={`${info.bgColor} border-0 text-white px-2 py-1 gap-1.5 cursor-default`}
                >
                  {getTierIcon(badge.badgeTier)}
                  <span className="text-xs font-medium">{info.periodLabel} {info.metricLabel}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px]">
                <p className="font-medium">{info.fullLabel}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Rank #{badge.rankAchieved} • Achieved {format(new Date(badge.achievedAt), 'MMM d, yyyy')}
                </p>
                {badge.metricType === 'revenue' && (
                  <p className="text-xs text-muted-foreground">
                    Value: TZS {badge.valueAchieved.toLocaleString()}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
      {remainingCount > 0 && (
        <Badge variant="outline" className="bg-muted text-muted-foreground">
          +{remainingCount} more
        </Badge>
      )}
    </div>
  );
}

interface BadgeShowcaseProps {
  badges: BadgeType[];
}

export function BadgeShowcase({ badges }: BadgeShowcaseProps) {
  const goldBadges = badges.filter(b => b.badgeTier === 'gold');
  const silverBadges = badges.filter(b => b.badgeTier === 'silver');
  const bronzeBadges = badges.filter(b => b.badgeTier === 'bronze');

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-lg bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 border border-amber-200 dark:border-amber-800">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center mx-auto mb-2 shadow-lg">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{goldBadges.length}</p>
          <p className="text-xs text-amber-600 dark:text-amber-500">Gold</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800/50 dark:to-slate-700/50 border border-slate-200 dark:border-slate-700">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center mx-auto mb-2 shadow-lg">
            <Medal className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">{silverBadges.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Silver</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 border border-orange-200 dark:border-orange-800">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center mx-auto mb-2 shadow-lg">
            <Award className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{bronzeBadges.length}</p>
          <p className="text-xs text-orange-600 dark:text-orange-500">Bronze</p>
        </div>
      </div>

      {/* Badge List */}
      {badges.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <Award className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No badges earned yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Rank in the top 3 to earn badges!
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
          {badges.map((badge) => {
            const info = getBadgeDisplayInfo(badge);
            return (
              <div
                key={badge.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className={`w-9 h-9 rounded-lg ${info.bgColor} flex items-center justify-center shadow-sm`}>
                  {badge.badgeTier === 'gold' && <Crown className="w-4 h-4 text-white" />}
                  {badge.badgeTier === 'silver' && <Medal className="w-4 h-4 text-white" />}
                  {badge.badgeTier === 'bronze' && <Award className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{info.fullLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(badge.achievedAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="outline" className="text-xs">
                    #{badge.rankAchieved}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
