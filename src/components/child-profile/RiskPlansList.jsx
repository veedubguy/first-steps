import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { Shield, Trash2 } from 'lucide-react';

export default function RiskPlansList({ plans, child, onDelete, isDeleting }) {
  const childId = child?.id;

  const { data: allMedications = [] } = useQuery({
    queryKey: ['medications', childId],
    queryFn: () => base44.entities.Medication.filter({ child_id: childId }),
    enabled: !!childId,
  });

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
        const planMedications = allMedications.filter(m => m.risk_plan_id === plan.id);

        return (
          <div key={plan.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge type={plan.risk_level} />
                <StatusBadge type={plan.status} />
                {isOverdue && <StatusBadge type="review_due" />}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {plan.review_date && (
                  <p className="text-xs text-muted-foreground">
                    Review: {format(new Date(plan.review_date), 'dd MMM yyyy')}
                  </p>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(plan.id)}
                    disabled={isDeleting}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
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

              {/* Medications from Medication entity */}
              {planMedications.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Medications</p>
                  <div className="space-y-2">
                    {planMedications.map((med) => (
                      <div key={med.id} className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2 bg-muted/30">
                        <span className="text-sm font-medium flex-1">{med.name}</span>
                        <div className="flex gap-2 shrink-0">
                          {med.parent_confirmed ? (
                            <>
                              {med.at_service && (
                                <span className="text-xs bg-blue-100 text-blue-700 border border-blue-200 rounded px-2 py-0.5 font-medium">✓ At Service</span>
                              )}
                              {med.at_home && (
                                <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded px-2 py-0.5 font-medium">✓ At Home</span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded px-2 py-0.5 font-medium">Awaiting parent confirmation</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </Card>
  );
}
