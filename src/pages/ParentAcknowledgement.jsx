import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [parentInput, setParentInput] = useState({
    trigger: '',
    exposure_risk: '',
    reaction: '',
    control_measures: '',
  });
  const [parentObservations, setParentObservations] = useState({
    parent_home_triggers: '',
    parent_home_reaction: '',
    parent_home_patterns: '',
    parent_additional_notes: '',
  });
  const [medConfirmed, setMedConfirmed] = useState({});
  const [medLocations, setMedLocations] = useState({});

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

  const { data: medications = [], isLoading: lm } = useQuery({
    queryKey: ['ack-meds', childId],
    queryFn: () => base44.entities.Medication.filter({ child_id: childId }),
    enabled: !!childId,
  });

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  // Only use the single most recent active plan
  const allActivePlans = riskPlans.filter(p => p.status !== 'Closed');
  const activePlans = allActivePlans.slice(0, 1);

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

      // Upload the child photo if provided
      if (photoFile) {
        const photoResult = await base44.integrations.Core.UploadFile({ file: photoFile });
        await base44.entities.Children.update(childId, { photo_url: photoResult.file_url });
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

      // Update risk plans with parent input
      if (activePlans.length > 0 && (parentInput.trigger || parentInput.exposure_risk || parentInput.reaction || parentInput.control_measures)) {
        const plan = activePlans[0];
        await base44.entities.RiskPlans.update(plan.id, {
          trigger: parentInput.trigger || plan.trigger,
          exposure_risk: parentInput.exposure_risk || plan.exposure_risk,
          reaction: parentInput.reaction || plan.reaction,
          control_measures: parentInput.control_measures || plan.control_measures,
        });
      }

      // Update medications with parent-confirmed locations
      for (const med of medications) {
        const medKey = med.id;
        const atService = medLocations[`${medKey}_service`] || false;
        const atHome = medLocations[`${medKey}_home`] || false;
        if (atService || atHome) {
          await base44.entities.Medication.update(med.id, {
            at_service: atService,
            at_home: atHome,
            parent_confirmed: true,
            parent_confirmed_date: new Date().toISOString().split('T')[0],
          });
        }
      }

      // Save parent observations to CommunicationPlan
      const hasObservations = Object.values(parentObservations).some(v => v.trim());
      if (hasObservations) {
        const existingCommPlans = await base44.entities.CommunicationPlan.filter({ child_id: childId });
        if (existingCommPlans[0]) {
          await base44.entities.CommunicationPlan.update(existingCommPlans[0].id, parentObservations);
        } else {
          await base44.entities.CommunicationPlan.create({ child_id: childId, status: 'Centre Pending', ...parentObservations });
        }
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

  const isLoading = lc || lr || lm;

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

  const handleParentInputChange = (field, value) => {
    setParentInput(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
         {/* Header */}
         <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {child.condition_type === 'Allergy' ? 'Allergy Risk Minimisation Plan' :
             child.condition_type === 'Asthma' ? 'Asthma Management Plan' :
             child.condition_type === 'Dietary' ? 'Dietary Management Plan' :
             `${child.condition_type} Management Plan`}
          </h1>
          <p className="text-gray-500 mt-1">Please review and acknowledge this plan for your child</p>
        </div>

        {/* Parent Input Section — not shown for Dietary (they have their own form) */}
        {activePlans.length > 0 && child.condition_type !== 'Dietary' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 space-y-4">
            <h2 className="font-bold text-gray-900">Please Complete These Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">What is the trigger? *</label>
                <Input
                  placeholder="e.g. Peanuts, dairy, exercise..."
                  value={parentInput.trigger}
                  onChange={e => handleParentInputChange('trigger', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">How might exposure occur?</label>
                <Textarea
                  placeholder="e.g. Through food contact, airborne particles..."
                  value={parentInput.exposure_risk}
                  onChange={e => handleParentInputChange('exposure_risk', e.target.value)}
                  className="h-20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">What is the expected reaction?</label>
                <Textarea
                  placeholder="e.g. Rash, swelling, difficulty breathing..."
                  value={parentInput.reaction}
                  onChange={e => handleParentInputChange('reaction', e.target.value)}
                  className="h-20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">What control measures should be in place?</label>
                <Textarea
                  placeholder="e.g. Avoid certain foods, have medication available..."
                  value={parentInput.control_measures}
                  onChange={e => handleParentInputChange('control_measures', e.target.value)}
                  className="h-20"
                />
              </div>
            </div>
          </div>
        )}

        {/* Parent Home Observations */}
        {child.condition_type !== 'Dietary' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 space-y-4">
            <h2 className="font-bold text-gray-900">About Your Child at Home</h2>
            <p className="text-sm text-gray-600">This information helps our staff better understand your child's condition and provide the best care.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">What triggers have you noticed at home?</label>
                <Textarea
                  placeholder="e.g. Being near cats, eating certain foods, cold weather..."
                  value={parentObservations.parent_home_triggers}
                  onChange={e => setParentObservations(prev => ({ ...prev, parent_home_triggers: e.target.value }))}
                  className="h-20 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">How does your child typically react at home?</label>
                <Textarea
                  placeholder="e.g. Gets hives, starts coughing, becomes distressed..."
                  value={parentObservations.parent_home_reaction}
                  onChange={e => setParentObservations(prev => ({ ...prev, parent_home_reaction: e.target.value }))}
                  className="h-20 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Any patterns or situations you've noticed?</label>
                <Textarea
                  placeholder="e.g. Worse in the morning, after exercise, during pollen season..."
                  value={parentObservations.parent_home_patterns}
                  onChange={e => setParentObservations(prev => ({ ...prev, parent_home_patterns: e.target.value }))}
                  className="h-20 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Anything else the service should know?</label>
                <Textarea
                  placeholder="Any additional information that would help our staff care for your child..."
                  value={parentObservations.parent_additional_notes}
                  onChange={e => setParentObservations(prev => ({ ...prev, parent_additional_notes: e.target.value }))}
                  className="h-20 bg-white"
                />
              </div>
            </div>
          </div>
        )}

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

          {/* Risk Plans — only show the first (most recent) plan */}
          {activePlans.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase bg-gray-100 px-3 py-1.5 rounded mb-3 text-gray-700">Risk Minimisation Plan</h2>
              {activePlans[0] && (
                <div className="px-3 mb-4 text-sm">
                  <div className="space-y-1.5 text-sm">
                    <div className="flex gap-2"><span className="font-medium w-36 shrink-0">Trigger:</span><span>{activePlans[0].trigger}</span></div>
                    {activePlans[0].exposure_risk && <div className="flex gap-2"><span className="font-medium w-36 shrink-0">Exposure Risk:</span><span>{activePlans[0].exposure_risk}</span></div>}
                    {activePlans[0].reaction && <div className="flex gap-2"><span className="font-medium w-36 shrink-0">Reaction:</span><span>{activePlans[0].reaction}</span></div>}
                    <div className="flex gap-2"><span className="font-medium w-36 shrink-0">Risk Level:</span><span className="font-semibold">{activePlans[0].risk_level}</span></div>
                    {activePlans[0].control_measures && <div className="flex gap-2"><span className="font-medium w-36 shrink-0">Control Measures:</span><span>{activePlans[0].control_measures}</span></div>}
                    {activePlans[0].medication_required && <div className="flex gap-2"><span className="font-medium w-36 shrink-0">Medication:</span><span>{activePlans[0].medication_required}</span></div>}
                    {activePlans[0].medication_location && <div className="flex gap-2"><span className="font-medium w-36 shrink-0">Stored At:</span><span>{activePlans[0].medication_location}</span></div>}
                    {activePlans[0].review_date && <div className="flex gap-2"><span className="font-medium w-36 shrink-0">Review Date:</span><span>{format(new Date(activePlans[0].review_date), 'dd/MM/yyyy')}</span></div>}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Medications from AI extraction — all condition types */}
          {medications && medications.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase bg-gray-100 px-3 py-1.5 rounded mb-3 text-gray-700">Medications</h2>
              <p className="text-xs text-gray-500 px-3 mb-3">Please indicate where each medication will be used:</p>
              <div className="px-3 space-y-3">
                {medications.map((med) => (
                  <div key={med.id} className="border rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium text-gray-900">{med.name}</p>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300"
                          checked={medLocations[`${med.id}_service`] || false}
                          onChange={e => setMedLocations(prev => ({ ...prev, [`${med.id}_service`]: e.target.checked }))}
                        />
                        <span className="text-sm text-gray-700">At Service</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300"
                          checked={medLocations[`${med.id}_home`] || false}
                          onChange={e => setMedLocations(prev => ({ ...prev, [`${med.id}_home`]: e.target.checked }))}
                        />
                        <span className="text-sm text-gray-700">At Home</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
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

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Child's Photo <span className="text-gray-400 font-normal">(optional — used for identification on the care plan)</span>
              </label>
              {photoPreview ? (
                <div className="flex items-center gap-4">
                  <img src={photoPreview} alt="Child" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                  <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} className="text-xs text-blue-600 underline">
                    Remove photo
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
                  onClick={() => document.getElementById('parent-photo-upload').click()}>
                  <p className="text-sm text-gray-500">Tap to upload a photo of your child</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG accepted</p>
                  <input id="parent-photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </div>
              )}
            </div>

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