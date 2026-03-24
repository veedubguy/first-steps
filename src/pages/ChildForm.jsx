import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import ActionPlanUploadStep from '@/components/child-form/ActionPlanUploadStep';
import AiConfirmStep from '@/components/child-form/AiConfirmStep';

const emptyForm = {
  child_id: '',
  first_name: '',
  last_name: '',
  dob: '',
  room_group: '',
  condition_type: 'Allergy',
  allergens: '',
  severity: 'Low',
  asthma_triggers: '',
  asthma_severity: 'Mild',
  reliever_medication: '',
  preventer_medication: '',
  dietary_requirement: '',
  parent_name: '',
  parent_email: '',
  parent_phone: '',
  notes: '',
  // risk plan fields (only used during create wizard)
  trigger: '',
  reaction: '',
  control_measures: '',
  medication_required: '',
  medication_location: '',
};

export default function ChildForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  // step: 'upload' | 'confirm' | 'manual'  (only relevant when creating)
  const [step, setStep] = useState(isEditing ? 'manual' : 'upload');
  const [form, setForm] = useState(emptyForm);
  const [uploadedFile, setUploadedFile] = useState(null); // { url, name }

  const { data: existingChild } = useQuery({
    queryKey: ['child', id],
    queryFn: () => base44.entities.Children.filter({ id }),
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingChild && existingChild.length > 0) {
      setForm(existingChild[0]);
    }
  }, [existingChild]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      // Separate child fields from risk-plan fields
      const { trigger, reaction, control_measures, medication_required, medication_location, ...childData } = data;

      let child;
      if (isEditing) {
        child = await base44.entities.Children.update(id, childData);
      } else {
        // Attach the uploaded plan URL if we have one
        if (uploadedFile) {
          childData.doctor_plan_url = uploadedFile.url;
          childData.doctor_plan_filename = uploadedFile.name;
        }
        child = await base44.entities.Children.create(childData);
      }

      // If creating and we have risk plan data, create the risk plan too
      if (!isEditing && (trigger || reaction || control_measures)) {
        await base44.entities.RiskPlans.create({
          child_id: child.id,
          trigger: trigger || '',
          reaction: reaction || '',
          control_measures: control_measures || '',
          exposure_risk: '',
          risk_level: data.severity === 'Anaphylaxis' ? 'High' : data.severity === 'Moderate' ? 'Medium' : 'Low',
          medication_required: medication_required || '',
          medication_location: medication_location || '',
          status: 'Active',
        });
      }

      return child;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['children'] });
      toast.success(isEditing ? 'Child updated' : 'Child added');
      navigate(isEditing ? `/children/${id}` : `/children/${result.id}`);
    },
  });

  // Called when AI extraction is done
  const handleExtracted = (extracted, file) => {
    setUploadedFile(file);
    setForm({
      ...emptyForm,
      first_name: extracted.child_first_name || '',
      last_name: extracted.child_last_name || '',
      dob: extracted.child_dob || '',
      parent_name: extracted.parent_name || '',
      parent_email: extracted.parent_email || '',
      parent_phone: extracted.parent_phone || '',
      condition_type: ['Allergy', 'Dietary', 'Asthma'].includes(extracted.condition_type) ? extracted.condition_type : 'Allergy',
      allergens: extracted.allergens || '',
      severity: ['Low', 'Moderate', 'Anaphylaxis'].includes(extracted.severity) ? extracted.severity : 'Low',
      asthma_triggers: extracted.asthma_triggers || '',
      asthma_severity: ['Mild', 'Moderate', 'Severe'].includes(extracted.asthma_severity) ? extracted.asthma_severity : 'Mild',
      reliever_medication: extracted.reliever_medication || '',
      preventer_medication: extracted.preventer_medication || '',
      dietary_requirement: extracted.dietary_requirement || '',
      notes: extracted.notes || '',
      trigger: extracted.trigger || '',
      reaction: extracted.reaction || '',
      control_measures: extracted.control_measures || '',
      medication_required: extracted.medication_required || '',
      medication_location: extracted.medication_location || '',
    });
    setStep('confirm');
  };

  const handleSkip = (file) => {
    setUploadedFile(file);
    setStep('manual');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  // ── STEP 1: Upload ─────────────────────────────────────────────────────────
  if (step === 'upload') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Add Child</h1>
            <p className="text-xs text-muted-foreground">Step 1 of 2 — Upload action plan</p>
          </div>
        </div>
        <ActionPlanUploadStep onExtracted={handleExtracted} onSkip={handleSkip} />
      </div>
    );
  }

  // ── STEP 2 / MANUAL: Confirm/edit form ────────────────────────────────────
  if (step === 'confirm') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setStep('upload')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Confirm Details</h1>
            <p className="text-xs text-muted-foreground">Step 2 of 2 — Review AI-extracted data</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <AiConfirmStep form={form} onChange={setForm} uploadedFile={uploadedFile} />
          <div className="flex justify-between items-center sticky bottom-0 bg-background border-t pt-4 pb-2 -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
            <Button type="button" variant="outline" onClick={() => setStep('upload')} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="gap-2">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Child
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // ── MANUAL (skip or edit mode) ────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-bold">{isEditing ? 'Edit Child' : 'Add Child'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Basic Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input value={form.first_name} onChange={e => update('first_name', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input value={form.last_name} onChange={e => update('last_name', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Child ID</Label>
              <Input value={form.child_id} onChange={e => update('child_id', e.target.value)} placeholder="Optional unique ID" />
            </div>
            <div className="space-y-1.5">
              <Label>Date of Birth</Label>
              <Input type="date" value={form.dob} onChange={e => update('dob', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Room / Group</Label>
              <Input value={form.room_group} onChange={e => update('room_group', e.target.value)} placeholder="e.g. Before School, After School" />
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Condition Details</h2>
          <div className="space-y-1.5">
            <Label>Condition Type *</Label>
            <Select value={form.condition_type} onValueChange={v => update('condition_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Allergy">Allergy</SelectItem>
                <SelectItem value="Dietary">Dietary</SelectItem>
                <SelectItem value="Asthma">Asthma</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.condition_type === 'Allergy' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Allergens</Label>
                <Input value={form.allergens} onChange={e => update('allergens', e.target.value)} placeholder="e.g. Peanuts, Tree Nuts, Eggs" />
              </div>
              <div className="space-y-1.5">
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={v => update('severity', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Moderate">Moderate</SelectItem>
                    <SelectItem value="Anaphylaxis">Anaphylaxis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {form.condition_type === 'Asthma' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Asthma Triggers</Label>
                <Input value={form.asthma_triggers} onChange={e => update('asthma_triggers', e.target.value)} placeholder="e.g. Exercise, Cold air, Dust, Smoke" />
              </div>
              <div className="space-y-1.5">
                <Label>Asthma Severity</Label>
                <Select value={form.asthma_severity} onValueChange={v => update('asthma_severity', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mild">Mild</SelectItem>
                    <SelectItem value="Moderate">Moderate</SelectItem>
                    <SelectItem value="Severe">Severe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Reliever Medication</Label>
                <Input value={form.reliever_medication} onChange={e => update('reliever_medication', e.target.value)} placeholder="e.g. Ventolin 2-4 puffs via spacer" />
              </div>
              <div className="space-y-1.5">
                <Label>Preventer Medication</Label>
                <Input value={form.preventer_medication} onChange={e => update('preventer_medication', e.target.value)} placeholder="e.g. Flixotide 1 puff morning & night" />
              </div>
            </div>
          )}

          {form.condition_type === 'Dietary' && (
            <div className="space-y-1.5">
              <Label>Dietary Requirement</Label>
              <Input value={form.dietary_requirement} onChange={e => update('dietary_requirement', e.target.value)} placeholder="e.g. Halal, No Dairy, Vegetarian" />
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Parent / Guardian</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Parent Name</Label>
              <Input value={form.parent_name} onChange={e => update('parent_name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.parent_email} onChange={e => update('parent_email', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.parent_phone} onChange={e => update('parent_phone', e.target.value)} />
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Notes</h2>
          <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={3} placeholder="Any additional notes..." />
        </Card>

        <div className="flex justify-between items-center sticky bottom-0 bg-background border-t pt-4 pb-2 -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <Button type="submit" disabled={mutation.isPending} className="gap-2">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEditing ? 'Update Child' : 'Save Child'}
          </Button>
        </div>
      </form>
    </div>
  );
}