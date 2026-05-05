"use client";

import { createContext, type ReactNode, useContext, useMemo, useState } from "react";
import { copy, type CopyKey, type Lang } from "./copy";

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: CopyKey) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children, initialLang = "en" }: { children: ReactNode; initialLang?: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      setLang,
      t: (key) => copy[lang][key],
    }),
    [lang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const value = useContext(LangContext);
  if (!value) {
    throw new Error("useLang must be used inside LangProvider");
  }
  return value;
}

export function LangToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();

  return (
    <div className={`lang-toggle${compact ? " compact" : ""}`} aria-label="Language">
      <button type="button" className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>
        EN
      </button>
      <button type="button" className={lang === "zh" ? "active" : ""} onClick={() => setLang("zh")}>
        中文
      </button>
    </div>
  );
}
