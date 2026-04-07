"use client";

import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";
import Link from "next/link";

const COLOR = "#8b5cf6";

const ONBOARDING = {
  admin: {
    title: "Admin Onboarding",
    subtitle: "You manage the cockpit. Here's how to set everything up.",
    steps: [
      { label: "Set up your profile", href: "/equipe/profile", desc: "Fill in your bio, skills, and contact info" },
      { label: "Configure the bot", href: "/setup/bot", desc: "Choose AI provider and model for @RadarPMBot" },
      { label: "Add API keys", href: "/setup/api-keys", desc: "Add OpenRouter, Anthropic, or Mistral keys" },
      { label: "Invite team members", href: "/equipe/members", desc: "Send magic links to cofounders and mentors" },
      { label: "Define the Vision", href: "/pourquoi/mission", desc: "Write the mission, vision, and north star metric" },
      { label: "Set Objectives", href: "/objectives", desc: "Define up to 3 objectives per pillar" },
      { label: "Review the checklist", href: "/setup/checklist", desc: "76 items across 7 pillars — the source of truth" },
      { label: "Create first tasks", href: "/projet/board", desc: "Add tasks to the kanban board for Sprint 1" },
    ],
  },
  cofounder: {
    title: "Co-founder Onboarding",
    subtitle: "Welcome to the team. Here's how to get started.",
    steps: [
      { label: "Set up your profile", href: "/equipe/profile", desc: "Fill in your bio, skills, and contact info" },
      { label: "Read the Vision", href: "/pourquoi/mission", desc: "Understand the mission and where we're going" },
      { label: "Define Objectives", href: "/objectives", desc: "Propose and validate objectives for your pillars" },
      { label: "Check the Board", href: "/projet/board", desc: "See what tasks are assigned to you this sprint" },
      { label: "Join decisions", href: "/pourquoi/decisions", desc: "Vote on open decisions" },
      { label: "Connect on Telegram", href: "/setup/bot", desc: "Send /start to @RadarPMBot to get notifications" },
    ],
  },
  mentor: {
    title: "Mentor Onboarding",
    subtitle: "You have read-only access. Your expertise helps the team decide.",
    steps: [
      { label: "Set up your profile", href: "/equipe/profile", desc: "Let the team know who you are" },
      { label: "Read the Vision", href: "/pourquoi/mission", desc: "Understand what the team is building" },
      { label: "Review Objectives", href: "/objectives", desc: "Validate objectives with your expertise" },
      { label: "Join decisions", href: "/pourquoi/decisions", desc: "Give your opinion on open debates" },
      { label: "Check Strategy Notes", href: "/pourquoi/vision-strategy", desc: "Read and comment on strategic thinking" },
    ],
  },
  observer: {
    title: "Observer Onboarding",
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
  const onboarding = ONBOARDING[role] || ONBOARDING.observer;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <PageHeader title={onboarding.title} subtitle={onboarding.subtitle} color={COLOR} />

      <div className="space-y-3">
        {onboarding.steps.map((step, i) => (
          <Link key={i} href={step.href}>
            <Card className="hover:border-[#334155] cursor-pointer transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 text-sm font-bold shrink-0 group-hover:bg-purple-500/20 transition">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white group-hover:text-purple-400 transition">{step.label}</p>
                  <p className="text-xs text-[#64748b] mt-0.5">{step.desc}</p>
                </div>
                <span className="text-[#334155] group-hover:text-[#64748b] transition text-sm">&rarr;</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
