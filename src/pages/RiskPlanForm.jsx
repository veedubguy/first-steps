import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function RiskPlanForm() {
  const { id: childId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const editPlanId = urlParams.get('planId');

  const [form, setForm] = useState({
    child_id: childId,
    trigger: '',
    exposure_risk: '',
    reaction: '',
    risk_level: 'Medium',
    control_measures: '',
    medications: [],
    review_date: '',
    status: 'Active',
  });

  const { data: existingPlans = [], isLoading: loadingExisting } = useQuery({
    queryKey: ['riskPlan-edit', editPlanId],
    queryFn: () => base44.entities.RiskPlans.filter({ id: editPlanId }),
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
      setForm({
        child_id: childId,
        trigger: p.trigger || '',
        exposure_risk: p.exposure_risk || '',
        reaction: p.reaction || '',
        risk_level: p.risk_level || 'Medium',
        control_measures: p.control_measures || '',
        medications: p.medications || [],
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
  }, [existingPlans, childData, editPlanId]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      let riskPlan;
      if (editPlanId) {
        riskPlan = await base44.entities.RiskPlans.update(editPlanId, data);
      } else {
        riskPlan = await base44.entities.RiskPlans.create(data);
        // Create Medication records for each medication in the plan
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
      </div>

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
                  onClick={() => {
                    const updated = (form.medications || []).filter((_, i) => i !== idx);
                    update('medications', updated);
                  }}
                  className="text-red-400 hover:text-red-600 text-lg font-bold leading-none"
                >
                  ×
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                update('medications', [...(form.medications || []), { name: '' }]);
              }}
            >
              + Add Medication
            </Button>
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