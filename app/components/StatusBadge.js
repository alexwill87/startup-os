"use client";

const STYLES = {
  done: "bg-emerald-500/10 text-emerald-400",
  live: "bg-emerald-500/10 text-emerald-400",
  "in_progress": "bg-blue-500/10 text-blue-400",
  wip: "bg-blue-500/10 text-blue-400",
  todo: "bg-slate-500/10 text-slate-400",
  planned: "bg-slate-500/10 text-slate-400",
  blocked: "bg-red-500/10 text-red-400",
  open: "bg-blue-500/10 text-blue-400",
  decided: "bg-emerald-500/10 text-emerald-400",
};

export default function StatusBadge({ status }) {
  const style = STYLES[status] || STYLES.todo;
  return (
    <span className={`inline-block text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${style}`}>
      {status}
    </span>
  );
}
