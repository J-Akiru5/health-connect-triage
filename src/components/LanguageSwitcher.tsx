import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const languages = [
  { code: "en", label: "English", short: "EN" },
  { code: "tl", label: "Tagalog", short: "TL" },
  { code: "hil", label: "Hiligaynon", short: "HIL" },
] as const;

type LanguageSwitcherProps = {
  /** Compact mode for navbar (icon + short code). Full mode for settings page. */
  variant?: "compact" | "full";
};

export function LanguageSwitcher({ variant = "compact" }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();

  const currentLang = languages.find((l) => l.code === i18n.language) ?? languages[0];

  function handleChange(code: string) {
    i18n.changeLanguage(code);
  }

  if (variant === "compact") {
    return (
      <Select value={currentLang.code} onValueChange={handleChange}>
        <SelectTrigger
          className="w-auto h-9 gap-1.5 rounded-xl bg-muted/60 border-0 hover:bg-muted px-2.5 text-sm font-medium focus:ring-2 focus:ring-ring"
          aria-label="Select language"
        >
          <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
          <SelectValue>{currentLang.short}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end" className="min-w-[160px]">
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              <span className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground w-8">{lang.short}</span>
                <span>{lang.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select value={currentLang.code} onValueChange={handleChange}>
      <SelectTrigger className="w-full h-11 rounded-xl" aria-label="Select language">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
          <SelectValue>{currentLang.label}</SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <span className="flex items-center gap-3">
              <span className="text-xs font-bold text-muted-foreground w-8">{lang.short}</span>
              <span>{lang.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
