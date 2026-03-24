import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function StaffChildGrid({ children }) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {children.map(child => (
        <Card
          key={child.id}
          className="p-4 cursor-pointer hover:shadow-lg transition-all hover:scale-105 overflow-hidden"
          onClick={() => navigate(`/staff-sign-child/${child.id}`)}
        >
          <div className="space-y-3">
            {/* Photo */}
            <div className="aspect-square bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg overflow-hidden flex items-center justify-center">
              {child.photo_url ? (
                <img src={child.photo_url} alt={child.first_name} className="w-full h-full object-cover" />
              ) : (
                <Users className="w-12 h-12 text-blue-300" />
              )}
            </div>

            {/* Details */}
            <div className="space-y-1">
              <p className="font-semibold text-gray-800 text-sm">{child.first_name} {child.last_name}</p>
              <p className="text-xs text-gray-500">
                {child.condition_type}
                {child.room_group && ` • ${child.room_group}`}
              </p>
            </div>

            {/* Condition badge */}
            {child.severity && (
              <div className={`text-xs font-medium px-2 py-1 rounded-full text-center ${
                child.severity === 'Anaphylaxis' ? 'bg-red-100 text-red-700' :
                child.severity === 'Moderate' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {child.severity || child.asthma_severity}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}