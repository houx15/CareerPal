export interface User {
  id: string;
  email: string;
  username: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: "bearer";
  user: User;
}

export interface EducationItem {
  school: string;
  degree: string;
  time: string;
  comment?: string | null;
}

export interface ExperienceItem extends Record<string, unknown> {
  company: string;
  role: string;
  time: string;
  description: string;
  achievements: string[];
  comment?: string | null;
}

export interface ProjectItem extends Record<string, unknown> {
  name: string;
  description: string;
  tech_stack: string[];
  achievements: string[];
  link?: string | null;
  comment?: string | null;
  completeness?: "sparse" | "partial" | "complete";
}

export type SkillProficiency = "beginner" | "intermediate" | "advanced" | "expert";

export interface SkillItem extends Record<string, unknown> {
  name: string;
  category: string;
  proficiency: SkillProficiency;
  comment?: string | null;
  years?: number;
  level?: number;
}

export interface CertificateItem {
  name: string;
  issuer: string;
  date: string;
  comment?: string | null;
}

export interface Profile {
  updated_at: string;
  name: string | null;
  phone: string | null;
  contact_email: string | null;
  location: string | null;
  headline: string | null;
  target_direction: string | null;
  comment: string | null;
  education: EducationItem[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  skills: SkillItem[];
  certificates: CertificateItem[];
}

export type ProfilePatch = Partial<
  Pick<
    Profile,
    | "name"
    | "phone"
    | "contact_email"
    | "location"
    | "headline"
    | "target_direction"
    | "comment"
    | "education"
    | "experience"
    | "projects"
    | "skills"
    | "certificates"
  >
>;

export type CompletenessState = "empty" | "partial" | "complete";

export interface ProfileCompleteness {
  overall: CompletenessState;
  sections: Record<string, CompletenessState>;
}

export type ConversationContextType = "career" | "page";
export type ConversationRole = "user" | "assistant";

export interface ConversationMessage {
  role: ConversationRole;
  content: string;
}

export interface StartConversationPayload {
  context_type: ConversationContextType;
  focus_node?: string | null;
}

export interface Conversation {
  id: string;
  context_type: ConversationContextType;
  focus_node: string | null;
  messages: ConversationMessage[];
}

export interface SendMessagePayload {
  conversation_id: string;
  content: string;
}

export interface SendMessageResponse {
  conversation_id: string;
  assistant_message: ConversationMessage;
  messages: ConversationMessage[];
}
