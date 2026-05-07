import type { Lang } from "../i18n/copy";
import type { ExperienceItem } from "../lib/types";

export type SectionState = "empty" | "partial" | "complete";
type DemoExperienceItem = ExperienceItem & { co?: string; note?: string };

export interface DemoProfile {
  name: string;
  initials: string;
  handle: string;
  email: string;
  role: string;
  location: string;
  phone: string;
  summary: string;
  basics: { state: SectionState };
  summarySec: { state: SectionState };
  experience: { state: SectionState; items: DemoExperienceItem[] };
  skills: { state: SectionState; items: Array<{ name: string; years: number; level: number }> };
  projects: { state: SectionState; items: Array<{ title?: string; note?: string }> };
  education: { state: SectionState; items: Array<{ school: string; degree: string; time: string }> };
}

export const sampleProfiles: Record<Lang, DemoProfile> = {
  en: {
    name: "Alex Chen",
    initials: "AC",
    handle: "alexchen",
    email: "alex@chen.co",
    role: "Senior Product Designer",
    location: "Brooklyn, NY",
    phone: "",
    summary: "8 years designing tools for makers. Strongest where ambiguity meets design systems.",
    basics: { state: "complete" },
    summarySec: { state: "partial" },
    experience: {
      state: "complete",
      items: [
        {
          company: "Linear",
          co: "Linear",
          role: "Lead Designer",
          time: "2023 - present",
          description: "Shipped issue triage v2.",
          note: "Shipped issue triage v2.",
          achievements: [],
        },
      ],
    },
    skills: {
      state: "complete",
      items: [
        { name: "Product strategy", years: 8, level: 0.9 },
        { name: "Design systems", years: 6, level: 0.85 },
        { name: "User research", years: 7, level: 0.75 },
        { name: "Prototyping", years: 8, level: 0.88 },
        { name: "AI / Prompting", years: 1, level: 0.5 },
      ],
    },
    projects: { state: "empty", items: [] },
    education: {
      state: "complete",
      items: [{ school: "Carnegie Mellon", degree: "BFA, Design", time: "2013 - 2017" }],
    },
  },
  zh: {
    name: "李思源",
    initials: "LS",
    handle: "lisiyuan",
    email: "siyuan.li@example.com",
    role: "高级产品设计师",
    location: "上海 · 浦东",
    phone: "",
    summary: "8 年产品设计经验，专注 B 端工具与 AI 产品。擅长把模糊问题拆成可落地的设计系统，并推动跨团队协作。",
    basics: { state: "complete" },
    summarySec: { state: "partial" },
    experience: {
      state: "complete",
      items: [
        {
          company: "字节跳动",
          co: "字节跳动",
          role: "高级产品设计师",
          time: "2022 至今",
          description: "主导飞书多维表格 AI 重设计，DAU +37%",
          note: "主导飞书多维表格 AI 重设计，DAU +37%",
          achievements: [],
        },
      ],
    },
    skills: {
      state: "complete",
      items: [
        { name: "产品策略", years: 8, level: 0.92 },
        { name: "设计系统", years: 6, level: 0.85 },
        { name: "用户研究", years: 7, level: 0.78 },
        { name: "原型与交互", years: 8, level: 0.88 },
        { name: "AI / Prompt", years: 1, level: 0.45 },
      ],
    },
    projects: { state: "empty", items: [] },
    education: {
      state: "complete",
      items: [{ school: "同济大学", degree: "设计学士", time: "2013 - 2017" }],
    },
  },
};
