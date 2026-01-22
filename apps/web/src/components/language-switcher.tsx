'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@taskly/ui';
import { useLanguage } from '@/lib/i18n';

export function LanguageSwitcher() {
  const { language, changeLanguage, mounted } = useLanguage();

  if (!mounted) return null;

  return (
    <Select value={language} onValueChange={(value) => changeLanguage(value as 'fr' | 'en')}>
      <SelectTrigger className="w-32 h-10 bg-white border-slate-300 text-slate-900 font-medium">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="fr">Français</SelectItem>
        <SelectItem value="en">English</SelectItem>
      </SelectContent>
    </Select>
  );
}

// Version pour le dashboard avec style sombre
export function LanguageSwitcherDark() {
  const { language, changeLanguage, mounted } = useLanguage();

  if (!mounted) return null;

  return (
    <Select value={language} onValueChange={(value) => changeLanguage(value as 'fr' | 'en')}>
      <SelectTrigger className="w-32 h-8 bg-[#22272b] border-[#9fadbc29] text-[#b6c2cf] hover:bg-[#2c333a] font-medium">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent className="bg-[#1d2125] border-[#9fadbc29] text-[#b6c2cf]">
        <SelectItem value="fr">Français</SelectItem>
        <SelectItem value="en">English</SelectItem>
      </SelectContent>
    </Select>
  );
}
