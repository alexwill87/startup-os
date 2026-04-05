"use client";

export default function PageHeader({ title, subtitle, color, children }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-[#64748b] mt-1.5">{subtitle}</p>}
        </div>
        {children}
      </div>
      {color && <div className="h-[3px] mt-4 rounded-full" style={{ background: `linear-gradient(to right, ${color}, ${color}33)` }} />}
    </div>
  );
}
