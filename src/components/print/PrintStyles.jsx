// Injects A4 print CSS into the document head
import { useEffect } from 'react';

export default function PrintStyles() {
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'a4-print-styles';
    style.innerHTML = `
      @page {
        size: A4 landscape;
        margin: 10mm 12mm 10mm 12mm;
      }
      @media print {
        html, body {
          width: 210mm;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        /* Hide everything on the page by default */
        body > * { display: none !important; }
        /* Only show the root app div */
        body > #root { display: block !important; }
        /* Hide everything inside root except the print container */
        #root > * { display: none !important; }
        /* Show the router/app wrapper chain down to print content */
        #root > div { display: block !important; }
        /* Hide sidebar, nav, layout chrome */
        aside, nav, header, footer,
        [class*="sidebar"], [class*="Sidebar"],
        [class*="layout"], [class*="Layout"],
        [class*="AppLayout"], [class*="nav"] { display: none !important; }
        /* Show only print pages */
        .no-print { display: none !important; }
        .print-page {
          display: block !important;
          width: 100% !important;
          box-sizing: border-box !important;
          border: none !important;
          border-radius: 0 !important;
          margin: 0 !important;
          padding: 20px 24px !important;
          break-after: page;
          page-break-after: always;
        }
        .print-page:last-child {
          break-after: auto;
          page-break-after: auto;
        }
        table { border-collapse: collapse !important; }
        th, td { border: 1px solid #6b7280 !important; }
      }
    `;
    document.head.appendChild(style);
    return () => { const el = document.getElementById('a4-print-styles'); if (el) el.remove(); };
  }, []);
  return null;
}