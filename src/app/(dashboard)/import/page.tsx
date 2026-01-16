"use client";

import { Header } from "@/components/layout/header";
import { ApolloImport } from "@/components/import/apollo-import";

export default function ImportPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Import Contacts" />
      <div 
        className="flex-1 p-6 overflow-auto opacity-0 animate-fade-in"
        style={{ animationDelay: "0ms", animationFillMode: "forwards" }}
      >
        <ApolloImport />
      </div>
    </div>
  );
}
