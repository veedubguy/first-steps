import React from 'react';
import { Card } from '@/components/ui/card';
import StatusBadge from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { MessageSquare, Mail, Phone, Users } from 'lucide-react';

const methodIcons = {
  Email: Mail,
  Phone: Phone,
  Meeting: Users,
};

export default function CommunicationsList({ communications }) {
  if (!communications || communications.length === 0) {
    return (
      <Card className="p-8 text-center">
        <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No communications logged</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden divide-y">
      {communications.map(comm => {
        const Icon = methodIcons[comm.method] || MessageSquare;
        const awaitingResponse = comm.response_required === 'Yes' && comm.response_received !== 'Yes';
        return (
          <div key={comm.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <p className="font-medium text-sm">{comm.subject}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {awaitingResponse && <StatusBadge type="awaiting_response" />}
                <span className="text-xs text-muted-foreground">
                  {comm.date && format(new Date(comm.date), 'dd MMM yyyy')}
                </span>
              </div>
            </div>
            {comm.summary && <p className="text-sm text-muted-foreground">{comm.summary}</p>}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {comm.sent_by && <span>By: {comm.sent_by}</span>}
              {comm.follow_up_required === 'Yes' && (
                <span className="text-amber-600 font-medium">Follow-up needed</span>
              )}
            </div>
            {comm.notes && <p className="text-xs text-muted-foreground border-t pt-2 mt-2">{comm.notes}</p>}
          </div>
        );
      })}
    </Card>
  );
}