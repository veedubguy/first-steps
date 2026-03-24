// Injects A4 print CSS into the document head
import { useEffect } from 'react';

export default function PrintStyles() {
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'a4-print-styles';
    style.innerHTML = `
      @page {
        size: A4 portrait;
        margin: 12mm 14mm 12mm 14mm;
      }
      @media print {
        html, body {
          width: 210mm;
          background: white !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .no-print { display: none !important; }
        .print-page {
          width: 100%;
          page-break-after: always;
          page-break-inside: avoid;
        }
        .print-page:last-child { page-break-after: auto; }
        table { border-collapse: collapse; }
        th, td { border: 1px solid #6b7280 !important; }
      }
    `;
    document.head.appendChild(style);
    return () => { const el = document.getElementById('a4-print-styles'); if (el) el.remove(); };
  }, []);
  return null;
}