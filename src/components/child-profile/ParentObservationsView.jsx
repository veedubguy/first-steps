import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Home } from 'lucide-react';

export default function ParentObservationsView({ childId }) {
  const { data: commPlans = [], isLoading } = useQuery({
    queryKey: ['commPlan', childId],
    queryFn: () => base44.entities.CommunicationPlan.filter({ child_id: childId }),
  });

  const commPlan = commPlans[0];

  if (isLoading) return null;

  const hasData = commPlan && (
    commPlan.parent_home_triggers ||
    commPlan.parent_home_reaction ||
    commPlan.parent_home_patterns ||
    commPlan.parent_additional_notes
  );

  if (!hasData) {
    return (
      <div className="text-sm text-muted-foreground bg-muted/40 border rounded-lg px-4 py-3">
        No parent observations submitted yet.
      </div>
    );
  }

  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2 text-sm font-medium bg-green-50 text-green-800 border-b border-green-200">
        <Home className="w-4 h-4" />
        Parent Observations (submitted via Comm Plan)
      </div>
      <div className="p-4 space-y-3 text-sm bg-white">
        {commPlan.parent_home_triggers && (
          <div>
            <span className="font-medium text-gray-600">Triggers observed at home:</span>
            <p className="mt-0.5 text-gray-800">{commPlan.parent_home_triggers}</p>
          </div>
        )}
        {commPlan.parent_home_reaction && (
          <div>
            <span className="font-medium text-gray-600">Typical reaction at home:</span>
            <p className="mt-0.5 text-gray-800">{commPlan.parent_home_reaction}</p>
          </div>
        )}
        {commPlan.parent_home_patterns && (
          <div>
            <span className="font-medium text-gray-600">Patterns / situations noticed:</span>
            <p className="mt-0.5 text-gray-800">{commPlan.parent_home_patterns}</p>
          </div>
        )}
        {commPlan.parent_additional_notes && (
          <div>
            <span className="font-medium text-gray-600">Additional notes from parent:</span>
            <p className="mt-0.5 text-gray-800">{commPlan.parent_additional_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}