"use client";

import { Header } from "@/components/layout/header";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";

export default function PipelinePage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Pipeline" />
      <div 
        className="flex-1 overflow-hidden opacity-0 animate-fade-in"
        style={{ animationDelay: "0ms", animationFillMode: "forwards" }}
      >
        <PipelineBoard />
      </div>
    </div>
  );
}
