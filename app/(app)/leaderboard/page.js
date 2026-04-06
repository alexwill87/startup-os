"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#f59e0b";

const PERIODS = [
  { id: "all", label: "All Time" },
  { id: "week", label: "This Week" },
  { id: "today", label: "Today" },
];

export default function LeaderboardPage() {
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({});
  const [period, setPeriod] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, [period]);

  async function fetchAll() {
    setLoading(true);

    // Date filter
    let dateFilter = null;
    const now = new Date();
    if (period === "today") {
      dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else if (period === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = weekAgo.toISOString();
    }

    const [{ data: memberData }, { data: activityData }, { data: voteData }, { data: responseData }] = await Promise.all([
      supabase.from("cockpit_members").select("name, email, builder, color, role").eq("status", "active"),
      dateFilter
        ? supabase.from("cockpit_activity").select("actor_name, action, created_at").gte("created_at", dateFilter)
        : supabase.from("cockpit_activity").select("actor_name, action, created_at"),
      dateFilter
        ? supabase.from("cockpit_votes").select("voter_name, direction, created_at").gte("created_at", dateFilter)
        : supabase.from("cockpit_votes").select("voter_name, direction, created_at"),
      dateFilter
        ? supabase.from("cockpit_responses").select("author_name, is_accepted, created_at").gte("created_at", dateFilter)
        : supabase.from("cockpit_responses").select("author_name, is_accepted, created_at"),
    ]);

    setMembers(memberData || []);

    // Calculate stats per member
    const memberStats = {};
    for (const m of (memberData || [])) {
      const name = m.name;
      memberStats[name] = {
        name,
        color: m.color || "#3b82f6",
        builder: m.builder,
        role: m.role,
        actions: 0,      // things created/updated/completed
        votes_given: 0,   // votes cast
        votes_received: 0,// votes received on their responses
        responses: 0,     // answers given
        accepted: 0,      // accepted answers
        score: 0,
      };
    }

    // Count activities
    for (const a of (activityData || [])) {
      const name = a.actor_name;
      if (name && memberStats[name]) {
        memberStats[name].actions++;
      }
    }

    // Count votes given
    for (const v of (voteData || [])) {
      const name = v.voter_name;
      if (name && memberStats[name]) {
        memberStats[name].votes_given++;
      }
    }

    // Count responses
    for (const r of (responseData || [])) {
      const name = r.author_name;
      if (name && memberStats[name]) {
        memberStats[name].responses++;
        if (r.is_accepted) memberStats[name].accepted++;
      }
    }

    // Calculate score
    // Actions: 2pts, Votes given: 1pt, Responses: 3pts, Accepted: 5pts
    for (const name of Object.keys(memberStats)) {
      const s = memberStats[name];
      s.score = (s.actions * 2) + (s.votes_given * 1) + (s.responses * 3) + (s.accepted * 5);
    }

    setStats(memberStats);
    setLoading(false);
  }

  const ranked = Object.values(stats).sort((a, b) => b.score - a.score);
  const maxScore = ranked.length > 0 ? ranked[0].score : 1;

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-[#475569] text-sm font-mono">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Leaderboard" subtitle="Who's contributing the most?" color={COLOR} />

      {/* Period filter */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            className={`px-4 py-2 rounded-lg text-xs font-mono transition-all ${
              period === p.id ? "bg-[#1e3a5f] text-[#93c5fd] font-bold" : "border border-[#1e293b] text-[#64748b] hover:text-white"
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Podium for top 3 */}
      {ranked.length >= 3 && (
        <div className="grid grid-cols-3 gap-4">
          {[ranked[1], ranked[0], ranked[2]].map((m, idx) => {
            const place = [2, 1, 3][idx];
            const heights = ["h-24", "h-32", "h-20"];
            const medals = ["🥈", "🥇", "🥉"];
            return (
              <div key={m.name} className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold mb-2"
                  style={{ background: m.color + "22", color: m.color }}>
                  {m.builder || m.name[0]}
                </div>
                <span className="text-sm font-bold text-white">{m.name}</span>
                <span className="text-xs text-[#64748b] font-mono">{m.score} pts</span>
                <div className={`w-full ${heights[idx]} rounded-t-xl mt-2 flex items-end justify-center pb-2`}
                  style={{ background: m.color + "22" }}>
                  <span className="text-2xl">{medals[idx]}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full ranking */}
      <Card>
        <h3 className="text-sm font-bold text-white mb-4">Rankings</h3>
        <div className="space-y-3">
          {ranked.map((m, idx) => (
            <div key={m.name} className="flex items-center gap-4">
              {/* Rank */}
              <span className="w-6 text-center text-sm font-bold" style={{ color: idx < 3 ? "#f59e0b" : "#475569" }}>
                {idx + 1}
              </span>

              {/* Avatar */}
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: m.color + "22", color: m.color }}>
                {m.builder || m.name[0]}
              </div>

              {/* Name + role */}
              <div className="w-24">
                <span className="text-sm text-white font-medium">{m.name}</span>
                <span className="text-[9px] text-[#475569] font-mono block">{m.role}</span>
              </div>

              {/* Progress bar */}
              <div className="flex-1 h-2 bg-[#1e293b] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${maxScore > 0 ? (m.score / maxScore) * 100 : 0}%`, background: m.color }} />
              </div>

              {/* Score */}
              <span className="text-sm font-bold text-white w-12 text-right">{m.score}</span>
              <span className="text-[9px] text-[#475569] font-mono">pts</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Breakdown */}
      <Card>
        <h3 className="text-sm font-bold text-white mb-4">Score Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1e293b]">
                <th className="text-left py-2 text-[#64748b]">Member</th>
                <th className="text-right py-2 text-[#64748b]">Actions (2pt)</th>
                <th className="text-right py-2 text-[#64748b]">Votes (1pt)</th>
                <th className="text-right py-2 text-[#64748b]">Responses (3pt)</th>
                <th className="text-right py-2 text-[#64748b]">Accepted (5pt)</th>
                <th className="text-right py-2 text-[#f59e0b] font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((m) => (
                <tr key={m.name} className="border-b border-[#1e293b]/50">
                  <td className="py-2 text-white">{m.name}</td>
                  <td className="py-2 text-right text-[#94a3b8]">{m.actions}</td>
                  <td className="py-2 text-right text-[#94a3b8]">{m.votes_given}</td>
                  <td className="py-2 text-right text-[#94a3b8]">{m.responses}</td>
                  <td className="py-2 text-right text-[#94a3b8]">{m.accepted}</td>
                  <td className="py-2 text-right text-[#f59e0b] font-bold">{m.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-[#334155] mt-3 font-mono">
          Scoring: Create/update = 2pts | Vote = 1pt | Response = 3pts | Accepted answer = 5pts
        </p>
      </Card>
    </div>
  );
}
