import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2, Upload, CheckCircle, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// ─── AI Import Helper ────────────────────────────────────────────────────────

async function extractPlanFromDocument(file) {
  // Convert HEIC/HEIF to JPEG — iPhones love sending these
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif'
    || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
  if (isHeic) {
    const heic2any = (await import('heic2any')).default;
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    file = new File([converted], file.name.replace(/\.hei[cf]$/i, '.jpg'), { type: 'image/jpeg' });
  }

  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const isPdf = file.type === 'application/pdf';
  const contentBlock = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
    : { type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } };

  const prompt = `You are reading an Australian ASCIA medical action plan for a child. These are standardised documents used in Australian childcare and schools.

Common plan types you may see:
- RED plan = ASCIA Action Plan for Anaphylaxis (most severe - has adrenaline device e.g. EpiPen, Anapen, Jext, neffy)
- GREEN plan = ASCIA Action Plan for Allergic Reactions (no adrenaline device)
- DARK GREEN plan = ASCIA Action Plan for Drug/Medication Allergy
- ORANGE plan = ASCIA First Aid Plan for Anaphylaxis (generic, no personal details)
- FPIES plan = Food Protein Induced Enterocolitis Syndrome

Extract all relevant information and return ONLY a JSON object with these exact fields (use null if not found):
{
  "trigger": "confirmed allergens or triggers e.g. 'Peanut, Tree nuts' or 'Bee sting'",
  "exposure_risk": "how exposure might occur e.g. 'accidental ingestion of peanut products'",
  "reaction": "signs and symptoms listed on the plan e.g. 'Hives, swelling, vomiting, difficulty breathing'",
  "risk_level": "High if RED anaphylaxis plan or adrenaline device prescribed, Medium if GREEN allergic reactions plan, Low otherwise",
  "control_measures": "avoidance and management steps listed on the plan",
  "medications": [
    {"name": "full medication instruction e.g. 'EpiPen Jr - give immediately for anaphylaxis' or 'Cetirizine 5mg - give for mild reaction'"}
  ],
  "review_date": "YYYY-MM-DD if a review date is visible on the plan, otherwise null",
  "status": "Active"
}

Important extraction tips:
- For RED plans: medications should include the adrenaline device first (e.g. EpiPen, Anapen), then any antihistamines
- For GREEN plans: medications are typically antihistamines only
- The trigger field should list the specific confirmed allergens written on the plan
- If you can see a child's weight or age that affects dosing, include it in the medication name
- Return ONLY valid JSON. No explanation, no markdown, no backticks.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [contentBlock, { type: 'text', text: prompt }]
      }]
    })
  });

  const data = await response.json();
  const text = data.content?.find(b => b.type === 'text')?.text || '';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// ─── Import Review Panel ─────────────────────────────────────────────────────

function ImportReviewPanel({ extracted, onConfirm, onDiscard }) {
  const [draft, setDraft] = useState(extracted);
  const updateDraft = (field, value) => setDraft(prev => ({ ...prev, [field]: value }));

  return (
    <Card className="border-2 border-blue-200 bg-blue-50/50 p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-semibold text-blue-900">Document Extracted — Please Review</h3>
            <p className="text-xs text-blue-600 mt-0.5">Check the fields below before applying to the form.</p>
          </div>
        </div>
        <button onClick={onDiscard} className="text-blue-400 hover:text-blue-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="space-y-1">
          <Label className="text-xs text-blue-700">Trigger</Label>
          <Input value={draft.trigger || ''} onChange={e => updateDraft('trigger', e.target.value)} className="bg-white text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-blue-700">Risk Level</Label>
          <Select value={draft.risk_level || 'Medium'} onValueChange={v => updateDraft('risk_level', v)}>
            <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs text-blue-700">Exposure Risk</Label>
          <Textarea value={draft.exposure_risk || ''} onChange={e => updateDraft('exposure_risk', e.target.value)} rows={2} className="bg-white text-sm" />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs text-blue-700">Reaction</Label>
          <Textarea value={draft.reaction || ''} onChange={e => updateDraft('reaction', e.target.value)} rows={2} className="bg-white text-sm" />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs text-blue-700">Control Measures</Label>
          <Textarea value={draft.control_measures || ''} onChange={e => updateDraft('control_measures', e.target.value)} rows={2} className="bg-white text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-blue-700">Review Date</Label>
          <Input type="date" value={draft.review_date || ''} onChange={e => updateDraft('review_date', e.target.value)} className="bg-white text-sm" />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-blue-700">Medications</Label>
        {(draft.medications || []).map((med, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              className="flex-1 bg-white text-sm"
              value={med.name}
              onChange={e => {
                const updated = [...(draft.medications || [])];
                updated[idx] = { name: e.target.value };
                updateDraft('medications', updated);
              }}
            />
            <button
              type="button"
              onClick={() => updateDraft('medications', draft.medications.filter((_, i) => i !== idx))}
              className="text-red-400 hover:text-red-600 font-bold text-lg leading-none"
            >×</button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => updateDraft('medications', [...(draft.medications || []), { name: '' }])}>
          + Add Medication
        </Button>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" onClick={() => onConfirm(draft)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
          <CheckCircle className="w-4 h-4" />
          Apply to Form
        </Button>
        <Button type="button" variant="outline" onClick={onDiscard}>Discard</Button>
      </div>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RiskPlanForm() {
  const { id: childId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const urlParams = new URLSearchParams(window.location.search);
  const editPlanId = urlParams.get('planId');

  const [form, setForm] = useState({
    child_id: childId,
    trigger: '',
    exposure_risk: '',
    reaction: '',
    risk_level: 'Medium',
    likelihood: '',
    consequence: '',
    control_measures: '',
    medications: [],
    review_date: '',
    status: 'Active',
  });

  const [importState, setImportState] = useState('idle');
  const [importError, setImportError] = useState('');
  const [extractedData, setExtractedData] = useState(null);

  const { data: existingPlans = [], isLoading: loadingExisting } = useQuery({
    queryKey: ['riskPlan-edit', editPlanId],
    queryFn: () => base44.entities.RiskPlans.filter({ id: editPlanId }),
    enabled: !!editPlanId,
  });

  const { data: existingMedRecords = [] } = useQuery({
    queryKey: ['riskPlan-meds', editPlanId],
    queryFn: () => base44.entities.Medication.filter({ risk_plan_id: editPlanId }),
    enabled: !!editPlanId,
  });

  const { data: childData = [] } = useQuery({
    queryKey: ['child-riskform', childId],
    queryFn: () => base44.entities.Children.filter({ id: childId }),
    enabled: !!childId && !editPlanId,
  });

  useEffect(() => {
    if (existingPlans[0]) {
      const p = existingPlans[0];
      const meds = (p.medications && p.medications.length > 0)
        ? p.medications
        : existingMedRecords.map(m => ({ name: m.name }));
      setForm({
        child_id: childId,
        trigger: p.trigger || '',
        exposure_risk: p.exposure_risk || '',
        reaction: p.reaction || '',
        risk_level: p.risk_level || 'Medium',
        likelihood: p.likelihood || '',
        consequence: p.consequence || '',
        control_measures: p.control_measures || '',
        medications: meds,
        review_date: p.review_date || '',
        status: p.status || 'Active',
      });
    } else if (childData[0] && !editPlanId) {
      const child = childData[0];
      const extractedMeds = [];
      if (child.reliever_medication) extractedMeds.push({ name: child.reliever_medication });
      if (child.preventer_medication) extractedMeds.push({ name: child.preventer_medication });
      setForm(prev => ({
        ...prev,
        trigger: child.trigger || prev.trigger,
        reaction: child.reaction || prev.reaction,
        control_measures: child.control_measures || prev.control_measures,
        medications: extractedMeds.length > 0 ? extractedMeds : prev.medications,
      }));
    }
  }, [existingPlans, existingMedRecords, childData, editPlanId]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      let riskPlan;
      if (editPlanId) {
        riskPlan = await base44.entities.RiskPlans.update(editPlanId, data);
        const existingMeds = await base44.entities.Medication.filter({ risk_plan_id: editPlanId });
        for (const med of existingMeds) {
          await base44.entities.Medication.delete(med.id);
        }
        for (const med of (data.medications || [])) {
          if (med.name) {
            await base44.entities.Medication.create({
              child_id: childId,
              risk_plan_id: editPlanId,
              name: med.name,
              at_service: false,
              at_home: false,
              parent_confirmed: false,
            });
          }
        }
      } else {
        riskPlan = await base44.entities.RiskPlans.create(data);
        if (data.medications && data.medications.length > 0) {
          for (const med of data.medications) {
            if (med.name) {
              await base44.entities.Medication.create({
                child_id: childId,
                risk_plan_id: riskPlan.id,
                name: med.name,
                at_service: false,
                at_home: false,
                parent_confirmed: false,
              });
            }
          }
        }
      }
      return riskPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riskPlans', childId] });
      queryClient.invalidateQueries({ queryKey: ['medications', childId] });
      toast.success(editPlanId ? 'Risk plan updated' : 'Risk plan created');
      navigate(`/children/${childId}`);
    },
  });

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    const isHeicByName = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
    if (!allowed.includes(file.type) && !isHeicByName) {
      setImportError('Please upload a PDF or image file (JPG, PNG, WEBP, HEIC).');
      setImportState('error');
      return;
    }

    setImportState('loading');
    setImportError('');

    try {
      const result = await extractPlanFromDocument(file);
      setExtractedData(result);
      setImportState('review');
    } catch (err) {
      console.error(err);
      setImportError('Could not read the document. Please try a clearer image or PDF.');
      setImportState('error');
    }
  };

  const handleConfirmImport = (data) => {
    setForm(prev => ({
      ...prev,
      trigger: data.trigger || prev.trigger,
      exposure_risk: data.exposure_risk || prev.exposure_risk,
      reaction: data.reaction || prev.reaction,
      risk_level: data.risk_level || prev.risk_level,
      control_measures: data.control_measures || prev.control_measures,
      medications: data.medications?.length > 0 ? data.medications : prev.medications,
      review_date: data.review_date || prev.review_date,
      status: data.status || prev.status,
    }));
    setImportState('idle');
    setExtractedData(null);
    toast.success('Document data applied to form');
  };

  const handleDiscardImport = () => {
    setImportState('idle');
    setExtractedData(null);
    setImportError('');
  };

  if (loadingExisting) return <div className="p-8"><Skeleton className="h-96" /></div>;

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/children/${childId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-bold">{editPlanId ? 'Edit Risk Plan' : 'Create Risk Plan'}</h1>

        <div className="ml-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={importState === 'loading'}
            onClick={() => fileInputRef.current?.click()}
          >
            {importState === 'loading'
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Reading document...</>
              : <><Upload className="w-4 h-4" /> Import from Document</>
            }
          </Button>
        </div>
      </div>

      {importState === 'error' && (
        <Card className="border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Import failed</p>
            <p className="text-xs text-red-600 mt-0.5">{importError}</p>
          </div>
          <button onClick={handleDiscardImport} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </Card>
      )}

      {importState === 'review' && extractedData && (
        <ImportReviewPanel
          extracted={extractedData}
          onConfirm={handleConfirmImport}
          onDiscard={handleDiscardImport}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Risk Assessment</h2>
          <div className="space-y-1.5">
            <Label>Trigger *</Label>
            <Input value={form.trigger} onChange={e => update('trigger', e.target.value)} placeholder="What triggers the reaction?" required />
          </div>
          <div className="space-y-1.5">
            <Label>Exposure Risk</Label>
            <Textarea value={form.exposure_risk} onChange={e => update('exposure_risk', e.target.value)} placeholder="How might exposure occur?" rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Reaction</Label>
            <Textarea value={form.reaction} onChange={e => update('reaction', e.target.value)} placeholder="Expected reaction if exposed" rows={2} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Risk Level *</Label>
              <Select value={form.risk_level} onValueChange={v => update('risk_level', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => update('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Review Due">Review Due</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Likelihood</Label>
              <p className="text-xs text-muted-foreground">How likely is exposure to occur?</p>
              <Select value={form.likelihood} onValueChange={v => update('likelihood', v)}>
                <SelectTrigger><SelectValue placeholder="Select likelihood" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rare">Rare</SelectItem>
                  <SelectItem value="Unlikely">Unlikely</SelectItem>
                  <SelectItem value="Possible">Possible</SelectItem>
                  <SelectItem value="Likely">Likely</SelectItem>
                  <SelectItem value="Almost Certain">Almost Certain</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Consequence</Label>
              <p className="text-xs text-muted-foreground">How severe if exposure occurs?</p>
              <Select value={form.consequence} onValueChange={v => update('consequence', v)}>
                <SelectTrigger><SelectValue placeholder="Select consequence" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Insignificant">Insignificant</SelectItem>
                  <SelectItem value="Minor">Minor</SelectItem>
                  <SelectItem value="Moderate">Moderate</SelectItem>
                  <SelectItem value="Major">Major</SelectItem>
                  <SelectItem value="Extreme">Extreme</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Control & Medication</h2>
          <div className="space-y-1.5">
            <Label>Control Measures</Label>
            <Textarea value={form.control_measures} onChange={e => update('control_measures', e.target.value)} placeholder="Steps to minimise risk" rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Medications</Label>
            <p className="text-xs text-muted-foreground">Add each medication individually. These will be confirmed with the parent.</p>
            {(form.medications || []).map((med, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-muted/40 rounded-lg px-3 py-2">
                <Input
                  className="flex-1 bg-white"
                  value={med.name}
                  onChange={e => {
                    const updated = [...(form.medications || [])];
                    updated[idx] = { ...updated[idx], name: e.target.value };
                    update('medications', updated);
                  }}
                  placeholder="e.g. Ventolin 2-4 puffs via spacer"
                />
                <button
                  type="button"
                  onClick={() => update('medications', (form.medications || []).filter((_, i) => i !== idx))}
                  className="text-red-400 hover:text-red-600 text-lg font-bold leading-none"
                >×</button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => update('medications', [...(form.medications || []), { name: '' }])}
            >+ Add Medication</Button>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Review</h2>
          <div className="space-y-1.5">
            <Label>Review Date</Label>
            <Input type="date" value={form.review_date} onChange={e => update('review_date', e.target.value)} />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending} className="gap-2">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editPlanId ? 'Update Risk Plan' : 'Save Risk Plan'}
          </Button>
        </div>
      </form>
    </div>
  );
}