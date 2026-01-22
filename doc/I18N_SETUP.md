# i18n Multi-Language Support Setup

## Overview

This project now supports multi-language (internationalization) using a custom i18n implementation. Users can switch between French (FR) and English (EN) with their preference saved in localStorage.

## Files Structure

### Translation Files
- `public/locales/fr/common.json` - French translations
- `public/locales/en/common.json` - English translations

### Core Implementation
- `src/lib/i18n.ts` - Custom hooks for language management:
  - `useLanguage()` - Manages current language and language switching
  - `useTranslation()` - Provides translation function `t()`
  
- `src/components/language-switcher.tsx` - Language selector component (FR/EN buttons)

## Features Implemented

### 1. Landing Page (`src/app/page.tsx`)
- Fully translated with language selector in header
- Supports dynamic content translation
- All buttons, labels, and text are translatable

### 2. Authentication Pages
- **Login Page** (`src/app/(auth)/login/login-client.tsx`)
  - All form labels and error messages translated
  - OAuth provider buttons translated
  
- **Register Page** (`src/app/(auth)/register/page.tsx`)
  - Email, password fields translated
  - Success/error messages translated

- **Auth Layout** (`src/app/(auth)/layout.tsx`)
  - Language selector positioned at top-right

### 3. Root Layout (`src/app/layout.tsx`)
- Dynamic `lang` attribute on `<html>` tag
- Syncs with user's selected language

### 4. Dashboard & App Pages (`src/components/layout/navbar.tsx`)
- Language selector in the top navigation bar
- Available on all authenticated pages (dashboard, workspaces, boards, etc.)
- Dark theme matching the dashboard design

## Language Selector Component

Two variants are available in `src/components/language-switcher.tsx`:

### 1. LanguageSwitcher (Light theme)
- Used on landing page and authentication pages
- White background with slate border
- Displays: Français / English

### 2. LanguageSwitcherDark (Dark theme)
- Used in the dashboard navbar
- Dark background matching dashboard theme
- Displays: Français / English

Both variants automatically sync with localStorage and update the HTML `lang` attribute.

## Usage

### For Developers

#### Adding Translations

1. Add your translation keys to both `public/locales/fr/common.json` and `public/locales/en/common.json`:

```json
{
  "your_namespace": {
    "your_key": "Your translation here"
  }
}
```

2. Use in components:

```tsx
'use client';

import { useTranslation } from '@/lib/i18n';

export function MyComponent() {
  const { t } = useTranslation();
  
  return <button>{t('your_namespace.your_key')}</button>;
}
```

#### Accessing Arrays/Objects

For complex translations like lists:

```tsx
const features = t('landing.features') as Array<{ title: string; description: string }>;

features.map((feature) => (
  <div key={feature.title}>
    <h3>{feature.title}</h3>
    <p>{feature.description}</p>
  </div>
))
```

#### String Interpolation

For dynamic values in translations:

```tsx
t('landing.footer_copyright', { year: new Date().getFullYear() })
// Translation: "© {{year}} Taskly. All rights reserved."
// Result: "© 2026 Taskly. All rights reserved."
```

### For Users

- Click the **FR** or **EN** button in the header/auth layout to switch languages
- Selection is automatically saved in browser localStorage
- Page language persists across sessions

## Current Translations

### Common Keys
- `common.home`, `common.login`, `common.register`, `common.logout`, `common.dashboard`

### Header
- `header.login_button`, `header.register_button`, `header.dashboard_button`, `header.logout_button`

### Landing Page (`landing.*`)
- Titles, descriptions, features, steps, CTA text
- Footer links and copyright

### Authentication (`auth.*`)
- Form labels and placeholders
- Error messages
- OAuth provider buttons

## Next Steps

To add more languages to the application:

1. **Create new locale files** - Create `public/locales/{lang}/common.json` (e.g., `de`, `es`, `it`)
2. **Update configuration** - Add the new language to `next-i18next.config.ts` in the `locales` array
3. **Update language switcher** - Add new `SelectItem` to both `LanguageSwitcher` and `LanguageSwitcherDark` components

## Implementation Status

✅ **Complete**: i18n implementation with translations applied to:
- Landing page (`src/app/page.tsx`)
- Authentication pages (`src/app/(auth)/login/login-client.tsx`, `src/app/(auth)/register/page.tsx`)
- Dashboard pages:
  - `src/app/(app)/dashboard-client.tsx` - Main dashboard with workspace overview
  - `src/app/(app)/workspaces/[workspaceId]/workspace-boards-client.tsx` - Workspace boards
  - `src/app/(app)/members/members-client.tsx` - Member management
  - `src/app/(app)/settings/settings-client.tsx` - Workspace settings
  - `src/app/(app)/notifications/notifications-client.tsx` - Notifications
- Navbar (`src/components/layout/navbar.tsx`) - All navigation and user menus
- Invite flow (`src/app/(app)/invite/invite-client.tsx`)

All hardcoded French/English strings have been replaced with `t()` calls using the `useTranslation()` hook.

## Configuration

The i18n configuration is in `next-i18next.config.ts`:
- Default language: French (`fr`)
- Supported languages: `['fr', 'en']`
- Namespace: `common` (single namespace for simplicity)

## Notes

- The language preference is stored in `localStorage` with key `language`
- The HTML document's `lang` attribute is automatically updated
- Translations are loaded statically from JSON files at build time
- The system uses client-side rendering for language switching (no page reload needed)
