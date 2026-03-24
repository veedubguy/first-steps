import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, FileText, Loader2, Sparkles, CheckCircle, ExternalLink, X } from 'lucide-react';
import { toast } from 'sonner';

export default function DoctorPlanUpload({ child, onUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Save the file URL to the child record
      await base44.entities.Children.update(child.id, {
        doctor_plan_url: file_url,
        doctor_plan_filename: file.name,
      });

      toast.success('Doctor plan uploaded');
      onUpdated();

      // Now extract info
      setUploading(false);
      setExtracting(true);

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are reviewing a medical action plan or doctor's letter for a child at an OSHC (Outside School Hours Care) service. The plan may be for food allergies, dietary requirements, or asthma.
Extract the following information from this document:
- condition_type (one of: "Allergy", "Dietary", "Asthma")
- allergens (comma-separated list of allergens, e.g. "Peanuts, Tree Nuts" — only for allergy plans)
- severity (one of: "Low", "Moderate", "Anaphylaxis" — only for allergy plans)
- asthma_severity (one of: "Mild", "Moderate", "Severe" — only for asthma plans)
- asthma_triggers (comma-separated triggers e.g. "Exercise, Cold air, Dust" — only for asthma plans)
- reliever_medication (e.g. "Ventolin 2-4 puffs via spacer" — for asthma)
- preventer_medication (e.g. "Flixotide 1 puff twice daily" — for asthma, or empty string)
- trigger (what triggers the reaction for allergy — e.g. "Ingestion or contact with peanuts")
- reaction (expected reaction for allergy — e.g. "Hives, vomiting, anaphylaxis")
- control_measures (key steps to minimise risk)
- medication_required (medication name and dose for allergy e.g. "EpiPen 0.3mg" or empty string)
- medication_location (where medication is stored, or empty string if none)
- dietary_requirement (if dietary plan, e.g. "Halal, No Dairy", otherwise empty string)
- notes (any other important notes from the plan)

Return only the extracted data. If a field cannot be determined, use an empty string.`,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            condition_type: { type: 'string' },
            allergens: { type: 'string' },
            severity: { type: 'string' },
            asthma_severity: { type: 'string' },
            asthma_triggers: { type: 'string' },
            reliever_medication: { type: 'string' },
            preventer_medication: { type: 'string' },
            trigger: { type: 'string' },
            reaction: { type: 'string' },
            control_measures: { type: 'string' },
            medication_required: { type: 'string' },
            medication_location: { type: 'string' },
            dietary_requirement: { type: 'string' },
            notes: { type: 'string' },
          },
        },
      });

      setExtracted(result);
    } catch (err) {
      toast.error('Upload or extraction failed');
      console.error(err);
    } finally {
      setUploading(false);
      setExtracting(false);
    }
  };

  const applyExtracted = async () => {
    const updates = {};
    if (extracted.condition_type && ['Allergy', 'Dietary', 'Asthma'].includes(extracted.condition_type)) updates.condition_type = extracted.condition_type;
    if (extracted.allergens) updates.allergens = extracted.allergens;
    if (extracted.severity && ['Low', 'Moderate', 'Anaphylaxis'].includes(extracted.severity)) updates.severity = extracted.severity;
    if (extracted.dietary_requirement) updates.dietary_requirement = extracted.dietary_requirement;
    if (extracted.asthma_triggers) updates.asthma_triggers = extracted.asthma_triggers;
    if (extracted.asthma_severity && ['Mild', 'Moderate', 'Severe'].includes(extracted.asthma_severity)) updates.asthma_severity = extracted.asthma_severity;
    if (extracted.reliever_medication) updates.reliever_medication = extracted.reliever_medication;
    if (extracted.preventer_medication) updates.preventer_medication = extracted.preventer_medication;
    if (extracted.notes) updates.notes = extracted.notes;

    await base44.entities.Children.update(child.id, updates);

    // Also create a risk plan if we have enough info
    if (extracted.trigger || extracted.reaction || extracted.control_measures) {
      await base44.entities.RiskPlans.create({
        child_id: child.id,
        trigger: extracted.trigger || '',
        exposure_risk: '',
        reaction: extracted.reaction || '',
        risk_level: extracted.severity === 'Anaphylaxis' ? 'High' : extracted.severity === 'Moderate' ? 'Medium' : 'Low',
        control_measures: extracted.control_measures || '',
        medication_required: extracted.medication_required || '',
        medication_location: extracted.medication_location || '',
        status: 'Active',
      });
    }

    toast.success('Child profile and risk plan updated from doctor plan');
    setExtracted(null);
    onUpdated();
  };

  const removePlan = async () => {
    await base44.entities.Children.update(child.id, { doctor_plan_url: '', doctor_plan_filename: '' });
    toast.success('Doctor plan removed');
    onUpdated();
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Doctor / ASCIA Action Plan
        </h3>
      </div>

      {child.doctor_plan_url ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800">Plan uploaded</p>
              <p className="text-xs text-green-600 truncate">{child.doctor_plan_filename || 'Doctor plan'}</p>
            </div>
            <div className="flex gap-1">
              <a href={child.doctor_plan_url} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-700">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={removePlan}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <label className="cursor-pointer">
            <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileChange} />
            <Button variant="outline" size="sm" className="gap-2 w-full" asChild>
              <span>
                {uploading || extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading ? 'Uploading...' : extracting ? 'Extracting info with AI...' : 'Replace Plan'}
              </span>
            </Button>
          </label>
        </div>
      ) : (
        <label className="cursor-pointer block">
          <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileChange} disabled={uploading || extracting} />
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary hover:bg-primary/5 transition-colors">
            {uploading || extracting ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">{uploading ? 'Uploading...' : 'Extracting info with AI...'}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-6 h-6 text-muted-foreground" />
                <p className="text-sm font-medium">Upload Doctor Plan</p>
                <p className="text-xs text-muted-foreground">PDF, PNG, or JPG — AI will extract key info automatically</p>
              </div>
            )}
          </div>
        </label>
      )}

      {/* Extracted info review panel */}
      {extracted && (
        <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <p className="text-sm font-semibold text-blue-800">AI extracted the following — review and apply?</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {extracted.condition_type && <div><span className="font-medium text-blue-700">Condition:</span> {extracted.condition_type}</div>}
            {extracted.allergens && <div><span className="font-medium text-blue-700">Allergens:</span> {extracted.allergens}</div>}
            {extracted.severity && <div><span className="font-medium text-blue-700">Severity:</span> {extracted.severity}</div>}
            {extracted.dietary_requirement && <div><span className="font-medium text-blue-700">Dietary:</span> {extracted.dietary_requirement}</div>}
            {extracted.trigger && <div className="sm:col-span-2"><span className="font-medium text-blue-700">Trigger:</span> {extracted.trigger}</div>}
            {extracted.reaction && <div className="sm:col-span-2"><span className="font-medium text-blue-700">Reaction:</span> {extracted.reaction}</div>}
            {extracted.medication_required && <div><span className="font-medium text-blue-700">Medication:</span> {extracted.medication_required}</div>}
            {extracted.medication_location && <div><span className="font-medium text-blue-700">Location:</span> {extracted.medication_location}</div>}
            {extracted.control_measures && <div className="sm:col-span-2"><span className="font-medium text-blue-700">Control Measures:</span> {extracted.control_measures}</div>}
            {extracted.notes && <div className="sm:col-span-2"><span className="font-medium text-blue-700">Notes:</span> {extracted.notes}</div>}
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="gap-2" onClick={applyExtracted}>
              <CheckCircle className="w-3.5 h-3.5" /> Apply to Profile & Create Risk Plan
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setExtracted(null)}>Dismiss</Button>
          </div>
        </div>
      )}
    </Card>
  );
}