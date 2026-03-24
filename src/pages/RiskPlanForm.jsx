import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function RiskPlanForm() {
  const { id: childId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({
    child_id: childId,
    trigger: '',
    exposure_risk: '',
    reaction: '',
    risk_level: 'Medium',
    control_measures: '',
    medication_required: '',
    medication_location: '',
    review_date: '',
    status: 'Active',
  });

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.RiskPlans.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riskPlans', childId] });
      toast({ title: 'Risk plan created' });
      navigate(`/children/${childId}`);
    },
  });

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
        <h1 className="text-xl font-bold">Create Risk Plan</h1>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Medication Required</Label>
              <Input value={form.medication_required} onChange={e => update('medication_required', e.target.value)} placeholder="e.g. EpiPen, Antihistamine" />
            </div>
            <div className="space-y-1.5">
              <Label>Medication Location</Label>
              <Input value={form.medication_location} onChange={e => update('medication_location', e.target.value)} placeholder="e.g. First Aid Room" />
            </div>
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
            Save Risk Plan
          </Button>
        </div>
      </form>
    </div>
  );
}