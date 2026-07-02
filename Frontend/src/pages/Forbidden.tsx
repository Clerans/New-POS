import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { useNavigate } from 'react-router-dom';

export const Forbidden: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <div className="p-4 bg-destructive/10 rounded-full text-destructive mb-4 flex items-center justify-center">
        <ShieldAlert className="h-12 w-12" />
      </div>
      <h1 className="text-4xl font-extrabold text-foreground mb-2">403</h1>
      <h2 className="text-xl font-bold text-foreground mb-2">Access Forbidden</h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        You do not have the required permissions to access this resource. Please contact your manager.
      </p>
      <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
    </div>
  );
};
export default Forbidden;
