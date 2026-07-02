import React from 'react';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card.js';
import { Select } from '../components/ui/Select.js';
import { Input } from '../components/ui/Input.js';
import { Button } from '../components/ui/Button.js';
import { useThemeStore, type Theme } from '../store/themeStore.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { useNotificationStore } from '../store/notificationStore.js';
import { Sun, Moon, Laptop } from 'lucide-react';

export const Settings: React.FC = () => {
  const { theme, setTheme } = useThemeStore();
  const { currency, setSettings } = useSettingsStore();
  const { addToast } = useNotificationStore();

  const themeOptions = [
    { value: 'light', label: 'Light Mode' },
    { value: 'dark', label: 'Dark Mode' },
    { value: 'system', label: 'System Preferences' },
  ];

  const currencyOptions = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
  ];

  const handleTestToast = (type: 'success' | 'info' | 'warning' | 'error') => {
    addToast({
      title: `${type.toUpperCase()} Toast`,
      message: `This is a test ${type} notification banner from settings page.`,
      type,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="System Settings" description="Configure CafeChai POS Enterprise preferences." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Appearance Card */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance & Theme</CardTitle>
            <CardDescription>Customize the user interface styling and visual experience.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Active Theme Mode"
              options={themeOptions}
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setTheme('light')}>
                <Sun className="h-4 w-4 mr-1.5" /> Light
              </Button>
              <Button variant="outline" size="sm" onClick={() => setTheme('dark')}>
                <Moon className="h-4 w-4 mr-1.5" /> Dark
              </Button>
              <Button variant="outline" size="sm" onClick={() => setTheme('system')}>
                <Laptop className="h-4 w-4 mr-1.5" /> System
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Localization Card */}
        <Card>
          <CardHeader>
            <CardTitle>Localization & Currency</CardTitle>
            <CardDescription>Setup local POS defaults for transaction formatting.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Store Base Currency"
              options={currencyOptions}
              value={currency}
              onChange={(e) => {
                const currency = e.target.value;
                const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
                setSettings({ currency, currencySymbol });
                addToast({
                  title: 'Settings Saved',
                  message: `Default currency changed to ${currency}`,
                  type: 'success',
                });
              }}
            />
            <Input label="Timezone Offset" value="UTC+00:00" disabled readOnly />
          </CardContent>
        </Card>

        {/* Toast Testing Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>System Diagnostic Toast Feeds</CardTitle>
            <CardDescription>Test the responsive floating alert systems instantly.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" className="border-success/30 hover:bg-success/5 text-success" onClick={() => handleTestToast('success')}>
              Trigger Success Toast
            </Button>
            <Button variant="outline" className="border-blue-500/30 hover:bg-blue-500/5 text-blue-500" onClick={() => handleTestToast('info')}>
              Trigger Info Toast
            </Button>
            <Button variant="outline" className="border-warning/30 hover:bg-warning/5 text-warning" onClick={() => handleTestToast('warning')}>
              Trigger Warning Toast
            </Button>
            <Button variant="outline" className="border-destructive/30 hover:bg-destructive/5 text-destructive" onClick={() => handleTestToast('error')}>
              Trigger Error Toast
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
export default Settings;
