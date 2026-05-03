// CareerPal data — career DB with branches (resume versions), skill tree, match history

const SAMPLE_PROFILE_ZH = {
  name: "李思源",
  initials: "LS",
  handle: "lisiyuan",
  email: "siyuan.li@example.com",
  role: "高级产品设计师",
  location: "上海 · 浦东",
  summary: "8 年产品设计经验,专注 B 端工具与 AI 产品。擅长把模糊问题拆成可落地的设计系统,并推动跨团队协作。",
  basics: { state: "complete" },
  summarySec: { state: "partial" },
  experience: {
    state: "complete",
    items: [
      { co: "字节跳动", role: "高级产品设计师", time: "2022 至今", note: "主导飞书多维表格 AI 重设计,DAU +37%" },
      { co: "美团", role: "产品设计师", time: "2019 – 2022", note: "主导外卖商家端改版,操作时长 -22%" },
      { co: "腾讯", role: "交互设计师", time: "2017 – 2019", note: "微信读书早期成长团队成员" },
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
    items: [{ school: "同济大学", degree: "设计学士", time: "2013 – 2017" }],
  },
};

const SAMPLE_PROFILE_EN = {
  name: "Alex Chen",
  initials: "AC",
  handle: "alexchen",
  email: "alex@chen.co",
  role: "Senior Product Designer",
  location: "Brooklyn, NY",
  summary: "8 years designing tools for makers. Strongest where ambiguity meets design systems.",
  basics: { state: "complete" },
  summarySec: { state: "partial" },
  experience: {
    state: "complete",
    items: [
      { co: "Linear", role: "Lead Designer", time: "2023 – present", note: "Shipped issue triage v2; team CSAT +18%" },
      { co: "Notion", role: "Product Designer", time: "2020 – 2023", note: "AI block primitives, pre-launch" },
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
    items: [{ school: "Carnegie Mellon", degree: "BFA, Design", time: "2013 – 2017" }],
  },
};

// Match history — branches off the master resume
const MATCH_HISTORY_ZH = [
  { id: "m1", role: "AI 产品设计师", co: "MiniMax", score: 88, date: "2 天前", saved: true, branch: "v_minimax_ai" },
  { id: "m2", role: "高级产品设计师", co: "小红书", score: 82, date: "上周", saved: true, branch: "v_xhs_senior" },
  { id: "m3", role: "设计主管", co: "Soul", score: 71, date: "2 周前", saved: false, branch: null },
  { id: "m4", role: "产品设计经理", co: "腾讯", score: 76, date: "上月", saved: false, branch: null },
  { id: "m5", role: "高级交互设计师", co: "阿里", score: 79, date: "上月", saved: true, branch: "v_ali_ix" },
];
const MATCH_HISTORY_EN = [
  { id: "m1", role: "Senior PD, AI", co: "Anthropic", score: 87, date: "2d ago", saved: true, branch: "v_anthropic_ai" },
  { id: "m2", role: "Design Lead", co: "Linear", score: 82, date: "last week", saved: true, branch: "v_linear_lead" },
  { id: "m3", role: "Head of Design", co: "Stripe", score: 71, date: "2w ago", saved: false, branch: null },
  { id: "m4", role: "Product Designer", co: "Figma", score: 76, date: "last month", saved: false, branch: null },
  { id: "m5", role: "Sr. UX Designer", co: "Notion", score: 79, date: "last month", saved: true, branch: "v_notion_ux" },
];

// Radar dimensions for match
const RADAR_DIMS_ZH = ["产品策略", "AI 经验", "设计系统", "团队领导", "数据驱动", "跨职能协作"];
const RADAR_DIMS_EN = ["Strategy", "AI experience", "Design systems", "Leadership", "Data-driven", "Cross-functional"];

// Skill tree — geometric, parent/child relationships, quality scores
// state: done (mature, can fork) | active (in progress) | locked (not started)
// quality: 0-1 — active nodes with low quality can be improved
const SKILL_TREE_ZH = {
  goal: "成为 AI 产品设计负责人",
  // root anchored top-center; children fan out below
  nodes: [
    // L0: root (always done implicitly)
    { id: "root",   label: "起点",                state: "done",   quality: 1.0, parent: null, x: 0,    y: 0 },
    // L1
    { id: "ai",     label: "AI 产品设计",          state: "done",   quality: 0.85, parent: "root", x: -260, y: 120 },
    { id: "lead",   label: "团队领导",             state: "active", quality: 0.55, parent: "root", x: 0,    y: 120 },
    { id: "biz",    label: "商业洞察",             state: "active", quality: 0.4,  parent: "root", x: 260,  y: 120 },
    // L2 under AI
    { id: "prompt", label: "Prompt 与对话设计",     state: "done",   quality: 0.92, parent: "ai",   x: -380, y: 250 },
    { id: "agent",  label: "Agent 工作流",          state: "active", quality: 0.35, parent: "ai",   x: -180, y: 250 },
    // L2 under lead
    { id: "review", label: "设计评审主持",          state: "active", quality: 0.5,  parent: "lead", x: 0,    y: 250 },
    // L2 under biz
    { id: "metric", label: "北极星指标",            state: "locked", quality: 0,    parent: "biz",  x: 200,  y: 250 },
    { id: "growth", label: "增长设计基础",          state: "locked", quality: 0,    parent: "biz",  x: 360,  y: 250 },
  ],
};

const SKILL_TREE_EN = {
  goal: "Become a Head of AI Design",
  nodes: [
    { id: "root",   label: "Start",                 state: "done",   quality: 1.0, parent: null, x: 0,    y: 0 },
    { id: "ai",     label: "AI product design",     state: "done",   quality: 0.85, parent: "root", x: -260, y: 120 },
    { id: "lead",   label: "Leadership",            state: "active", quality: 0.55, parent: "root", x: 0,    y: 120 },
    { id: "biz",    label: "Business sense",        state: "active", quality: 0.4,  parent: "root", x: 260,  y: 120 },
    { id: "prompt", label: "Prompt & convo design", state: "done",   quality: 0.92, parent: "ai",   x: -380, y: 250 },
    { id: "agent",  label: "Agent workflows",       state: "active", quality: 0.35, parent: "ai",   x: -180, y: 250 },
    { id: "review", label: "Run design reviews",    state: "active", quality: 0.5,  parent: "lead", x: 0,    y: 250 },
    { id: "metric", label: "North star metrics",    state: "locked", quality: 0,    parent: "biz",  x: 200,  y: 250 },
    { id: "growth", label: "Growth design",         state: "locked", quality: 0,    parent: "biz",  x: 360,  y: 250 },
  ],
};

window.SAMPLE_PROFILE_ZH = SAMPLE_PROFILE_ZH;
window.SAMPLE_PROFILE_EN = SAMPLE_PROFILE_EN;
window.MATCH_HISTORY_ZH = MATCH_HISTORY_ZH;
window.MATCH_HISTORY_EN = MATCH_HISTORY_EN;
window.RADAR_DIMS_ZH = RADAR_DIMS_ZH;
window.RADAR_DIMS_EN = RADAR_DIMS_EN;
window.SKILL_TREE_ZH = SKILL_TREE_ZH;
window.SKILL_TREE_EN = SKILL_TREE_EN;
