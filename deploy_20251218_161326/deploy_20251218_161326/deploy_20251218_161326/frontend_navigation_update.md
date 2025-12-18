# Frontend Navigation Update Instructions

## Add Role Management to Navigation

You need to add the Role management page to your navigation menu. This is typically in your sidebar or main navigation component.

### 1. Add Route to Router
Add this to your main router file (usually `App.tsx` or similar):

```tsx
import { Roles } from './pages/Roles';

// Add this route with your other routes
<Route path="/roles" element={<Roles />} />
```

### 2. Add Navigation Menu Item
Add this to your navigation menu (usually in a sidebar component):

```tsx
// Add this menu item in your navigation
{
  name: 'Role Management',
  href: '/roles',
  icon: UsersIcon, // or any appropriate icon
  current: pathname === '/roles'
}
```

### 3. Example Navigation Structure
Your navigation might look like this:

```tsx
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Employees', href: '/employees', icon: UsersIcon },
  { name: 'Recruitment', href: '/recruitments', icon: UserPlusIcon },
  { name: 'Role Management', href: '/roles', icon: BriefcaseIcon }, // <- Add this
  { name: 'Office Management', href: '/offices', icon: BuildingOfficeIcon },
  { name: 'Platform Management', href: '/platforms', icon: CpuChipIcon },
  // ... other menu items
];
```

## Import Required Icons
Make sure to import any icons you use:

```tsx
import { BriefcaseIcon } from '@heroicons/react/24/outline';
```