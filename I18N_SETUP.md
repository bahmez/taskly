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

To apply translations to the entire application:

1. **Update Dashboard Pages** - Apply `useTranslation` hook to dashboard components
2. **Update Settings Pages** - Translate all settings and configuration labels
3. **Update Notification Pages** - Translate notification messages
4. **Add More Languages** - Create additional locale files (e.g., `de`, `es`, `it`)
5. **Backend Translations** - Coordinate with API to send translated content when needed

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
