import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PezCRM - Cold Calling CRM",
  description: "Personal CRM for cold calling credit unions, hospitals, and small banks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* #region agent log */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  var endpoint = "http://127.0.0.1:7242/ingest/73fcbc11-1ac2-44b8-a6d3-3c6d8d6ac42d";
  function send(err, tag) {
    var msg = err && (err.message || String(err));
    var payload = {
      location: "app/layout.tsx:global-handler",
      message: msg || "unknown",
      hypothesisId: tag || "ChunkLoad",
      data: {
        name: err && err.name,
        message: msg,
        origin: typeof location !== "undefined" ? location.origin : "",
        href: typeof location !== "undefined" ? location.href : "",
        stack: err && err.stack,
        failedUrl: (msg && msg.match(/https?:\\/[^\\s)]+/)) ? msg.match(/https?:\\/[^\\s)]+/)[0] : null
      },
      timestamp: Date.now()
    };
    try { fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(function(){}); } catch (e) {}
  }
  window.onerror = function(msg, source, line, col, err) {
    send(err || { message: msg, name: "Error" }, (msg && msg.indexOf("ChunkLoad") !== -1) ? "A" : (msg && msg.indexOf("timeout") !== -1) ? "C" : "ChunkLoad");
  };
  window.addEventListener("unhandledrejection", function(e) {
    if (e.reason && (e.reason.message || "").indexOf("chunk") !== -1) send(e.reason, (e.reason.message || "").indexOf("timeout") !== -1 ? "C" : "A");
  });
})();
`,
          }}
        />
        {/* #endregion */}
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
