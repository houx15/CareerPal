export type Lang = "en" | "zh";

export const copy = {
  en: {
    brand: "CareerPal",
    nav_product: "Product",
    nav_pricing: "Pricing",
    nav_about: "About",
    sign_in: "Sign in",
    get_started: "Get started",
    intro_eyebrow: "AI career companion",
    intro_headline_a: "Let an AI partner ",
    intro_headline_em: "build your career",
    intro_headline_b: " with you.",
    intro_sub:
      "CareerPal turns scattered experiences into a living career database — match jobs, grow skills, and ship a personal site, all through conversation.",
    cta_start: "Start free",
    cta_demo: "See it in action",
  },
  zh: {
    brand: "CareerPal",
    nav_product: "产品",
    nav_pricing: "价格",
    nav_about: "关于",
    sign_in: "登录",
    get_started: "开始使用",
    intro_eyebrow: "AI 职业伙伴",
    intro_headline_a: "让 AI 伙伴",
    intro_headline_em: "陪你建立职业档案",
    intro_headline_b: "。",
    intro_sub: "CareerPal 通过对话把零散经历整理成持续生长的职业数据库，帮你匹配岗位、规划成长、发布个人页面。",
    cta_start: "免费开始",
    cta_demo: "查看演示",
  },
} as const;

export type CopyKey = keyof (typeof copy)["en"];
