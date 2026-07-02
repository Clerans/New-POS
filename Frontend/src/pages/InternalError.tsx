import React from 'react';
import { ServerCrash } from 'lucide-react';
import { Button } from '../components/ui/Button.js';

export const InternalError: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <div className="p-4 bg-destructive/10 rounded-full text-destructive mb-4 flex items-center justify-center">
        <ServerCrash className="h-12 w-12" />
      </div>
      <h1 className="text-4xl font-extrabold text-foreground mb-2">500</h1>
      <h2 className="text-xl font-bold text-foreground mb-2">Internal Server Error</h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        An unexpected error occurred on the server. We are working on fixing it.
      </p>
      <Button onClick={() => window.location.reload()}>Try Again</Button>
    </div>
  );
};
export default InternalError;
