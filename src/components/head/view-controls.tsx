import { Grid2X2, Grid3X3 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface ViewControlsProps {
  viewSize: 'sm' | 'md';
  onViewSizeChange: (size: 'sm' | 'md') => void;
}

const viewSizes = [
  { value: 'sm' as const, label: 'sm', icon: <Grid3X3 className="w-4 h-4" /> },
  { value: 'md' as const, label: 'md', icon: <Grid2X2 className="w-4 h-4" /> },
];

export function ViewControls({ viewSize, onViewSizeChange }: ViewControlsProps) {
  return (
    <div className="flex items-center gap-3 ml-auto">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          View: 
        </span>
        <ToggleGroup 
          type="single" 
          value={viewSize} 
          onValueChange={(value: string) => value && onViewSizeChange(value as 'sm' | 'md')}
          variant="outline"
          size="sm"
        >
          {viewSizes.map((size) => (
            <ToggleGroupItem 
              key={size.value}
              value={size.value}
              aria-label={`${size.label}Icon`}
            >
              {size.icon}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {/* 主题切换按钮 */}
      <ThemeToggle />
    </div>
  );
}
