import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import StaffChildGrid from '@/components/staff-signoff/StaffChildGrid';

export default function StaffSignoffDashboard() {
  const [passcode, setPasscode] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const navigate = useNavigate();

  const { data: children = [], isLoading } = useQuery({
    queryKey: ['children'],
    queryFn: () => base44.entities.Children.list(),
    enabled: authenticated,
  });

  const handleAuth = () => {
    // Simple passcode check - can be customized
    if (passcode === '1234') {
      setAuthenticated(true);
      setAuthError('');
      setPasscode('');
    } else {
      setAuthError('Incorrect passcode');
      setPasscode('');
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setPasscode('');
    setAuthError('');
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-4 rounded-full">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Staff Sign-Off</h1>
          <p className="text-center text-gray-500 mb-6">Risk Minimisation Plans</p>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Passcode</label>
              <Input
                type="password"
                placeholder="Enter passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                className="text-lg tracking-widest text-center"
              />
            </div>
            {authError && <p className="text-sm text-red-600 text-center">{authError}</p>}
            <Button onClick={handleAuth} className="w-full h-10" disabled={!passcode}>
              <Lock className="w-4 h-4 mr-2" /> Enter
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-700 text-white sticky top-0 z-10 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Staff Sign-Off</h1>
            <p className="text-blue-200 text-sm">Tap a child to review and sign off their Risk Minimisation Plan</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : children.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No children found</p>
          </div>
        ) : (
          <StaffChildGrid children={children} />
        )}
      </div>
    </div>
  );
}