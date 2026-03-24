import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function SendToStaffModal({ open, onClose, child }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState([]);

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staffMembers'],
    queryFn: () => base44.entities.StaffMember.list(),
    enabled: open,
  });

  const activeStaff = staff.filter(s => s.active !== false);

  const { data: existingRequests = [] } = useQuery({
    queryKey: ['staffRequests', child?.id],
    queryFn: () => base44.entities.StaffSignoffRequest.filter({ child_id: child.id }),
    enabled: open && !!child?.id,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const signoffUrl = `${window.location.origin}/staff-acknowledgement?child=${child.id}`;
      const childName = `${child.first_name} ${child.last_name}`;

      await Promise.all(selected.map(async (staffId) => {
        const s = activeStaff.find(x => x.id === staffId);
        if (!s) return;

        // Create request record
        await base44.entities.StaffSignoffRequest.create({
          child_id: child.id,
          staff_member_id: s.id,
          staff_name: s.full_name,
          staff_email: s.email,
          staff_role: s.role || '',
          sent_date: today,
          status: 'Pending',
        });

        // Send email
        await base44.integrations.Core.SendEmail({
          from_name: 'First Steps OSHC',
          to: s.email,
          subject: `Action Required: Please sign off on ${childName}'s Risk Minimisation Plan`,
          body: `Dear ${s.full_name},\n\nPlease review and sign the Risk Minimisation Plan for ${childName}.\n\nClick the link below to complete your acknowledgement:\n\n${signoffUrl}\n\nThis acknowledgement confirms you have read the medical conditions policy, are informed about the child's condition, and know the location of all relevant plans and medications.\n\nKind regards,\nFirst Steps Before & After School Care`,
        });
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffRequests', child.id] });
      queryClient.invalidateQueries({ queryKey: ['staffSignoffs', child.id] });
      toast.success(`Sign-off request sent to ${selected.length} staff member${selected.length > 1 ? 's' : ''}`);
      setSelected([]);
      onClose();
    },
    onError: () => toast.error('Failed to send some emails'),
  });

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const alreadySent = (staffId) => existingRequests.some(r => r.staff_member_id === staffId && r.status === 'Pending');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Sign-off Requests</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Select staff to email the sign-off link for <strong>{child?.first_name} {child?.last_name}</strong>.</p>

        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : activeStaff.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-6">No active staff members. Add staff in the Staff section first.</div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {activeStaff.map(s => {
              const sent = alreadySent(s.id);
              const checked = selected.includes(s.id);
              return (
                <label key={s.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${sent ? 'opacity-50 cursor-not-allowed bg-gray-50' : checked ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={checked}
                    disabled={sent}
                    onChange={() => toggle(s.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{s.full_name}</p>
                    <p className="text-xs text-muted-foreground">{s.role && `${s.role} · `}{s.email}</p>
                  </div>
                  {sent && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex-shrink-0">Pending</span>}
                </label>
              );
            })}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={selected.length === 0 || sendMutation.isPending}
            onClick={() => sendMutation.mutate()}
            className="gap-2"
          >
            {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Send to {selected.length > 0 ? `${selected.length} Staff` : 'Staff'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}