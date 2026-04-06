"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { logActivity } from "@/lib/activity";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const PILLARS = [
  { value: "produit", label: "Produit", color: "#3b82f6" },
  { value: "tech", label: "Tech", color: "#10b981" },
  { value: "equipe", label: "Equipe", color: "#f59e0b" },
  { value: "finances", label: "Finances", color: "#ef4444" },
  { value: "legal", label: "Legal", color: "#8b5cf6" },
  { value: "croissance", label: "Croissance", color: "#ec4899" },
  { value: "operations", label: "Operations", color: "#06b6d4" },
];

const STATUS_COLORS = {
  draft: "bg-gray-500/20 text-gray-300",
  proposed: "bg-blue-500/20 text-blue-300",
  approved: "bg-green-500/20 text-green-300",
  active: "bg-amber-500/20 text-amber-300",
  completed: "bg-emerald-500/20 text-emerald-300",
  dropped: "bg-red-500/20 text-red-300",
};

const EXAMPLE_OBJECTIVES = [
  "Lancer le MVP du cockpit avec les 8 piliers fonctionnels",
  "Atteindre 10 utilisateurs actifs sur la plateforme",
  "Deployer le systeme de validation par consensus",
  "Completer la documentation de tous les processus cles",
  "Mettre en place le pipeline CI/CD complet",
  "Securiser toutes les API keys et acces",
  "Implementer le dashboard analytique temps reel",
  "Recruter et onboarder 3 nouveaux builders",
  "Atteindre un QA score Athena > 80%",
  "Livrer le bot Telegram avec toutes les commandes",
];

const REQUIRED_APPROVALS = 2;

