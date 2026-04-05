"use client";

export default function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`bg-[#0d1117] border border-[#1e293b] rounded-xl p-5 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
