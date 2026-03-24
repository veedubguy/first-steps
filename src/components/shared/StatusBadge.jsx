import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const variants = {
  anaphylaxis: { label: '🔴 Anaphylaxis', className: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: '🔴 High Risk', className: 'bg-red-100 text-red-700 border-red-200' },
  moderate: { label: '🟠 Moderate', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium: { label: '🟠 Medium Risk', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  low: { label: '🟢 Low', className: 'bg-green-100 text-green-700 border-green-200' },
  review_due: { label: '🟠 Review Due', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  awaiting_response: { label: '🟡 Awaiting Response', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  signed: { label: '🟢 Signed', className: 'bg-green-100 text-green-700 border-green-200' },
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  sent: { label: 'Sent', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  overdue: { label: '🔴 Overdue', className: 'bg-red-100 text-red-700 border-red-200' },
  active: { label: 'Active', className: 'bg-green-100 text-green-700 border-green-200' },
  closed: { label: 'Closed', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  allergy: { label: 'Allergy', className: 'bg-red-50 text-red-600 border-red-200' },
  dietary: { label: 'Dietary', className: 'bg-purple-50 text-purple-600 border-purple-200' },
};

export default function StatusBadge({ type, label: customLabel }) {
  const key = type?.toLowerCase().replace(/\s+/g, '_');
  const variant = variants[key];
  
  if (!variant) {
    return <Badge variant="outline" className="text-xs">{customLabel || type}</Badge>;
  }

  return (
    <Badge variant="outline" className={cn("text-xs font-medium border", variant.className)}>
      {customLabel || variant.label}
    </Badge>
  );
}