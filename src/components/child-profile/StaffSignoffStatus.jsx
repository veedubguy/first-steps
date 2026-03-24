import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { CheckCircle, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';

export default function StaffSignoffStatus({ childId }) {
  const { data: requests = [] } = useQuery({
    queryKey: ['staffRequests', childId],
    queryFn: () => base44.entities.StaffSignoffRequest.filter({ child_id: childId }, '-sent_date'),
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
            <div className="text-right text-xs text-muted-foreground">
              {r.status === 'Signed' && r.signed_date
                ? <span className="text-green-600 font-medium">Signed {format(new Date(r.signed_date), 'dd/MM/yy')}</span>
                : <span>Sent {r.sent_date ? format(new Date(r.sent_date), 'dd/MM/yy') : ''}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}