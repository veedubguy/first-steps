import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Users, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function StaffSignoffStatus({ childId }) {
  const queryClient = useQueryClient();
  const { data: children = [] } = useQuery({
    queryKey: ['child', childId],
    queryFn: () => base44.entities.Children.filter({ id: childId }),
  });
  const child = children[0];

  const { data: requests = [] } = useQuery({
    queryKey: ['staffRequests', childId],
    queryFn: () => base44.entities.StaffSignoffRequest.filter({ child_id: childId }, '-sent_date'),
  });

  const resendMutation = useMutation({
    mutationFn: async (request) => {
      const signoffUrl = `${window.location.origin}/staff-acknowledgement?child=${childId}`;
      const childName = `${child.first_name} ${child.last_name}`;
      
      await base44.integrations.Core.SendEmail({
        from_name: 'First Steps OSHC',
        to: request.staff_email,
        subject: `Reminder: Please sign off on ${childName}'s Risk Minimisation Plan`,
        body: `Hi ${request.staff_name},\n\nThis is a reminder to please review and sign the Risk Minimisation Plan for ${childName}.\n\nClick the link below to complete your acknowledgement:\n\n${signoffUrl}\n\nThis acknowledgement confirms you have read the medical conditions policy, are informed about the child's condition, and know the location of all relevant plans and medications.\n\nKind regards,\nFirst Steps Before & After School Care`,
      });

      const today = format(new Date(), 'yyyy-MM-dd');
      await base44.entities.StaffSignoffRequest.update(request.id, { sent_date: today });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffRequests', childId] });
      toast.success('Reminder email sent');
    },
    onError: () => toast.error('Failed to send reminder email'),
  });

  // Deduplicate — show latest request per staff member
  const byStaff = {};
  requests.forEach(r => {
    if (!byStaff[r.staff_member_id] || r.sent_date > byStaff[r.staff_member_id].sent_date) {
      byStaff[r.staff_member_id] = r;
    }
  });
  const latest = Object.values(byStaff);

  if (latest.length === 0) {
    return (
      <Card className="p-4 text-center text-sm text-muted-foreground">
        <Users className="w-6 h-6 mx-auto mb-1 opacity-40" />
        No sign-off requests sent yet. Use "Send to Staff" to notify your team.
      </Card>
    );
  }

  const signed = latest.filter(r => r.status === 'Signed').length;
  const pending = latest.filter(r => r.status === 'Pending').length;

  return (
    <div className="space-y-2">
      <div className="flex gap-3 text-xs">
        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">{signed} signed</span>
        <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full">{pending} pending</span>
      </div>
      <div className="space-y-1.5">
        {latest.map(r => (
          <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border bg-card text-sm">
            <div className="flex items-center gap-2">
              {r.status === 'Signed'
                ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                : <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />}
              <div>
                <p className="font-medium">{r.staff_name}</p>
                {r.staff_role && <p className="text-xs text-muted-foreground">{r.staff_role}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right text-xs text-muted-foreground">
                {r.status === 'Signed' && r.signed_date
                  ? <span className="text-green-600 font-medium">Signed {format(new Date(r.signed_date), 'dd/MM/yy')}</span>
                  : <span>Sent {r.sent_date ? format(new Date(r.sent_date), 'dd/MM/yy') : ''}</span>}
              </div>
              {r.status === 'Pending' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resendMutation.mutate(r)}
                  disabled={resendMutation.isPending}
                  className="gap-1 whitespace-nowrap text-xs"
                >
                  <Mail className="w-3 h-3" />
                  Resend
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}