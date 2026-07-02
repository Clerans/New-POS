import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // If we are just on the root/dashboard, don't show complex crumbs
  if (pathnames.length === 0 || (pathnames.length === 1 && pathnames[0] === 'dashboard')) {
    return (
      <nav className="flex select-none" aria-label="Breadcrumb">
        <div className="flex items-center text-sm font-semibold text-foreground">
          Dashboard
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-2 text-sm text-muted-foreground font-medium">
        <li className="inline-flex items-center">
          <Link to="/dashboard" className="inline-flex items-center hover:text-foreground gap-1.5 transition-colors">
            <Home className="h-4 w-4" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === pathnames.length - 1;
          const displayValue = value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');

          return (
            <li key={to} className="inline-flex items-center gap-1 md:gap-2">
              <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
              {isLast ? (
                <span className="text-foreground font-semibold truncate select-none">{displayValue}</span>
              ) : (
                <Link to={to} className="hover:text-foreground transition-colors truncate">
                  {displayValue}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
export default Breadcrumb;
