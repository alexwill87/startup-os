"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { logActivity } from "@/lib/activity";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const ATHENA_COLOR = "#a855f7";

const CRITERIA = [
  {
    key: "utility",
    name: "Utilite",
    description: "Chaque pilier a-t-il du contenu reel ? (checklist done/validated vs total)",
  },
  {
    key: "completeness",
    name: "Completude",
    description: "Les profils membres sont-ils remplis ? (bio, phone, linkedin, skills)",
  },
  {
    key: "fluidity",
    name: "Fluidite",
    description: "Supabase repond-il correctement ?",
  },
  {
    key: "persistence",
    name: "Persistance",
    description: "Des donnees sont-elles enregistrees ? (activite > 0)",
  },
  {
    key: "security",
    name: "Securite",
    description: "Au moins 1 admin existe, aucune cle API exposee",
  },
  {
    key: "consensus",
    name: "Consensus",
    description: "Les objectifs sont-ils valides ? (approved vs total)",
  },
  {
    key: "documentation",
    name: "Documentation",
    description: "Les documents requis existent-ils ? (checklist category=document)",
  },
  {
    key: "team",
    name: "Equipe",
    description: "Equipe complete ? Tous les membres actifs ont un builder assigne",
  },
];

function scoreColor(score) {
  if (score > 70) return "text-green-400";
  if (score > 40) return "text-yellow-400";
  return "text-red-400";
}

function scoreBg(score) {
  if (score > 70) return "bg-green-500/10 border-green-500/20";
  if (score > 40) return "bg-yellow-500/10 border-yellow-500/20";
  return "bg-red-500/10 border-red-500/20";
}

function scoreLabel(score) {
  if (score > 70) return "Bon";
  if (score > 40) return "Attention";
  return "Critique";
}