export default function ObjectivesPage() {
  const { user } = useAuth();
  const [objectives, setObjectives] = useState([]);
  const [validations, setValidations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    number: "",
    title: "",
    description: "",
    success_criteria: "",
    pillar: "",
  });

  const fetchData = useCallback(async () => {
    const [objRes, valRes] = await Promise.all([
      supabase
        .from("cockpit_objectives")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("number", { ascending: true }),
      supabase.from("cockpit_objective_validations").select("*"),
    ]);
    if (objRes.data) setObjectives(objRes.data);
    if (valRes.data) setValidations(valRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();

    const objChannel = supabase
      .channel("objectives-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cockpit_objectives" },
        () => fetchData()
      )
      .subscribe();

    const valChannel = supabase
      .channel("validations-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cockpit_objective_validations" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(objChannel);
      supabase.removeChannel(valChannel);
    };
  }, [fetchData]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.number) return;
    setSubmitting(true);

    const { error } = await supabase.from("cockpit_objectives").insert({
      number: parseInt(form.number),
      title: form.title.trim(),
      description: form.description.trim(),
      success_criteria: form.success_criteria.trim(),
      pillar: form.pillar || null,
      status: "proposed",
      proposed_by: user?.email || "anonymous",
      sort_order: parseInt(form.number),
    });

    if (!error) {
      logActivity(
        "objective_created",
        `Objectif #${form.number} cree: ${form.title}`
      );
      setForm({ number: "", title: "", description: "", success_criteria: "", pillar: "" });
      setShowForm(false);
    }
    setSubmitting(false);
  };

  const handleValidate = async (objectiveId, decision) => {
    const validatorName = user?.email || "anonymous";
    const validatorRole = "member";

    const { error } = await supabase
      .from("cockpit_objective_validations")
      .insert({
        objective_id: objectiveId,
        validator_name: validatorName,
        validator_role: validatorRole,
        decision,
        comment: "",
      });

    if (error) return;

    logActivity(
      "objective_validated",
      `Objectif #${objectiveId} ${decision} par ${validatorName}`
    );

    // Check if we now have enough approvals to auto-approve
    if (decision === "approve") {
      const currentApprovals = validations.filter(
        (v) => v.objective_id === objectiveId && v.decision === "approve"
      );
      // +1 for the one we just inserted
      if (currentApprovals.length + 1 >= REQUIRED_APPROVALS) {
        await supabase
          .from("cockpit_objectives")
          .update({ status: "approved" })
          .eq("id", objectiveId);

        logActivity(
          "objective_approved",
          `Objectif #${objectiveId} approuve avec ${REQUIRED_APPROVALS} validations`
        );
      }
    }
  };

  const getValidationsForObjective = (objId) =>
    validations.filter((v) => v.objective_id === objId);

  const getApprovalCount = (objId) =>
    validations.filter((v) => v.objective_id === objId && v.decision === "approve").length;

  const getPillarInfo = (pillarValue) =>
    PILLARS.find((p) => p.value === pillarValue) || null;

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader title="Les 10 Objectifs" />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Les 10 Objectifs"
        subtitle="Chaque objectif necessite 2 validations pour etre approuve"
      />

      {/* Add button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: "#f59e0b", color: "#000" }}
        >
          {showForm ? "Annuler" : "+ Nouvel objectif"}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <Card>
          <form onSubmit={handleCreate} className="space-y-4">
            <h3 className="text-lg font-semibold text-white">
              Proposer un objectif
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Numero
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                  placeholder="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Pilier
                </label>
                <select
                  value={form.pillar}
                  onChange={(e) => setForm({ ...form, pillar: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Choisir un pilier --</option>
                  {PILLARS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Titre</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                placeholder="Titre de l'objectif"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 min-h-[80px]"
                placeholder="Description detaillee..."
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Criteres de succes
              </label>
              <textarea
                value={form.success_criteria}
                onChange={(e) =>
                  setForm({ ...form, success_criteria: e.target.value })
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 min-h-[80px]"
                placeholder="Comment mesurer le succes..."
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: "#f59e0b", color: "#000" }}
              >
                {submitting ? "Envoi..." : "Proposer"}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Objectives list */}
      {objectives.length === 0 ? (
        <Card>
          <div className="text-center py-10 space-y-4">
            <div className="text-5xl">🎯</div>
            <h3 className="text-xl font-semibold text-white">
              Aucun objectif defini
            </h3>
            <p className="text-zinc-400 max-w-md mx-auto">
              Commencez par proposer vos 10 objectifs strategiques. Voici des
              exemples pour vous inspirer :
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto mt-4">
              {EXAMPLE_OBJECTIVES.map((ex, i) => (
                <div
                  key={i}
                  className="text-left text-sm text-zinc-300 bg-zinc-800/50 rounded-lg px-3 py-2"
                >
                  <span className="text-amber-500 font-mono font-bold mr-2">
                    #{i + 1}
                  </span>
                  {ex}
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {objectives.map((obj) => {
            const objValidations = getValidationsForObjective(obj.id);
            const approvalCount = getApprovalCount(obj.id);
            const rejectCount = objValidations.filter(
              (v) => v.decision === "reject"
            ).length;
            const pillar = getPillarInfo(obj.pillar);

            return (
              <Card key={obj.id}>
                <div className="space-y-4">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <span
                        className="text-2xl font-bold font-mono shrink-0"
                        style={{ color: "#f59e0b" }}
                      >
                        #{obj.number}
                      </span>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">
                          {obj.title}
                        </h3>
                        {obj.description && (
                          <p className="text-sm text-zinc-400 mt-1">
                            {obj.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {pillar && (
                        <span className="flex items-center gap-1.5 text-xs text-zinc-300 bg-zinc-800 rounded-full px-2.5 py-1">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: pillar.color }}
                          />
                          {pillar.label}
                        </span>
                      )}
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          STATUS_COLORS[obj.status] || STATUS_COLORS.draft
                        }`}
                      >
                        {obj.status}
                      </span>
                    </div>
                  </div>

                  {/* Success criteria */}
                  {obj.success_criteria && (
                    <div className="bg-zinc-800/50 rounded-lg p-3">
                      <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
                        Criteres de succes
                      </p>
                      <p className="text-sm text-zinc-300">
                        {obj.success_criteria}
                      </p>
                    </div>
                  )}

                  {/* Validation section */}
                  <div className="border-t border-zinc-800 pt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-zinc-400">
                          Validations :{" "}
                          <span
                            className={`font-bold ${
                              approvalCount >= REQUIRED_APPROVALS
                                ? "text-green-400"
                                : "text-amber-400"
                            }`}
                          >
                            {approvalCount}/{REQUIRED_APPROVALS} approuve
                            {approvalCount > 1 ? "s" : ""}
                          </span>
                          {rejectCount > 0 && (
                            <span className="text-red-400 ml-2">
                              ({rejectCount} rejet{rejectCount > 1 ? "s" : ""})
                            </span>
                          )}
                        </span>
                      </div>

                      {obj.status !== "approved" &&
                        obj.status !== "completed" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleValidate(obj.id, "approve")}
                              className="px-3 py-1.5 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded-lg text-xs font-medium transition-colors"
                            >
                              Approuver
                            </button>
                            <button
                              onClick={() => handleValidate(obj.id, "reject")}
                              className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-xs font-medium transition-colors"
                            >
                              Rejeter
                            </button>
                          </div>
                        )}
                    </div>

                    {/* Validation details */}
                    {objValidations.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {objValidations.map((v, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-xs text-zinc-500"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                v.decision === "approve"
                                  ? "bg-green-400"
                                  : v.decision === "reject"
                                  ? "bg-red-400"
                                  : "bg-zinc-400"
                              }`}
                            />
                            <span className="text-zinc-300">
                              {v.validator_name}
                            </span>
                            <span>({v.validator_role})</span>
                            <span>—</span>
                            <span
                              className={
                                v.decision === "approve"
                                  ? "text-green-400"
                                  : v.decision === "reject"
                                  ? "text-red-400"
                                  : "text-zinc-400"
                              }
                            >
                              {v.decision}
                            </span>
                            {v.comment && (
                              <span className="text-zinc-500 italic">
                                &quot;{v.comment}&quot;
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Stats footer */}
      {objectives.length > 0 && (
        <div className="flex items-center justify-center gap-6 text-sm text-zinc-500 pt-4">
          <span>
            {objectives.length} objectif{objectives.length > 1 ? "s" : ""}
          </span>
          <span>
            {objectives.filter((o) => o.status === "approved").length} approuve
            {objectives.filter((o) => o.status === "approved").length > 1
              ? "s"
              : ""}
          </span>
          <span>
            {objectives.filter((o) => o.status === "completed").length} termine
            {objectives.filter((o) => o.status === "completed").length > 1
              ? "s"
              : ""}
          </span>
        </div>
      )}
    </div>
  );
}
