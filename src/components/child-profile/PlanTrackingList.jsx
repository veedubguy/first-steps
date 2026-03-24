import React from 'react';
import { Card } from '@/components/ui/card';
import StatusBadge from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { FileText } from 'lucide-react';

export default function PlanTrackingList({ plans }) {
  if (!plans || plans.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No plan records yet</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden divide-y">
      {plans.map(plan => (
        <div key={plan.id} className="p-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <StatusBadge type={plan.plan_type} />
              <StatusBadge type={plan.plan_status} />
              {plan.parent_signed === 'Yes' && <StatusBadge type="signed" />}
            </div>
            <div className="text-xs text-muted-foreground space-x-3">
              {plan.sent_date && <span>Sent: {format(new Date(plan.sent_date), 'dd MMM')}</span>}
              {plan.signed_date && <span>Signed: {format(new Date(plan.signed_date), 'dd MMM')}</span>}
              {plan.next_review_date && <span>Review: {format(new Date(plan.next_review_date), 'dd MMM yyyy')}</span>}
            </div>
          </div>
          {plan.notes && <p className="text-sm text-muted-foreground mt-2">{plan.notes}</p>}
        </div>
      ))}
    </Card>
  );
}