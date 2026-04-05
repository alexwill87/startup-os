"use client";

export default function PageHeader({ title, subtitle, color, children }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-xl font-extrabold text-white">{title}</h1>
          {subtitle && <p className="text-[13px] text-[#64748b] mt-1">{subtitle}</p>}
        </div>
        {children}
      </div>
      {color && <div className="h-[2px] mt-3 rounded-full" style={{ background: `${color}33` }} />}
    </div>
  );
}
