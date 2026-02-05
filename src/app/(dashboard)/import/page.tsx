"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { PageHeader } from "@/components/layout/page-header";
import { ApolloImport } from "@/components/import/apollo-import";
import { CSVImport } from "@/components/import/csv-import";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileSpreadsheet } from "lucide-react";

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState("csv");

  return (
    <div className="flex flex-col h-full">
      <Header title="Import Contacts" />
      
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <PageHeader
          title="Import Leads"
          description="Upload contacts from CSV files or search Apollo for new leads"
        />

        <div 
          className="opacity-0 animate-fade-in"
          style={{ animationDelay: "50ms", animationFillMode: "forwards" }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
              <TabsTrigger value="csv" className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                CSV Upload
              </TabsTrigger>
              <TabsTrigger value="apollo" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Apollo Search
              </TabsTrigger>
            </TabsList>
            <TabsContent value="csv">
              <CSVImport />
            </TabsContent>
            <TabsContent value="apollo">
              <ApolloImport />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
