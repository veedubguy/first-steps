import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

export default function ParentDietaryForm() {
  const urlParams = new URLSearchParams(window.location.search);
  const childId = urlParams.get('child');

  const [form, setForm] = useState({
    dietary_type: '',
    religious_requirement: '',
    foods_to_avoid: '',
    cross_contamination_concern: 'No',
    cross_contamination_details: '',
    meal_alternatives: '',
    parent_will_provide_food: 'No',
    additional_notes: '',
    parent_name: '',
  });
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: children = [], isLoading: lc } = useQuery({
    queryKey: ['dietary-child', childId],
    queryFn: () => base44.entities.Children.filter({ id: childId }),
    enabled: !!childId,
  });
  const child = children[0];

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!form.parent_name.trim()) throw new Error('Please enter your full name');
      if (!form.dietary_type.trim()) throw new Error('Please describe the dietary requirement');

      // Check if there's an existing intake record
      const existing = await base44.entities.DietaryIntake.filter({ child_id: childId });

      const data = {
        child_id: childId,
        ...form,
        submitted_date: new Date().toISOString().split('T')[0],
        status: 'Submitted',
      };

      if (existing.length > 0) {
        await base44.entities.DietaryIntake.update(existing[0].id, data);
      } else {
        await base44.entities.DietaryIntake.create(data);
      }

      // Update child record with dietary info
      await base44.entities.Children.update(childId, {
        dietary_requirement: form.dietary_type + (form.religious_requirement ? ` — ${form.religious_requirement}` : ''),
        notes: form.additional_notes || child?.notes,
      });

      // Log the communication
      await base44.entities.CommunicationLog.create({
        child_id: childId,
        date: new Date().toISOString().split('T')[0],
        method: 'Email',
        subject: 'Dietary Intake Form submitted by parent',
        summary: `Dietary information submitted by ${form.parent_name}. Requirement: ${form.dietary_type}${form.religious_requirement ? `, Religious: ${form.religious_requirement}` : ''}.`,
        sent_by: 'Parent Portal',
        response_required: 'No',
        response_received: 'Yes',
        follow_up_required: 'Yes',
      });

      // Create/update plan tracking to show it was submitted
      const planTracking = await base44.entities.PlanTracking.filter({ child_id: childId });
      if (planTracking.length === 0) {
        await base44.entities.PlanTracking.create({
          child_id: childId,
          plan_type: 'Dietary',
          plan_status: 'Signed',
          parent_signed: 'Yes',
          signed_date: new Date().toISOString().split('T')[0],
          parent_signed_name: form.parent_name,
          notes: 'Dietary intake form submitted by parent.',
        });
      } else {
        await base44.entities.PlanTracking.update(planTracking[0].id, {
          plan_status: 'Signed',
          parent_signed: 'Yes',
          signed_date: new Date().toISOString().split('T')[0],
          parent_signed_name: form.parent_name,
        });
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

  if (lc) return (
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
        <h2 className="text-2xl font-bold text-gray-900">Thank You!</h2>
        <p className="text-gray-600">
          Your dietary information for <strong>{child.first_name} {child.last_name}</strong> has been submitted.
          The service will review this and be in touch if anything further is needed.
        </p>
        <p className="text-sm text-gray-500">Submitted on {format(new Date(), 'dd MMMM yyyy')}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Dietary Requirement Form</h1>
          <p className="text-gray-500 mt-1">Please complete this form for <strong>{child.first_name} {child.last_name}</strong></p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <p>This form helps our team understand and accommodate your child's dietary needs. Please be as detailed as possible so we can keep your child safe.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Section 1: Dietary Requirements */}
          <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-900">Dietary Requirements</h2>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Primary Dietary Requirement *</label>
              <Input
                placeholder="e.g. Halal, No Dairy, Vegetarian, Gluten-Free, Nut-Free"
                value={form.dietary_type}
                onChange={e => update('dietary_type', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Religious Dietary Requirement</label>
              <Input
                placeholder="e.g. Halal, Kosher, Hindu Vegetarian, None"
                value={form.religious_requirement}
                onChange={e => update('religious_requirement', e.target.value)}
              />
              <p className="text-xs text-gray-400">Leave blank if not applicable</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Specific Foods / Ingredients to Avoid</label>
              <Textarea
                placeholder="e.g. Pork and pork products, shellfish, dairy, wheat, food colourings..."
                value={form.foods_to_avoid}
                onChange={e => update('foods_to_avoid', e.target.value)}
                className="h-24"
              />
            </div>
          </div>

          {/* Section 2: Cross Contamination */}
          <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-900">Cross-Contamination</h2>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Is cross-contamination a concern?</label>
              <Select value={form.cross_contamination_concern} onValueChange={v => update('cross_contamination_concern', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.cross_contamination_concern === 'Yes' && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Please describe your cross-contamination concerns</label>
                <Textarea
                  placeholder="e.g. Must not use same utensils as pork/shellfish products, separate preparation area required..."
                  value={form.cross_contamination_details}
                  onChange={e => update('cross_contamination_details', e.target.value)}
                  className="h-20"
                />
              </div>
            )}
          </div>

          {/* Section 3: Meal Alternatives */}
          <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-900">Meal Arrangements</h2>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Will you provide food from home?</label>
              <Select value={form.parent_will_provide_food} onValueChange={v => update('parent_will_provide_food', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes — I will provide all food</SelectItem>
                  <SelectItem value="No">No — centre to provide alternatives</SelectItem>
                  <SelectItem value="Sometimes">Sometimes — combination</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Preferred Meal Alternatives / Substitutions</label>
              <Textarea
                placeholder="e.g. Rice instead of bread, fruit instead of dairy snacks, Halal certified options only..."
                value={form.meal_alternatives}
                onChange={e => update('meal_alternatives', e.target.value)}
                className="h-20"
              />
            </div>
          </div>

          {/* Section 4: Additional Notes */}
          <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-900">Additional Information</h2>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Any other notes or important information</label>
              <Textarea
                placeholder="Any medical context, doctor's advice, additional restrictions, or other important details..."
                value={form.additional_notes}
                onChange={e => update('additional_notes', e.target.value)}
                className="h-24"
              />
            </div>
          </div>

          {/* Section 5: Parent Sign-off */}
          <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-900">Parent / Guardian Declaration</h2>
            <p className="text-sm text-gray-600">By submitting this form, you confirm that the information provided is accurate and you agree to notify the service of any changes to your child's dietary requirements.</p>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Your Full Name *</label>
              <Input
                placeholder="e.g. Jane Smith"
                value={form.parent_name}
                onChange={e => update('parent_name', e.target.value)}
              />
            </div>
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
              : <><CheckCircle2 className="w-4 h-4" /> Submit Dietary Form</>
            }
          </Button>
        </form>

        <p className="text-center text-xs text-gray-400">
          Generated {format(new Date(), 'dd MMMM yyyy')} · First Steps Before &amp; After School Care — Confidential
        </p>
      </div>
    </div>
  );
}