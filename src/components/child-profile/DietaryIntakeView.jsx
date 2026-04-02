import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function DietaryIntakeView({ childId }) {
  const { data: intakes = [], isLoading } = useQuery({
    queryKey: ['dietaryIntake', childId],
    queryFn: () => base44.entities.DietaryIntake.filter({ child_id: childId }),
  });

  const intake = intakes[0];

  if (isLoading) return null;

  if (!intake || intake.status === 'Pending') {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <Clock className="w-4 h-4 shrink-0" />
        <span>Dietary intake form not yet submitted by parent.</span>
      </div>
    );
  }

  return (
    <div className="border rounded-xl overflow-hidden">
      <div className={`px-4 py-3 flex items-center gap-2 text-sm font-medium ${intake.status === 'Reviewed' ? 'bg-green-50 text-green-800 border-b border-green-200' : 'bg-blue-50 text-blue-800 border-b border-blue-200'}`}>
        {intake.status === 'Reviewed'
          ? <><CheckCircle2 className="w-4 h-4" /> Dietary intake reviewed</>
          : <><AlertCircle className="w-4 h-4" /> Dietary intake submitted — awaiting staff review</>
        }
        {intake.submitted_date && (
          <span className="ml-auto font-normal text-xs">Submitted {format(new Date(intake.submitted_date), 'dd/MM/yyyy')}</span>
        )}
      </div>
      <div className="p-4 space-y-2 text-sm bg-white">
        {intake.dietary_type && <div><span className="font-medium text-gray-600">Dietary Requirement:</span> {intake.dietary_type}</div>}
        {intake.religious_requirement && <div><span className="font-medium text-gray-600">Religious:</span> {intake.religious_requirement}</div>}
        {intake.foods_to_avoid && <div><span className="font-medium text-gray-600">Foods to Avoid:</span> {intake.foods_to_avoid}</div>}
        {intake.cross_contamination_concern === 'Yes' && (
          <div><span className="font-medium text-gray-600">Cross-Contamination:</span> {intake.cross_contamination_details || 'Yes — details not provided'}</div>
        )}
        {intake.meal_alternatives && <div><span className="font-medium text-gray-600">Meal Alternatives:</span> {intake.meal_alternatives}</div>}
        {intake.parent_will_provide_food && <div><span className="font-medium text-gray-600">Parent Provides Food:</span> {intake.parent_will_provide_food}</div>}
        {intake.additional_notes && <div><span className="font-medium text-gray-600">Notes:</span> {intake.additional_notes}</div>}
        {intake.parent_name && <div className="text-xs text-gray-400 pt-1">Submitted by {intake.parent_name}</div>}
      </div>
    </div>
  );
}