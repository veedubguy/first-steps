import React from 'react';
import { format } from 'date-fns';
import { CheckCircle2, Circle, UserCheck } from 'lucide-react';

const CHECKS = [
  { key: 'check_medical_policy',     short: 'Medical policy' },
  { key: 'check_condition_aware',    short: 'Condition aware' },
  { key: 'check_med_plan_location',  short: 'Med plan location' },
  { key: 'check_risk_plan_location', short: 'Risk plan location' },
  { key: 'check_medication_use',     short: 'Medication use' },
];

export default function StaffSignoffsList({ signoffs = [] }) {
  if (signoffs.length === 0) {
    return (
      <div className="border rounded-xl p-4 text-center text-sm text-muted-foreground">
        <UserCheck className="w-6 h-6 mx-auto mb-1 opacity-40" />
        No staff have signed off yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {signoffs.map(s => (
        <div key={s.id} className="border rounded-xl p-3 flex items-start gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{s.staff_name}</span>
              {s.staff_role && <span className="text-xs text-muted-foreground">· {s.staff_role}</span>}
              {s.signed_date && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {format(new Date(s.signed_date), 'dd/MM/yyyy')}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {CHECKS.map(({ key, short }) => (
                <span key={key} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                  s[key] ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'
                }`}>
                  {s[key]
                    ? <CheckCircle2 className="w-3 h-3" />
                    : <Circle className="w-3 h-3" />}
                  {short}
                </span>
              ))}
            </div>
          </div>
          {s.signature_url && (
            <img src={s.signature_url} alt="sig" className="h-10 w-24 object-contain object-right border rounded" />
          )}
        </div>
      ))}
    </div>
  );
}