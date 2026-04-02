import React from 'react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

const STAGES = [
  { key: 'stage1', label: 'Stage 1', desc: 'Risk Plan sent to parent' },
  { key: 'stage2', label: 'Stage 2', desc: 'Parent signed risk plan' },
  { key: 'stage3', label: 'Stage 3', desc: 'Centre comm checklist done' },
  { key: 'stage4', label: 'Stage 4', desc: 'Comm pack sent to parent' },
  { key: 'stage5', label: 'Stage 5', desc: 'Parent signed comm plan' },
];

export default function WorkflowTracker({ planTracking = [], commPlan = null }) {
  const latestPlan = planTracking[0];
  const planStatus = latestPlan?.plan_status;

  const getStageStatus = (key) => {
    switch (key) {
      case 'stage1': return planStatus === 'Sent' || planStatus === 'Signed' || commPlan ? 'done' : planTracking.length > 0 ? 'active' : 'pending';
      case 'stage2': return (planStatus === 'Signed' || commPlan) ? 'done' : planStatus === 'Sent' ? 'active' : 'pending';
      case 'stage3': return commPlan?.centre_completed_date ? 'done' : (planStatus === 'Signed') ? 'active' : 'pending';
      case 'stage4': return commPlan?.status === 'Comm Pack Sent' || commPlan?.status === 'Complete' ? 'done' : commPlan?.centre_completed_date ? 'active' : 'pending';
      case 'stage5': return commPlan?.status === 'Complete' ? 'done' : commPlan?.status === 'Comm Pack Sent' ? 'active' : 'pending';
      default: return 'pending';
    }
  };

  return (
    <div className="flex items-start gap-0 overflow-x-auto pb-1">
      {STAGES.map((stage, i) => {
        const status = getStageStatus(stage.key);
        return (
          <div key={stage.key} className="flex items-start flex-1 min-w-0">
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div className="flex items-center w-full">
                <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border-2 z-10
                  ${status === 'done' ? 'bg-green-500 border-green-500 text-white' :
                    status === 'active' ? 'bg-blue-500 border-blue-500 text-white' :
                    'bg-white border-gray-300 text-gray-400'}`}>
                  {status === 'done' ? <CheckCircle2 className="w-4 h-4" /> :
                   status === 'active' ? <Clock className="w-3.5 h-3.5" /> :
                   <Circle className="w-3.5 h-3.5" />}
                </div>
                {i < STAGES.length - 1 && (
                  <div className={`flex-1 h-0.5 ${status === 'done' ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>
              <div className="mt-1.5 pr-2 min-w-0">
                <p className={`text-xs font-semibold truncate ${status === 'done' ? 'text-green-700' : status === 'active' ? 'text-blue-700' : 'text-gray-400'}`}>
                  {stage.label}
                </p>
                <p className="text-xs text-gray-400 leading-tight" style={{ fontSize: '10px' }}>{stage.desc}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}