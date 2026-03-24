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
import { toast } from 'sonner';

export default function CommunicationForm() {
  const { id: childId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    child_id: childId,
    date: new Date().toISOString().split('T')[0],
    method: 'Email',
    subject: '',
    summary: '',
    sent_by: '',
    response_required: 'No',
    response_received: 'No',
    follow_up_required: 'No',
    notes: '',
  });

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.CommunicationLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comms', childId] });
      toast.success('Communication logged');
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
        <h1 className="text-xl font-bold">Log Communication</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Communication Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={e => update('date', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Method *</Label>
              <Select value={form.method} onValueChange={v => update('method', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Phone">Phone</SelectItem>
                  <SelectItem value="Meeting">Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Subject *</Label>
            <Input value={form.subject} onChange={e => update('subject', e.target.value)} placeholder="Brief subject line" required />
          </div>
          <div className="space-y-1.5">
            <Label>Summary</Label>
            <Textarea value={form.summary} onChange={e => update('summary', e.target.value)} placeholder="What was discussed?" rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Sent By</Label>
            <Input value={form.sent_by} onChange={e => update('sent_by', e.target.value)} placeholder="Staff member name" />
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Follow-up</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Response Required</Label>
              <Select value={form.response_required} onValueChange={v => update('response_required', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Response Received</Label>
              <Select value={form.response_received} onValueChange={v => update('response_received', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Follow-up Required</Label>
              <Select value={form.follow_up_required} onValueChange={v => update('follow_up_required', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} placeholder="Any additional notes..." />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending} className="gap-2">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Communication
          </Button>
        </div>
      </form>
    </div>
  );
}