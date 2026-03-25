import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import SignaturePad from '@/components/shared/SignaturePad';
import { format } from 'date-fns';

const PARENT_ITEMS = [
  { key: 'parent_check_1', label: 'Medical Management plans are correct and current to ensure correct information is provided to the centre.' },
  { key: 'parent_check_2', label: 'If medical condition is food related, I will notify the centre of my child\'s requirements and menu alternatives.' },
  { key: 'parent_check_3', label: 'The risk minimisation plan has been developed in consultation with my family and the centre.' },
  { key: 'parent_check_4', label: 'Any changes to my child\'s medical condition will be communicated immediately to the nominated supervisor.' },
  { key: 'parent_check_5', label: 'All medications required will be on premises at all times my child is in attendance. Medication will be prescribed by a doctor, in date, and clearly labelled.' },
  { key: 'parent_check_6', label: 'I will ensure changes of attendance and absences are notified to the centre.' },
  { key: 'parent_check_7', label: 'The medical management, risk minimisation and communication plan will be reviewed annually or when changes are identified.' },
];

export default function ParentCommPlan() {
  const urlParams = new URLSearchParams(window.location.search);
  const childId = urlParams.get('child');
  const planId = urlParams.get('plan');

  const [checks, setChecks] = useState({
    parent_check_1: false, parent_check_2: false, parent_check_3: false,
    parent_check_4: false, parent_check_5: false, parent_check_6: false,
    parent_check_7: false,
  });
  const [parentName, setParentName] = useState('');
  const [parentSig, setParentSig] = useState(null);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: children = [], isLoading: lc } = useQuery({
    queryKey: ['parent-comm-child', childId],
    queryFn: () => base44.entities.Children.filter({ id: childId }),
    enabled: !!childId,
  });
  const child = children[0];

  const { data: commPlans = [], isLoading: lp } = useQuery({
    queryKey: ['parent-comm-plan', planId],
    queryFn: () => base44.entities.CommunicationPlan.filter({ id: planId }),
    enabled: !!planId,
  });
  const commPlan = commPlans[0];

  const { data: riskPlans = [] } = useQuery({
    queryKey: ['parent-comm-riskplans', childId],
    queryFn: () => base44.entities.RiskPlans.filter({ child_id: childId }),
    enabled: !!childId,
  });
  const activePlans = riskPlans.filter(p => p.status !== 'Closed');

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!parentName.trim()) throw new Error('Please enter your full name');
      if (!Object.values(checks).every(Boolean)) throw new Error('Please tick all items to confirm');
      if (!parentSig) throw new Error('Please sign before submitting');

      const blob = await fetch(parentSig).then(r => r.blob());
      const file = new File([blob], 'comm-signature.png', { type: 'image/png' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const updateData = {
        ...checks,
        parent_signed_name: parentName,
        parent_signature_url: file_url,
        parent_signed_date: new Date().toISOString().split('T')[0],
        status: 'Complete',
      };

      if (planId && commPlan) {
        await base44.entities.CommunicationPlan.update(planId, updateData);
      } else {
        await base44.entities.CommunicationPlan.create({
          child_id: childId,
          ...updateData,
        });
      }

      // Log the communication
      await base44.entities.CommunicationLog.create({
        child_id: childId,
        date: new Date().toISOString().split('T')[0],
        method: 'Email',
        subject: 'Communication Plan signed by parent',
        summary: `Communication Plan digitally signed by ${parentName}. All family obligations acknowledged.`,
        sent_by: 'Parent Portal',
        response_required: 'No',
        response_received: 'Yes',
        follow_up_required: 'No',
      });

      // Update PlanTracking to Complete
      const planTracking = await base44.entities.PlanTracking.filter({ child_id: childId });
      if (planTracking.length > 0) {
        const latest = planTracking.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
        await base44.entities.PlanTracking.update(latest.id, { plan_status: 'Signed', notes: 'Communication Plan also signed by parent.' });
      }
    },
    onSuccess: () => setSubmitted(true),
    onError: (e) => setError(e.message || 'Something went wrong. Please try again.'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    submitMutation.mutate();
  };

  if (lc || lp) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Skeleton className="h-96 w-full max-w-2xl rounded-xl" />
    </div>
  );

  if (!childId || !child) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center space-y-3">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold">Invalid Link</h2>
        <p className="text-gray-600">This link is invalid or has expired. Please contact the service.</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-md">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
        <h2 className="text-2xl font-bold text-gray-900">All Done — Thank You!</h2>
        <p className="text-gray-600">
          You have successfully signed the Communication Plan for <strong>{child.first_name} {child.last_name}</strong>.
          The service now has everything needed to finalise your child's medical management documentation.
        </p>
        <p className="text-sm text-gray-500">Signed on {format(new Date(), 'dd MMMM yyyy')}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Communication Plan</h1>
          <p className="text-gray-500 mt-1">Family Obligations — {child.first_name} {child.last_name}</p>
        </div>

        {/* Child summary */}
        <div className="bg-white border rounded-xl p-5 shadow-sm space-y-2 text-sm">
          <h2 className="font-bold text-gray-700 text-xs uppercase tracking-wide mb-3">Child Details</h2>
          <div className="grid grid-cols-2 gap-y-1.5">
            <div><span className="font-medium">Name:</span> {child.first_name} {child.last_name}</div>
            {child.dob && <div><span className="font-medium">DOB:</span> {format(new Date(child.dob), 'dd/MM/yyyy')}</div>}
            <div><span className="font-medium">Condition:</span> {child.condition_type}</div>
            {activePlans[0]?.review_date && (
              <div><span className="font-medium">Plan Review:</span> {format(new Date(activePlans[0].review_date), 'dd/MM/yyyy')}</div>
            )}
          </div>
        </div>

        {/* Centre obligations (read-only) */}
        {commPlan && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-3">
            <h2 className="font-bold text-gray-900 text-sm">✅ Centre has confirmed their obligations</h2>
            <p className="text-xs text-gray-600">Completed by <strong>{commPlan.centre_staff_name}</strong> on {commPlan.centre_completed_date ? format(new Date(commPlan.centre_completed_date), 'dd/MM/yyyy') : '—'}</p>
          </div>
        )}

        {/* Parent checklist */}
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-5">
          <h2 className="font-bold text-gray-900">Your Family Obligations</h2>
          <p className="text-sm text-gray-600">Please read and tick each item to confirm your understanding and agreement.</p>

          <div className="space-y-4">
            {PARENT_ITEMS.map((item, i) => (
              <label key={item.key} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 cursor-pointer"
                  checked={checks[item.key]}
                  onChange={e => setChecks(prev => ({ ...prev, [item.key]: e.target.checked }))}
                />
                <span className="text-sm text-gray-700 leading-relaxed">
                  <span className="font-medium text-gray-400 mr-1">{i + 1}.</span>
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Sign */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Sign the Communication Plan</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Full Name *</label>
              <Input placeholder="e.g. Jane Smith" value={parentName} onChange={e => setParentName(e.target.value)} />
            </div>

            <div>
              {parentSig ? (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Your Signature:</p>
                  <img src={parentSig} alt="Signature" className="h-16 border-b border-gray-400 w-full object-contain object-left" />
                  <button type="button" onClick={() => setParentSig(null)} className="text-xs text-blue-600 underline mt-1">Clear signature</button>
                </div>
              ) : (
                <SignaturePad label="Your Signature:" onSave={setParentSig} />
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitMutation.isPending}>
              {submitMutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                : <><CheckCircle2 className="w-4 h-4" /> Submit Communication Plan</>
              }
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400">
          Generated {format(new Date(), 'dd MMMM yyyy')} · First Steps Before &amp; After School Care — Confidential
        </p>
      </div>
    </div>
  );
}