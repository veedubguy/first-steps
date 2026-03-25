import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Loader2, Send, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';

const CENTRE_ITEMS = [
  { key: 'centre_check_1', label: 'Nominated Supervisor will ensure all educators, staff, volunteers and students understand the medical conditions for this child.' },
  { key: 'centre_check_2', label: 'Medical management plan is fully completed and accessible for all educators.' },
  { key: 'centre_check_3', label: 'The risk minimisation plan is developed and completed in consultation with the child\'s guardians.' },
  { key: 'centre_check_4', label: 'The nominated supervisor will communicate with educators of any changes to the child\'s medical condition.' },
  { key: 'centre_check_5', label: 'Medication will be stored out of reach of children in a recognisable, known location. Medication will be checked to ensure it meets policy requirements.' },
  { key: 'centre_check_6', label: 'Nominated supervisor will communicate attendance patterns and any changes to educators.' },
  { key: 'centre_check_7', label: 'The nominated supervisor will ensure the medical management plan, risk minimisation and communication plan are reviewed annually, or when changes are identified.' },
];

export default function CentreCommPlan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [staffName, setStaffName] = useState('');
  const [checks, setChecks] = useState({
    centre_check_1: false, centre_check_2: false, centre_check_3: false,
    centre_check_4: false, centre_check_5: false, centre_check_6: false,
    centre_check_7: false,
  });

  const { data: children = [], isLoading: lc } = useQuery({
    queryKey: ['child', id],
    queryFn: () => base44.entities.Children.filter({ id }),
  });
  const child = children[0];

  const { data: commPlans = [], isLoading: lp } = useQuery({
    queryKey: ['commPlan', id],
    queryFn: () => base44.entities.CommunicationPlan.filter({ child_id: id }),
  });
  const existingPlan = commPlans[0];

  const allChecked = Object.values(checks).every(Boolean);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!staffName.trim()) throw new Error('Please enter your name');
      if (!allChecked) throw new Error('Please complete all checklist items');

      const data = {
        child_id: id,
        centre_staff_name: staffName,
        centre_completed_date: new Date().toISOString().split('T')[0],
        ...checks,
        status: 'Centre Pending',
      };

      if (existingPlan) {
        return base44.entities.CommunicationPlan.update(existingPlan.id, data);
      }
      return base44.entities.CommunicationPlan.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commPlan', id] });
      toast.success('Centre checklist saved');
    },
    onError: (e) => toast.error(e.message),
  });

  const sendToParentMutation = useMutation({
    mutationFn: async () => {
      if (!staffName.trim()) throw new Error('Please enter your name');
      if (!allChecked) throw new Error('Please complete all checklist items first');
      if (!child?.parent_email) throw new Error('No parent email on record');

      // Save/update the plan
      const data = {
        child_id: id,
        centre_staff_name: staffName,
        centre_completed_date: new Date().toISOString().split('T')[0],
        ...checks,
        status: 'Comm Pack Sent',
        comm_pack_sent_date: new Date().toISOString().split('T')[0],
      };

      let planId;
      if (existingPlan) {
        await base44.entities.CommunicationPlan.update(existingPlan.id, data);
        planId = existingPlan.id;
      } else {
        const created = await base44.entities.CommunicationPlan.create(data);
        planId = created.id;
      }

      const commUrl = `${window.location.origin}/parent-comm-plan?child=${id}&plan=${planId}`;

      await base44.integrations.Core.SendEmail({
        to: child.parent_email,
        subject: `Action Required: Please review and sign ${child.first_name}'s Communication Plan`,
        body: `Dear ${child.parent_name || 'Parent/Guardian'},\n\nThank you for returning the Risk Minimisation Plan for ${child.first_name} ${child.last_name}.\n\nWe have now prepared the Communication Plan which outlines the responsibilities of both the centre and your family. Please review and sign this document at the link below:\n\n${commUrl}\n\nThis is the final step to complete your child's medical management documentation.\n\nKind regards,\nFirst Steps Before & After School Care`,
      });

      await base44.entities.CommunicationLog.create({
        child_id: id,
        date: new Date().toISOString().split('T')[0],
        method: 'Email',
        subject: 'Communication Plan sent for parent acknowledgement',
        summary: `Communication Pack emailed to ${child.parent_email}. Centre checklist completed by ${staffName}.`,
        sent_by: staffName,
        response_required: 'Yes',
        response_received: 'No',
        follow_up_required: 'Yes',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commPlan', id] });
      queryClient.invalidateQueries({ queryKey: ['comms', id] });
      toast.success(`Communication Pack emailed to ${child?.parent_email}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const copyLink = () => {
    const planId = existingPlan?.id || '';
    const url = `${window.location.origin}/parent-comm-plan?child=${id}${planId ? `&plan=${planId}` : ''}`;
    navigator.clipboard.writeText(url);
    toast.success('Parent comm plan link copied');
  };

  if (lc || lp) return <div className="space-y-4 p-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/children/${id}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Communication Plan — Centre Checklist</h1>
          {child && <p className="text-sm text-muted-foreground">{child.first_name} {child.last_name}</p>}
        </div>
      </div>

      {existingPlan?.status === 'Complete' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <p className="text-sm text-green-800 font-medium">Communication Plan is fully complete — parent has signed.</p>
        </div>
      )}

      {existingPlan?.status === 'Comm Pack Sent' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 font-medium">Communication Pack sent to parent on {existingPlan.comm_pack_sent_date ? format(new Date(existingPlan.comm_pack_sent_date), 'dd/MM/yyyy') : '—'}. Awaiting parent signature.</p>
        </div>
      )}

      <Card className="p-6 space-y-5">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Stage 2 — Centre Obligations</h2>
        <p className="text-sm text-muted-foreground">Tick each item to confirm the centre has fulfilled these communication obligations.</p>

        <div className="space-y-3">
          {CENTRE_ITEMS.map((item, i) => (
            <label key={item.key} className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary cursor-pointer"
                checked={checks[item.key]}
                onChange={e => setChecks(prev => ({ ...prev, [item.key]: e.target.checked }))}
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                <span className="font-medium text-gray-500 mr-1">{i + 1}.</span>
                {item.label}
              </span>
            </label>
          ))}
        </div>

        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name (Admin Staff) *</label>
          <Input
            placeholder="Full name of completing staff member"
            value={staffName}
            onChange={e => setStaffName(e.target.value)}
          />
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Save Checklist
        </Button>

        <Button
          onClick={() => sendToParentMutation.mutate()}
          disabled={sendToParentMutation.isPending || !child?.parent_email}
          title={!child?.parent_email ? 'No parent email on record' : ''}
          className="gap-2"
        >
          {sendToParentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Save & Email Comm Pack to Parent
        </Button>

        <Button variant="outline" onClick={copyLink} className="gap-2">
          <Link2 className="w-4 h-4" /> Copy Parent Link
        </Button>
      </div>
    </div>
  );
}