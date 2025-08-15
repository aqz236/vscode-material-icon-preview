import { Grid2X2, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ViewControlsProps {
  viewSize: 'sm' | 'md';
  onViewSizeChange: (size: 'sm' | 'md') => void;
}

export function ViewControls({ viewSize, onViewSizeChange }: ViewControlsProps) {
  const toggleViewSize = () => {
    onViewSizeChange(viewSize === 'sm' ? 'md' : 'sm');
  };

  return (
    <Button variant="outline" size="icon" onClick={toggleViewSize}>
      <Grid3X3 className={`h-[1.2rem] w-[1.2rem] transition-all ${
        viewSize === 'sm' ? 'rotate-0 scale-100' : '-rotate-90 scale-0'
      }`} />
      <Grid2X2 className={`absolute h-[1.2rem] w-[1.2rem] transition-all ${
        viewSize === 'md' ? 'rotate-0 scale-100' : 'rotate-90 scale-0'
      }`} />
      <span className="sr-only">Toggle view size</span>
    </Button>
  );
}
