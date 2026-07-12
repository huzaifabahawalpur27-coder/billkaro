"use client";

import { useEffect } from "react";

export function PrintLayoutTrigger() {
  useEffect(() => {
    // Add print-view body class to hide sidebar and layout wrapper elements on screen
    document.body.classList.add("print-page-layout");
    
    // Auto-trigger print
    const timer = setTimeout(() => {
      window.print();
    }, 500);

    return () => {
      document.body.classList.remove("print-page-layout");
      clearTimeout(timer);
    };
  }, []);

  return (
    <style jsx global>{`
      /* Hide regular screen layout on print page */
      @media screen {
        body.print-page-layout aside,
        body.print-page-layout header,
        body.print-page-layout nav {
          display: none !important;
        }
        body.print-page-layout main {
          margin: 0 !important;
          padding: 0 !important;
          background: #f1f5f9 !important;
        }
      }
    `}</style>
  );
}
