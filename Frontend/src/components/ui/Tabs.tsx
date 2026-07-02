import React, { useState } from 'react';
import { cn } from '../../lib/utils.js';

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultTabId?: string;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, defaultTabId, className }) => {
  const [activeTab, setActiveTab] = useState(defaultTabId || tabs[0]?.id);

  return (
    <div className={cn("w-full flex flex-col gap-4", className)}>
      <div className="flex border-b border-border gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 border-transparent transition-all whitespace-nowrap cursor-pointer",
              activeTab === tab.id
                ? "border-primary text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1">
        {tabs.find((tab) => tab.id === activeTab)?.content}
      </div>
    </div>
  );
};
export default Tabs;
