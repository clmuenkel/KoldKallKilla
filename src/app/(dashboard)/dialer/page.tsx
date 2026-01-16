"use client";

import { Header } from "@/components/layout/header";
import { PowerDialer } from "@/components/dialer/power-dialer";

export default function DialerPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Power Dialer" showSearch={false} />
      <div 
        className="flex-1 overflow-hidden opacity-0 animate-fade-in"
        style={{ animationDelay: "0ms", animationFillMode: "forwards" }}
      >
        <PowerDialer />
      </div>
    </div>
  );
}