export default function AthenaPage() {
  const { user } = useAuth();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastAudit, setLastAudit] = useState(null);

  const runAudit = useCallback(async () => {
    setLoading(true);
    const auditResults = {};

    // 1. UTILITY — checklist done/validated vs total per pillar
    try {
      const { data: checklist } = await supabase
        .from("cockpit_checklist")
        .select("pillar, status");

      if (checklist && checklist.length > 0) {
        const total = checklist.length;
        const done = checklist.filter(
          (c) => c.status === "done" || c.status === "validated"
        ).length;
        auditResults.utility = {
          score: Math.round((done / total) * 100),
          detail: `${done}/${total} items done/validated`,
        };
      } else {
        auditResults.utility = { score: 0, detail: "Aucun item dans la checklist" };
      }
    } catch {
      auditResults.utility = { score: 0, detail: "Erreur de requete" };
    }

    // 2. COMPLETENESS — member profiles filled
    try {
      const { data: members } = await supabase
        .from("cockpit_members")
        .select("bio, phone, linkedin, skills")
        .eq("status", "active");

      if (members && members.length > 0) {
        const fields = ["bio", "phone", "linkedin", "skills"];
        let filled = 0;
        const totalFields = members.length * fields.length;
        members.forEach((m) => {
          fields.forEach((f) => {
            if (m[f] && String(m[f]).trim().length > 0) filled++;
          });
        });
        auditResults.completeness = {
          score: Math.round((filled / totalFields) * 100),
          detail: `${filled}/${totalFields} champs remplis sur ${members.length} membre(s)`,
        };
      } else {
        auditResults.completeness = { score: 0, detail: "Aucun membre actif" };
      }
    } catch {
      auditResults.completeness = { score: 0, detail: "Erreur de requete" };
    }

    // 3. FLUIDITY — simple query
    try {
      const start = Date.now();
      const { error } = await supabase
        .from("cockpit_members")
        .select("id")
        .limit(1);
      const elapsed = Date.now() - start;
      auditResults.fluidity = {
        score: error ? 0 : 100,
        detail: error ? "Supabase ne repond pas" : `Supabase OK (${elapsed}ms)`,
      };
    } catch {
      auditResults.fluidity = { score: 0, detail: "Supabase injoignable" };
    }

    // 4. PERSISTENCE — activity log
    try {
      const { data: activity, count } = await supabase
        .from("cockpit_activity")
        .select("id", { count: "exact", head: true });
      const total = count || 0;
      auditResults.persistence = {
        score: total > 0 ? 100 : 0,
        detail: total > 0 ? `${total} entrees dans le log` : "Aucune activite enregistree",
      };
    } catch {
      auditResults.persistence = { score: 0, detail: "Erreur de requete" };
    }

    // 5. SECURITY — admin exists + api keys masked
    try {
      const { data: admins } = await supabase
        .from("cockpit_members")
        .select("id, role")
        .in("role", ["admin", "cofounder", "cofondateur"]);

      const { data: apiKeys } = await supabase
        .from("cockpit_api_keys")
        .select("key_masked");

      const hasAdmin = admins && admins.length > 0;
      const allMasked =
        !apiKeys ||
        apiKeys.length === 0 ||
        apiKeys.every((k) => k.key_masked && k.key_masked.length > 0);

      let secScore = 0;
      const details = [];
      if (hasAdmin) {
        secScore += 50;
        details.push(`${admins.length} admin(s) trouve(s)`);
      } else {
        details.push("Aucun admin/cofondateur");
      }
      if (allMasked) {
        secScore += 50;
        details.push("Cles API masquees OK");
      } else {
        details.push("Cles API non masquees detectees");
      }

      auditResults.security = { score: secScore, detail: details.join(" | ") };
    } catch {
      auditResults.security = { score: 0, detail: "Erreur de requete" };
    }

    // 6. CONSENSUS — objectives approved vs total
    try {
      const { data: objectives } = await supabase
        .from("cockpit_objectives")
        .select("status");

      if (objectives && objectives.length > 0) {
        const approved = objectives.filter((o) => o.status === "approved" || o.status === "completed").length;
        auditResults.consensus = {
          score: Math.round((approved / objectives.length) * 100),
          detail: `${approved}/${objectives.length} objectifs approuves`,
        };
      } else {
        auditResults.consensus = { score: 0, detail: "Aucun objectif defini" };
      }
    } catch {
      auditResults.consensus = { score: 0, detail: "Erreur de requete" };
    }

    // 7. DOCUMENTATION — checklist category=document
    try {
      const { data: docs } = await supabase
        .from("cockpit_checklist")
        .select("status")
        .eq("category", "document");

      if (docs && docs.length > 0) {
        const done = docs.filter(
          (d) => d.status === "done" || d.status === "validated"
        ).length;
        auditResults.documentation = {
          score: Math.round((done / docs.length) * 100),
          detail: `${done}/${docs.length} documents completes`,
        };
      } else {
        auditResults.documentation = { score: 0, detail: "Aucun document dans la checklist" };
      }
    } catch {
      auditResults.documentation = { score: 0, detail: "Erreur de requete" };
    }

    // 8. TEAM — active members with builder
    try {
      const { data: members } = await supabase
        .from("cockpit_members")
        .select("builder, status")
        .eq("status", "active");

      if (members && members.length > 0) {
        const withBuilder = members.filter(
          (m) => m.builder && String(m.builder).trim().length > 0
        ).length;
        auditResults.team = {
          score: Math.round((withBuilder / members.length) * 100),
          detail: `${withBuilder}/${members.length} membres avec builder assigne`,
        };
      } else {
        auditResults.team = { score: 0, detail: "Aucun membre actif" };
      }
    } catch {
      auditResults.team = { score: 0, detail: "Erreur de requete" };
    }

    setResults(auditResults);
    setLastAudit(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    runAudit();
  }, [runAudit]);

  const overallScore =
    results
      ? Math.round(
          CRITERIA.reduce((sum, c) => sum + (results[c.key]?.score || 0), 0) /
            CRITERIA.length
        )
      : 0;

  const goodItems = results
    ? CRITERIA.filter((c) => (results[c.key]?.score || 0) > 70)
    : [];
  const warnItems = results
    ? CRITERIA.filter((c) => {
        const s = results[c.key]?.score || 0;
        return s > 40 && s <= 70;
      })
    : [];
  const criticalItems = results
    ? CRITERIA.filter((c) => (results[c.key]?.score || 0) <= 40)
    : [];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Athena - Agent QA"
        subtitle="Audit qualite complet du cockpit"
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div
            className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2"
            style={{ borderColor: ATHENA_COLOR }}
          />
          <p className="text-zinc-400 text-sm">Audit en cours...</p>
        </div>
      ) : (
        <>
          {/* Overall Score */}
          <Card>
            <div className="flex flex-col items-center py-6 gap-3">
              <p className="text-sm text-zinc-400 uppercase tracking-wider">
                Score QA Global
              </p>
              <div
                className={`text-6xl font-bold ${scoreColor(overallScore)}`}
              >
                {overallScore}%
              </div>
              <div
                className={`text-sm font-medium px-3 py-1 rounded-full border ${scoreBg(overallScore)} ${scoreColor(overallScore)}`}
              >
                {scoreLabel(overallScore)}
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Moyenne de {CRITERIA.length} criteres d&apos;audit
              </p>
            </div>
          </Card>

          {/* Criteria cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CRITERIA.map((criterion) => {
              const result = results?.[criterion.key] || {
                score: 0,
                detail: "N/A",
              };
              return (
                <Card key={criterion.key}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
                        {criterion.name}
                      </h3>
                      <span
                        className={`text-2xl font-bold ${scoreColor(result.score)}`}
                      >
                        {result.score}%
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {criterion.description}
                    </p>
                    {/* Progress bar */}
                    <div className="w-full bg-zinc-800 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${result.score}%`,
                          backgroundColor:
                            result.score > 70
                              ? "#22c55e"
                              : result.score > 40
                              ? "#eab308"
                              : "#ef4444",
                        }}
                      />
                    </div>
                    <p className="text-xs text-zinc-400">{result.detail}</p>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* QA Report */}
          <Card>
            <div className="space-y-4">
              <h3
                className="text-lg font-semibold"
                style={{ color: ATHENA_COLOR }}
              >
                Rapport QA
              </h3>

              {goodItems.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-green-400">
                    Ce qui fonctionne bien
                  </p>
                  {goodItems.map((item) => (
                    <div key={item.key} className="flex items-center gap-2 text-sm text-zinc-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                      <span className="font-medium">{item.name}</span>
                      <span className="text-zinc-500">
                        — {results[item.key]?.detail}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {warnItems.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-yellow-400">
                    Necessite attention
                  </p>
                  {warnItems.map((item) => (
                    <div key={item.key} className="flex items-center gap-2 text-sm text-zinc-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
                      <span className="font-medium">{item.name}</span>
                      <span className="text-zinc-500">
                        — {results[item.key]?.detail}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {criticalItems.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-red-400">
                    Points critiques
                  </p>
                  {criticalItems.map((item) => (
                    <div key={item.key} className="flex items-center gap-2 text-sm text-zinc-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      <span className="font-medium">{item.name}</span>
                      <span className="text-zinc-500">
                        — {results[item.key]?.detail}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {goodItems.length === CRITERIA.length && (
                <p className="text-sm text-green-400 italic">
                  Tous les criteres sont au vert. Excellent travail !
                </p>
              )}
            </div>
          </Card>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-zinc-500">
              Dernier audit :{" "}
              {lastAudit
                ? lastAudit.toLocaleString("fr-FR", {
                    dateStyle: "medium",
                    timeStyle: "medium",
                  })
                : "—"}
            </p>
            <button
              onClick={runAudit}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
              style={{ backgroundColor: ATHENA_COLOR, color: "#fff" }}
            >
              Re-lancer l&apos;audit
            </button>
          </div>
        </>
      )}
    </div>
  );
}
