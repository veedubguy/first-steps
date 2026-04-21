import React from 'react';
import { Card } from '@/components/ui/card';
import StatusBadge from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { Shield } from 'lucide-react';

export default function RiskPlansList({ plans, child }) {
  if (!plans || plans.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No risk plans yet</p>
      </Card>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <Card className="overflow-hidden divide-y">
      {plans.map(plan => {
        const isOverdue = plan.review_date && plan.review_date < today && plan.status !== 'Closed';
        return (
          <div key={plan.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge type={plan.risk_level} />
                <StatusBadge type={plan.status} />
                {isOverdue && <StatusBadge type="review_due" />}
              </div>
              {plan.review_date && (
                <p className="text-xs text-muted-foreground shrink-0">
                  Review: {format(new Date(plan.review_date), 'dd MMM yyyy')}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Trigger</p>
                <p className="text-sm">{plan.trigger}</p>
              </div>
              {plan.exposure_risk && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Exposure Risk</p>
                  <p className="text-sm">{plan.exposure_risk}</p>
                </div>
              )}
              {plan.reaction && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Reaction</p>
                  <p className="text-sm">{plan.reaction}</p>
                </div>
              )}
              {plan.control_measures && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Control Measures</p>
                  <p className="text-sm">{plan.control_measures}</p>
                </div>
              )}
              {/* Asthma medications — show individual cards from child record */}
              {child?.condition_type === 'Asthma' && child?.asthma_medications && child.asthma_medications.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Medications</p>
                  <div className="space-y-2">
                    {child.asthma_medications.map((med, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2 bg-muted/30">
                        <span className="text-sm font-medium flex-1">{med.name}</span>
                        <div className="flex gap-2 shrink-0">
                          {med.at_service && (
                            <span className="text-xs bg-blue-100 text-blue-700 border border-blue-200 rounded px-2 py-0.5 font-medium">✓ At Service</span>
                          )}
                          {med.at_home && (
                            <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded px-2 py-0.5 font-medium">✓ At Home</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {plan.medication_location && (
                    <p className="text-xs text-muted-foreground mt-2">Stored at: {plan.medication_location}</p>
                  )}
                </div>
              ) : plan.medication_required ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Medication</p>
                  <p className="text-sm">{plan.medication_required} {plan.medication_location ? `(${plan.medication_location})` : ''}</p>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </Card>
  );
}