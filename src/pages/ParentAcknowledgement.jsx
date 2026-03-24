import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import SignaturePad from '@/components/shared/SignaturePad';

export default function ParentAcknowledgement() {
  const urlParams = new URLSearchParams(window.location.search);
  const childId = urlParams.get('child');
  const planTrackingId = urlParams.get('plan');

  const [parentName, setParentName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [parentSig, setParentSig] = useState(null);
  const [signedDate] = useState(format(new Date(), 'dd/MM/yyyy'));

  const { data: children = [], isLoading: lc } = useQuery({
    queryKey: ['ack-child', childId],
    queryFn: () => base44.entities.Children.filter({ id: childId }),
    enabled: !!childId,
  });
  const child = children[0];

  const { data: riskPlans = [], isLoading: lr } = useQuery({
    queryKey: ['ack-plans', childId],
    queryFn: () => base44.entities.RiskPlans.filter({ child_id: childId }),
    enabled: !!childId,
  });

  const signMutation = useMutation({
    mutationFn: async () => {
      // Upload the signature image
      let signatureUrl = null;
      if (parentSig) {
        const blob = await fetch(parentSig).then(r => r.blob());
        const file = new File([blob], 'signature.png', { type: 'image/png' });
        const result = await base44.integrations.Core.UploadFile({ file });
        signatureUrl = result.file_url;
      }

      const sigData = {
        plan_status: 'Signed',
        parent_signed: 'Yes',
        signed_date: new Date().toISOString().split('T')[0],
        parent_signed_name: parentName,
        ...(signatureUrl && { parent_signature_url: signatureUrl }),
        notes: `Signed digitally by ${parentName}`,
      };

      // Update plan tracking to Signed
      if (planTrackingId) {
        await base44.entities.PlanTracking.update(planTrackingId, sigData);
      } else {
        // Create a new signed record
        await base44.entities.PlanTracking.create({
          child_id: childId,
          plan_type: child?.condition_type || 'Allergy',
          ...sigData,
        });
      }
      // Log the communication
      await base44.entities.CommunicationLog.create({
        child_id: childId,
        date: new Date().toISOString().split('T')[0],
        method: 'Email',
        subject: 'Parent Plan Acknowledgement',
        summary: `Plan digitally acknowledged and signed by ${parentName}`,
        sent_by: 'Parent Portal',
        response_required: 'No',
        response_received: 'Yes',
        follow_up_required: 'No',
      });
    },
    onSuccess: () => setSubmitted(true),
    onError: () => setError('Something went wrong. Please try again.'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!parentName.trim()) { setError('Please enter your full name.'); return; }
    if (!agreed) { setError('Please check the acknowledgement box.'); return; }
    if (!parentSig) { setError('Please sign before submitting.'); return; }
    setError('');
    signMutation.mutate();
  };

  const isLoading = lc || lr;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!childId || !child) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold">Invalid Link</h2>
          <p className="text-gray-600">This link is invalid or has expired. Please contact the service.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-900">Thank You!</h2>
          <p className="text-gray-600">
            Your acknowledgement has been recorded. The service has been notified that you have reviewed and signed the plan for <strong>{child.first_name} {child.last_name}</strong>.
          </p>
          <p className="text-sm text-gray-500">Signed on {format(new Date(), 'dd MMMM yyyy')}</p>
        </div>
      </div>
    );
  }

  const activePlans = riskPlans.filter(p => p.status !== 'Closed');

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {child.condition_type === 'Allergy' ? 'Allergy Risk Minimisation Plan' :
             child.condition_type === 'Asthma' ? 'Asthma Management Plan' : 'Dietary Management Plan'}
          </h1>
          <p className="text-gray-500 mt-1">Please review and acknowledge this plan for your child</p>
        </div>

        {/* Plan Document */}
        <div className="bg-white border rounded-xl p-6 space-y-6 shadow-sm">
          {/* Child Details */}
          <section>
            <h2 className="text-sm font-bold uppercase bg-gray-100 px-3 py-1.5 rounded mb-3 text-gray-700">Child Details</h2>
            <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-sm px-3">
              <div><span className="font-medium">Name:</span> {child.first_name} {child.last_name}</div>
              {child.dob && <div><span className="font-medium">DOB:</span> {format(new Date(child.dob), 'dd/MM/yyyy')}</div>}
              {child.room_group && <div><span className="font-medium">Room/Group:</span> {child.room_group}</div>}
              <div><span className="font-medium">Condition:</span> {child.condition_type}</div>
              {child.condition_type === 'Allergy' && (
                <>
                  <div><span className="font-medium">Allergens:</span> <span className="text-red-700 font-semibold">{child.allergens || '—'}</span></div>
                  <div><span className="font-medium">Severity:</span> {child.severity || '—'}</div>
                </>
              )}
              {child.condition_type === 'Dietary' && (
                <div><span className="font-medium">Requirement:</span> {child.dietary_requirement || '—'}</div>
              )}
            </div>
          </section>

          {/* Risk Plans */}
          {activePlans.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase bg-gray-100 px-3 py-1.5 rounded mb-3 text-gray-700">Risk Minimisation Plans</h2>
              {activePlans.map((plan, idx) => (
                <div key={plan.id} className="px-3 mb-4 text-sm">
                  {activePlans.length > 1 && <p className="font-semibold mb-1">Plan {idx + 1}</p>}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex gap-2"><span className="font-medium w-36 shrink-0">Trigger:</span><span>{plan.trigger}</span></div>
                    {plan.exposure_risk && <div className="flex gap-2"><span className="font-medium w-36 shrink-0">Exposure Risk:</span><span>{plan.exposure_risk}</span></div>}
                    {plan.reaction && <div className="flex gap-2"><span className="font-medium w-36 shrink-0">Reaction:</span><span>{plan.reaction}</span></div>}
                    <div className="flex gap-2"><span className="font-medium w-36 shrink-0">Risk Level:</span><span className="font-semibold">{plan.risk_level}</span></div>
                    {plan.control_measures && <div className="flex gap-2"><span className="font-medium w-36 shrink-0">Control Measures:</span><span>{plan.control_measures}</span></div>}
                    {plan.medication_required && <div className="flex gap-2"><span className="font-medium w-36 shrink-0">Medication:</span><span>{plan.medication_required}</span></div>}
                    {plan.medication_location && <div className="flex gap-2"><span className="font-medium w-36 shrink-0">Stored At:</span><span>{plan.medication_location}</span></div>}
                    {plan.review_date && <div className="flex gap-2"><span className="font-medium w-36 shrink-0">Review Date:</span><span>{format(new Date(plan.review_date), 'dd/MM/yyyy')}</span></div>}
                  </div>
                </div>
              ))}
            </section>
          )}

          {child.notes && (
            <section>
              <h2 className="text-sm font-bold uppercase bg-gray-100 px-3 py-1.5 rounded mb-3 text-gray-700">Notes</h2>
              <p className="text-sm px-3">{child.notes}</p>
            </section>
          )}
        </div>

        {/* Acknowledgement Form */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Parent / Guardian Acknowledgement</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Full Name</label>
              <Input
                placeholder="e.g. Jane Smith"
                value={parentName}
                onChange={e => setParentName(e.target.value)}
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
              />
              <span className="text-sm text-gray-700">
                I, <strong>{parentName || 'the parent/guardian'}</strong>, acknowledge that I have read and understood this plan, agree to the information provided, and authorise the OSHC service to act in accordance with this plan.
              </span>
            </label>

            <div>
              {parentSig ? (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Your Signature:</p>
                  <img src={parentSig} alt="Signature" className="h-16 border-b border-gray-400 w-full object-contain object-left" />
                  <p className="text-xs text-gray-500 mt-1">Signed: {signedDate}</p>
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

            <Button
              type="submit"
              className="w-full"
              disabled={signMutation.isPending}
            >
              {signMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Submit Acknowledgement</>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400">
          Generated {format(new Date(), 'dd MMMM yyyy')} · OSHC Service — Confidential
        </p>
      </div>
    </div>
  );
}