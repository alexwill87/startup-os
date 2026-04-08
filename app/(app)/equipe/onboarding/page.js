"use client";

import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";
import Link from "next/link";

const COLOR = "#8b5cf6";

const ROLE_HIERARCHY = {
  admin: ["admin", "cofounder", "mentor", "observer"],
  cofounder: ["cofounder", "mentor", "observer"],
  mentor: ["mentor", "observer"],
  observer: ["observer"],
};

const ROLE_META = {
  admin: { color: "#ef4444", icon: "A" },
  cofounder: { color: "#3b82f6", icon: "C" },
  mentor: { color: "#10b981", icon: "M" },
  observer: { color: "#64748b", icon: "O" },
};

const ONBOARDING = {
  admin: {
    title: "Admin",
    subtitle: "You manage the cockpit. Here's how to set everything up.",
    steps: [
      { label: "Set up your profile", href: "/equipe/profile", desc: "Fill in your bio, skills, and contact info" },
      { label: "Configure the bot", href: "/setup/bot", desc: "Choose AI provider and model for @YourBot" },
      { label: "Add API keys", href: "/setup/api-keys", desc: "Add OpenRouter, Anthropic, or Mistral keys" },
      { label: "Invite team members", href: "/equipe/members", desc: "Send magic links to cofounders and mentors" },
      { label: "Define the Vision", href: "/pourquoi/mission", desc: "Write the mission, vision, and north star metric" },
      { label: "Set Goals", href: "/objectives", desc: "Define up to 3 goals per pillar" },
      { label: "Review the checklist", href: "/setup/checklist", desc: "76 items across 7 pillars — the source of truth" },
      { label: "Create first tasks", href: "/projet/features", desc: "Add tasks to the kanban board for Sprint 1" },
    ],
  },
  cofounder: {
    title: "Co-founder",
    subtitle: "Welcome to the team. Here's how to get started.",
    steps: [
      { label: "Set up your profile", href: "/equipe/profile", desc: "Fill in your bio, skills, and contact info" },
      { label: "Read the Vision", href: "/pourquoi/mission", desc: "Understand the mission and where we're going" },
      { label: "Define Goals", href: "/objectives", desc: "Propose and validate goals for your pillars" },
      { label: "Check the Board", href: "/projet/features", desc: "See what tasks are assigned to you this sprint" },
      { label: "Join decisions", href: "/pourquoi/decisions", desc: "Vote on open decisions" },
      { label: "Connect on Telegram", href: "/setup/bot", desc: "Send /start to @YourBot to get notifications" },
    ],
  },
  mentor: {
    title: "Mentor",
    subtitle: "You have read-only access. Your expertise helps the team decide.",
    steps: [
      { label: "Set up your profile", href: "/equipe/profile", desc: "Let the team know who you are" },
      { label: "Read the Vision", href: "/pourquoi/mission", desc: "Understand what the team is building" },
      { label: "Review Goals", href: "/objectives", desc: "Validate goals with your expertise" },
      { label: "Join decisions", href: "/pourquoi/decisions", desc: "Give your opinion on open debates" },
      { label: "Check Strategy Notes", href: "/pourquoi/vision-strategy", desc: "Read and comment on strategic thinking" },
    ],
  },
  observer: {
    title: "Observer",
    subtitle: "Welcome! Explore the project and share your feedback.",
    steps: [
      { label: "Read the Vision", href: "/pourquoi/mission", desc: "Discover why this project exists" },
      { label: "Check KPIs", href: "/analytics/kpis", desc: "See how the project is progressing" },
      { label: "Give Feedback", href: "/feedback", desc: "Share ideas, report bugs, ask questions" },
    ],
  },
};

export default function OnboardingPage() {
  const { member } = useAuth();
  const role = member?.role || "observer";
  const visibleRoles = ROLE_HIERARCHY[role] || ["observer"];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <PageHeader title="Onboarding" subtitle="Step-by-step guides for each role" color={COLOR} />

      {visibleRoles.map((r) => {
        const onboarding = ONBOARDING[r];
        const meta = ROLE_META[r];
        const isOwnRole = r === role;

        return (
          <div key={r}>
            {/* Role header */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold text-white"
                style={{ backgroundColor: meta.color }}
              >
                {meta.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-white">{onboarding.title}</h2>
                  {isOwnRole && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">You</span>
                  )}
                </div>
                <p className="text-xs text-[#64748b]">{onboarding.subtitle}</p>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-2 ml-4 mb-6">
              {onboarding.steps.map((step, i) => (
                <Link key={i} href={step.href}>
                  <Card className="hover:border-[#334155] cursor-pointer transition-all group">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 group-hover:scale-110 transition"
                        style={{ backgroundColor: meta.color + "20", color: meta.color }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white group-hover:text-blue-400 transition">{step.label}</p>
                        <p className="text-[10px] text-[#475569]">{step.desc}</p>
                      </div>
                      <span className="text-[#334155] group-hover:text-[#64748b] transition text-sm">&rarr;</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Separator between roles */}
            {visibleRoles.indexOf(r) < visibleRoles.length - 1 && (
              <div className="h-px bg-[#1e293b]" />
            )}
          </div>
        );
      })}
    </div>
  );
}
