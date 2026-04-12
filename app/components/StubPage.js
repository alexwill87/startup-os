"use client";

import Card from "./Card";
import PageHeader from "./PageHeader";

export default function StubPage({ title, subtitle, description, color = "#64748b" }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} color={color} />
      <Card>
        <div className="py-12 text-center">
          <p className="text-sm text-[#64748b]">{description || "This page is coming soon."}</p>
          <p className="text-[10px] text-[#475569] font-mono mt-2">Under construction</p>
        </div>
      </Card>
    </div>
  );
}
