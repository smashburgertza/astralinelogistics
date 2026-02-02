

# Role-Based Default Landing Page Implementation

## Overview

Keep both dashboards but make **My Dashboard** the default landing page for regular employees, while **super admins** land on the company-wide **Dashboard**.

## Current Behavior

| User Role | Login Redirect | Issue |
|-----------|----------------|-------|
| super_admin | `/admin` | ✓ Correct - sees company overview |
| employee | `/admin` | ✗ Sees company data, not personal metrics |

## Proposed Behavior

| User Role | Login Redirect | Landing Page |
|-----------|----------------|--------------|
| super_admin | `/admin` | Company Dashboard (global stats) |
| employee | `/admin/my-dashboard` | My Dashboard (personal metrics) |

## Implementation Changes

### 1. Update SystemAuth Login Redirect

**File**: `src/pages/SystemAuth.tsx`

Update the login success handler to check the user's role and redirect accordingly:

```typescript
// After successful authentication
if (userRole.role === 'super_admin') {
  toast.success('Welcome to Admin Portal!');
  navigate('/admin');  // Company dashboard for super admins
} else if (userRole.role === 'employee') {
  toast.success('Welcome to Employee Portal!');
  navigate('/admin/my-dashboard');  // Personal dashboard for employees
}
```

### 2. Update Sidebar Navigation Order (Optional Enhancement)

**File**: `src/components/layout/AdminLayout.tsx`

Reorder navigation items so "My Dashboard" appears first for employees, providing visual consistency with their landing page:

```typescript
// Conditional ordering based on role
const mainNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'My Dashboard', href: '/admin/my-dashboard', icon: User },
  // ... rest of items
];
```

*Note: This is optional since the current order already shows both dashboards at the top.*

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/SystemAuth.tsx` | Add role-based redirect logic after login |

## User Experience Flow

**For Super Admins:**
1. Login at `/system`
2. Redirect to `/admin` (Company Dashboard)
3. See global metrics: total shipments, all revenue, expense breakdown, employee leaderboard

**For Regular Employees:**
1. Login at `/system`
2. Redirect to `/admin/my-dashboard` (My Dashboard)
3. See personal metrics: their estimates, invoices, commissions, activity charts

Both users can still navigate to either dashboard via the sidebar - this just sets the sensible default.

## Technical Notes

- No database changes required
- No new routes needed - both dashboards already exist
- Backward compatible - users can still manually navigate to either dashboard
- The `useAuth` hook already provides `hasRole()` for role checks

