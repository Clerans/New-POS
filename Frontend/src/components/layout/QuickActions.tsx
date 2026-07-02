import React from 'react';
import { Sun, Moon, Laptop, Keyboard, RotateCw } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore.js';
import { Button } from '../ui/Button.js';

export const QuickActions: React.FC = () => {
  const { theme, setTheme } = useThemeStore();

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="h-4 w-4" />;
    if (theme === 'dark') return <Moon className="h-4 w-4" />;
    return <Laptop className="h-4 w-4" />;
  };

  return (
    <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg border border-border">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        title={`Theme: ${theme}`}
        onClick={toggleTheme}
      >
        {getThemeIcon()}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        title="Open Keyboard Shortcuts"
        onClick={() => alert('Shortcuts list: \n / : Focus Search \n Esc : Close Modals')}
      >
        <Keyboard className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        title="Refresh App"
        onClick={() => window.location.reload()}
      >
        <RotateCw className="h-4 w-4" />
      </Button>
    </div>
  );
};
export default QuickActions;
