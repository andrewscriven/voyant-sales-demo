interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  theme?: 'light' | 'dark';
}

export function Tabs({ tabs, active, onChange, theme = 'dark' }: TabsProps) {
  return (
    <div className={`tabs tabs-${theme}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={tab.id === active ? 'is-active' : ''}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
