"use client";

export default function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`bg-[#0d1117] border border-[#1e293b] rounded-xl p-6 transition-all duration-200 hover:border-[#334155] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
