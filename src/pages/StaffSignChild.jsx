import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, CheckCircle2, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import SignaturePad from '@/components/shared/SignaturePad';
import { toast } from 'sonner';

const CHECKS = [
  { key: 'check_medical_policy', label: 'I have read the medical conditions policy' },
  { key: 'check_condition_aware', label: "I am informed about this child's medical condition and individual care plan" },
  { key: 'check_med_plan_location', label: 'I have read and know the location of the Medical Management Plan' },
  { key: 'check_risk_plan_location', label: 'I have read and know the location of the Risk Minimisation Plan' },
  { key: 'check_medication_use', label: "I know how to use the child's medications and where they are stored" },
];

export default function StaffSignChild() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    staff_name: '',
    staff_role: '',
    check_medical_policy: false,
    check_condition_aware: false,
    check_med_plan_location: false,
    check_risk_plan_location: false,
    check_medication_use: false,
  });
  const [sig, setSig] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const { data: children = [], isLoading: lc } = useQuery({
    queryKey: ['child', childId],
    queryFn: () => base44.entities.Children.filter({ id: childId }),
  });
  const child = children[0];

  const { data: riskPlans = [], isLoading: lr } = useQuery({
    queryKey: ['riskPlans', childId],
    queryFn: () => base44.entities.RiskPlans.filter({ child_id: childId }),
  });
  const activePlans = riskPlans.filter(p => p.status !== 'Closed');

  const submitMutation = useMutation({
    mutationFn: async () => {
      let sigUrl = null;
      if (sig) {
        const blob = await (await fetch(sig)).blob();
        const file = new File([blob], 'staff-sig.png', { type: 'image/png' });
        const res = await base44.integrations.Core.UploadFile({ file });
        sigUrl = res.file_url;
      }
      const today = new Date().toISOString().split('T')[0];

      await base44.entities.StaffSignoff.create({
        child_id: childId,
        ...form,
        signature_url: sigUrl,
        signed_date: today,
      });
    },
    onSuccess: () => setSubmitted(true),
    onError: () => toast.error('Failed to save. Please try again.'),
  });

  const allChecked = CHECKS.every(c => form[c.key]);
  const canSubmit = form.staff_name.trim() && allChecked && sig;

  if (!childId) return <div className="min-h-screen flex items-center justify-center text-gray-500">Invalid link.</div>;
  if (lc || lr) return <div className="min-h-screen flex items-center justify-center"><Skeleton className="w-80 h-60" /></div>;
  if (!child) return <div className="min-h-screen flex items-center justify-center text-gray-500">Child not found.</div>;

  const childName = `${child.first_name} ${child.last_name}`;
  const conditionDesc = child.condition_type === 'Allergy'
    ? `Allergy – ${child.allergens || ''}${child.severity ? ` (${child.severity})` : ''}`
    : child.condition_type === 'Asthma'
    ? `Asthma${child.asthma_severity ? ` – ${child.asthma_severity}` : ''}${child.asthma_triggers ? `. Triggers: ${child.asthma_triggers}` : ''}`
    : child.dietary_requirement || 'Dietary Requirement';

  if (submitted) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Thank you!</h1>
          <p className="text-gray-500 mb-4">Your acknowledgement has been recorded for <strong>{childName}</strong>.</p>
          <p className="text-sm text-gray-400 mb-6">{format(new Date(), 'dd MMMM yyyy')}</p>
          <Button onClick={() => navigate('/')} className="w-full">
            Back to Children
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800">{childName}</h1>
            <p className="text-sm text-gray-500">Staff Acknowledgement</p>
          </div>
        </div>

        {/* Child Summary */}
        <div className="bg-white rounded-xl border p-5 space-y-3">
          <div className="flex gap-4">
            {child.photo_url && (
              <img src={child.photo_url} alt={childName} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
            )}
            <div className="flex-1 space-y-2 text-sm">
              <div><span className="text-gray-500">Condition:</span> <strong>{child.condition_type}</strong></div>
              <div><span className="text-gray-500">Details:</span> {conditionDesc}</div>
              <div><span className="text-gray-500">Room:</span> {child.room_group || '—'}</div>
            </div>
          </div>
        </div>

        {/* Risk Plans */}
        {activePlans.length > 0 && (
          <div className="bg-white rounded-xl border p-5 space-y-3">
            <h2 className="font-semibold text-gray-700">Risk Minimisation Plans</h2>
            {activePlans.map(plan => (
              <div key={plan.id} className="border rounded-lg p-3 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    plan.risk_level === 'High' ? 'bg-red-100 text-red-700' :
                    plan.risk_level === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>{plan.risk_level}</span>
                  <span className="font-medium">{plan.trigger}</span>
                </div>
                {plan.reaction && <div><span className="text-gray-500">Reaction:</span> {plan.reaction}</div>}
                {plan.control_measures && <div><span className="text-gray-500">Control:</span> {plan.control_measures}</div>}
                {plan.medication_required && (
                  <div className="p-2 bg-red-50 rounded text-red-700 text-xs">
                    <strong>Medication:</strong> {plan.medication_required} — {plan.medication_location}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Staff Details */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">Your Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Full Name *</label>
              <Input placeholder="e.g. Jane Smith" value={form.staff_name} onChange={e => setForm(f => ({ ...f, staff_name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Role</label>
              <Input placeholder="e.g. Educator" value={form.staff_role} onChange={e => setForm(f => ({ ...f, staff_role: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="bg-white rounded-xl border p-5 space-y-3">
          <h2 className="font-semibold text-gray-700">Acknowledgement</h2>
          <p className="text-sm text-gray-500">Please tick each box:</p>
          {CHECKS.map(({ key, label }) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer">
              <div
                onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}
                className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  form[key] ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                }`}
              >
                {form[key] && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>

        {/* Signature */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Digital Signature *</h2>
          <SignaturePad label="" onSave={setSig} />
        </div>

        {/* Submit */}
        <Button
          className="w-full h-12 text-base"
          disabled={!canSubmit || submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
        >
          {submitMutation.isPending ? 'Submitting…' : 'Submit Acknowledgement'}
        </Button>
        {!canSubmit && (
          <p className="text-center text-sm text-gray-400">
            {!form.staff_name.trim() ? 'Enter your name · ' : ''}
            {!CHECKS.every(c => form[c.key]) ? 'Tick all boxes · ' : ''}
            {!sig ? 'Add your signature' : ''}
          </p>
        )}
      </div>
    </div>
  );
}