import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, CheckCircle, FileText, ExternalLink } from 'lucide-react';

export default function AiConfirmStep({ form, onChange, uploadedFile }) {
  const update = (field, value) => onChange({ ...form, [field]: value });

  return (
    <div className="space-y-5">
      {/* AI notice */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold text-blue-800">AI has pre-filled the form below</p>
          <p className="text-blue-600 text-xs mt-0.5">Review each field carefully and correct anything that looks wrong before saving.</p>
        </div>
        {uploadedFile && (
          <a href={uploadedFile.url} target="_blank" rel="noopener noreferrer" className="ml-auto shrink-0">
            <div className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <FileText className="w-3.5 h-3.5" />
              View plan
              <ExternalLink className="w-3 h-3" />
            </div>
          </a>
        )}
      </div>

      {/* Basic Info */}
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Child Details</h2>
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

      {/* Condition */}
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Medical Condition</h2>
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
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Asthma Triggers</Label>
                <Input value={form.asthma_triggers} onChange={e => update('asthma_triggers', e.target.value)} placeholder="e.g. Exercise, Cold air, Dust" />
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
            </div>

            {/* Medications list */}
            <div className="space-y-2">
              <Label>Medications</Label>
              <p className="text-xs text-muted-foreground">Add each medication individually and indicate where it is used.</p>
              {(form.asthma_medications || []).map((med, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-muted/40 rounded-lg px-3 py-2">
                  <Input
                    className="flex-1 bg-white"
                    value={med.name}
                    onChange={e => {
                      const updated = [...(form.asthma_medications || [])];
                      updated[idx] = { ...updated[idx], name: e.target.value };
                      update('asthma_medications', updated);
                    }}
                    placeholder="e.g. Ventolin 2-4 puffs via spacer"
                  />
                  <label className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap cursor-pointer">
                    <input type="checkbox" checked={!!med.at_service} onChange={e => {
                      const updated = [...(form.asthma_medications || [])];
                      updated[idx] = { ...updated[idx], at_service: e.target.checked };
                      update('asthma_medications', updated);
                    }} className="rounded" />
                    At Service
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap cursor-pointer">
                    <input type="checkbox" checked={!!med.at_home} onChange={e => {
                      const updated = [...(form.asthma_medications || [])];
                      updated[idx] = { ...updated[idx], at_home: e.target.checked };
                      update('asthma_medications', updated);
                    }} className="rounded" />
                    At Home
                  </label>
                  <button type="button" onClick={() => {
                    const updated = (form.asthma_medications || []).filter((_, i) => i !== idx);
                    update('asthma_medications', updated);
                  }} className="text-red-400 hover:text-red-600 text-lg font-bold leading-none">×</button>
                </div>
              ))}
              <button type="button" onClick={() => update('asthma_medications', [...(form.asthma_medications || []), { name: '', at_service: false, at_home: false }])}
                className="text-sm text-primary hover:underline">
                + Add Medication
              </button>
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

      {/* Risk Plan fields */}
      {(form.trigger || form.reaction || form.control_measures || form.medication_required) && (
        <Card className="p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            Risk Plan Details
            <span className="text-xs font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full">Will create risk plan</span>
          </h2>
          <div className="space-y-1.5">
            <Label>Trigger</Label>
            <Input value={form.trigger} onChange={e => update('trigger', e.target.value)} placeholder="What triggers the reaction?" />
          </div>
          <div className="space-y-1.5">
            <Label>Reaction</Label>
            <Textarea value={form.reaction} onChange={e => update('reaction', e.target.value)} rows={2} placeholder="Expected reaction if exposed" />
          </div>
          <div className="space-y-1.5">
            <Label>Control Measures</Label>
            <Textarea value={form.control_measures} onChange={e => update('control_measures', e.target.value)} rows={2} placeholder="Steps to minimise risk" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Medication Required</Label>
              <Input value={form.medication_required} onChange={e => update('medication_required', e.target.value)} placeholder="e.g. EpiPen 0.3mg" />
            </div>
            <div className="space-y-1.5">
              <Label>Medication Location</Label>
              <Input value={form.medication_location} onChange={e => update('medication_location', e.target.value)} placeholder="e.g. First Aid Room" />
            </div>
          </div>
        </Card>
      )}

      {/* Parent info */}
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

      {/* Notes */}
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Notes</h2>
        <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={3} placeholder="Any additional notes..." />
      </Card>
    </div>
  );
}