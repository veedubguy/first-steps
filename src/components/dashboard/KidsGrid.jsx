import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const conditionColors = {
  'Allergy': 'bg-red-100 text-red-700',
  'Asthma': 'bg-blue-100 text-blue-700',
  'Dietary': 'bg-amber-100 text-amber-700',
};

export default function KidsGrid({ children, isLoading }) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-56 bg-slate-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {children.map((child) => (
        <Card
          key={child.id}
          className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate(`/children/${child.id}`)}
        >
          <div className="relative h-40 bg-gradient-to-br from-slate-100 to-slate-200">
            {child.photo_url ? (
              <img
                src={child.photo_url}
                alt={child.first_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">👤</div>
                  <span className="text-xs">No photo</span>
                </div>
              </div>
            )}
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-sm">
              {child.first_name} {child.last_name}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Room {child.room_group || '—'}
            </p>
            <Badge className={conditionColors[child.condition_type] || 'bg-slate-100'}>
              {child.condition_type}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}