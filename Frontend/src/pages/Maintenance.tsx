import React from 'react';
import { Wrench } from 'lucide-react';
import { Button } from '../components/ui/Button.js';

export const Maintenance: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <div className="p-4 bg-warning/10 rounded-full text-warning mb-4 flex items-center justify-center">
        <Wrench className="h-12 w-12" />
      </div>
      <h1 className="text-2xl font-extrabold text-foreground mb-2">Under Maintenance</h1>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        CafeChai POS is currently undergoing scheduled maintenance. Please check back later.
      </p>
      <Button variant="outline" onClick={() => window.location.reload()}>Refresh Page</Button>
    </div>
  );
};
export default Maintenance;
