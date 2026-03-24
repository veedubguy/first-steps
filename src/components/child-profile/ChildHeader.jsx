import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Phone, Mail } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import { format } from 'date-fns';

export default function ChildHeader({ child }) {
  return (
    <Card className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold">{child.first_name} {child.last_name}</h2>
            <StatusBadge type={child.condition_type} />
            {child.condition_type === 'Asthma' && child.asthma_severity && <StatusBadge type={child.asthma_severity} />}
            {child.condition_type !== 'Asthma' && child.severity && <StatusBadge type={child.severity} />}
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            {child.child_id && <p>ID: {child.child_id}</p>}
            {child.dob && <p>DOB: {format(new Date(child.dob), 'dd MMM yyyy')}</p>}
            {child.room_group && <p>Group: {child.room_group}</p>}
          </div>

          {child.condition_type === 'Allergy' && child.allergens && (
            <div className="mt-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Allergens</p>
              <p className="text-sm font-medium text-red-600 mt-0.5">{child.allergens}</p>
            </div>
          )}
          {child.condition_type === 'Dietary' && child.dietary_requirement && (
            <div className="mt-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Dietary Requirement</p>
              <p className="text-sm font-medium text-purple-600 mt-0.5">{child.dietary_requirement}</p>
            </div>
          )}
          {child.condition_type === 'Asthma' && (
            <div className="mt-2 space-y-1">
              {child.asthma_triggers && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Triggers</p>
                  <p className="text-sm font-medium text-blue-600 mt-0.5">{child.asthma_triggers}</p>
                </div>
              )}
              {child.reliever_medication && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Reliever</p>
                  <p className="text-sm mt-0.5">{child.reliever_medication}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Link to={`/children/${child.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-2 w-full">
              <Pencil className="w-3 h-3" /> Edit
            </Button>
          </Link>
          {child.parent_name && (
            <div className="text-xs text-muted-foreground space-y-1 mt-2">
              <p className="font-medium text-foreground">{child.parent_name}</p>
              {child.parent_phone && (
                <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {child.parent_phone}</p>
              )}
              {child.parent_email && (
                <p className="flex items-center gap-1"><Mail className="w-3 h-3" /> {child.parent_email}</p>
              )}
            </div>
          )}
        </div>
      </div>
      {child.notes && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs font-medium text-muted-foreground uppercase">Notes</p>
          <p className="text-sm mt-1">{child.notes}</p>
        </div>
      )}
    </Card>
  );
}