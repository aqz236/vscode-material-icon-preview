import { ChevronDown, Filter } from 'lucide-react';
import { categories, iconPacks } from './constants';
import type { IconCategory } from '@/lib/icons';
import { ColorPicker } from '@/components/color-picker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FiltersProps {
  category?: IconCategory;
  iconPack?: string;
  colorFilter?: { color: string; radius: number };
  onCategoryChange: (category?: IconCategory) => void;
  onIconPackChange: (pack?: string) => void;
  onColorFilterChange: (colorFilter?: { color: string; radius: number }) => void;
}

export function Filters({ category, iconPack, colorFilter, onCategoryChange, onIconPackChange, onColorFilterChange }: FiltersProps) {
  const handleColorChange = (color?: string, radius?: number) => {
    if (color && radius !== undefined) {
      onColorFilterChange({ color, radius });
    }
  };

  const handleColorClear = () => {
    onColorFilterChange(undefined);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter: </span>
      </div>

      {/* 分类筛选 */}
      <DropdownMenu>
        <DropdownMenuTrigger className="px-3 py-2 border border-white/30 dark:border-gray-600/30 rounded-lg 
                 backdrop-blur-md bg-white/20 dark:bg-black/20 text-gray-900 dark:text-gray-100 text-sm
                 focus:outline-none focus:bg-white/30 dark:focus:bg-black/30
                 transition-all duration-200 shadow-inner
                 flex items-center gap-2 min-w-[120px] justify-between">
          <span>{category ? categories.find(cat => cat.value === category)?.label : 'All'}</span>
          <ChevronDown className="w-4 h-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="backdrop-blur-md bg-white/90 dark:bg-black/90 border border-white/30 dark:border-gray-600/30">
          <DropdownMenuItem 
            onClick={() => onCategoryChange(undefined)}
            className="cursor-pointer"
          >
            All
          </DropdownMenuItem>
          {categories.map((cat) => (
            <DropdownMenuItem 
              key={cat.value} 
              onClick={() => onCategoryChange(cat.value)}
              className="cursor-pointer"
            >
              {cat.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 图标包筛选 */}
      <DropdownMenu>
        <DropdownMenuTrigger className="px-3 py-2 border border-white/30 dark:border-gray-600/30 rounded-lg 
                 backdrop-blur-md bg-white/20 dark:bg-black/20 text-gray-900 dark:text-gray-100 text-sm
                 focus:outline-none focus:bg-white/30 dark:focus:bg-black/30
                 transition-all duration-200 shadow-inner
                 flex items-center gap-2 min-w-[100px] justify-between">
          <span>{iconPack || 'Default'}</span>
          <ChevronDown className="w-4 h-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="backdrop-blur-md bg-white/90 dark:bg-black/90 border border-white/30 dark:border-gray-600/30">
          <DropdownMenuItem 
            onClick={() => onIconPackChange(undefined)}
            className="cursor-pointer"
          >
            Default
          </DropdownMenuItem>
          {iconPacks.map((pack) => (
            <DropdownMenuItem 
              key={pack} 
              onClick={() => onIconPackChange(pack)}
              className="cursor-pointer"
            >
              {pack}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 颜色筛选器 */}
      <ColorPicker
        selectedColor={colorFilter?.color}
        colorRadius={colorFilter?.radius}
        onColorChange={handleColorChange}
        onClear={handleColorClear}
      />

    </div>
  );
}
