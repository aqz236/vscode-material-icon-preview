import { Filter } from 'lucide-react';
import { categories, iconPacks } from '../constants';
import type { IconCategory } from '@/lib/icons';
import { ColorPicker } from '@/components/ui/color-picker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface MobileFiltersProps {
  category?: IconCategory;
  iconPack?: string;
  colorFilter?: { color: string; radius: number };
  onCategoryChange: (category?: IconCategory) => void;
  onIconPackChange: (pack?: string) => void;
  onColorFilterChange: (colorFilter?: { color: string; radius: number }) => void;
}

export function Filters({
  category,
  iconPack,
  colorFilter,
  onCategoryChange,
  onIconPackChange,
  onColorFilterChange,
}: MobileFiltersProps) {
  // 计算当前活跃的过滤器数量
  const activeFiltersCount = [category, iconPack, colorFilter].filter(Boolean).length;

  // 颜色过滤器处理函数
  const handleColorChange = (color?: string, radius?: number) => {
    if (color && radius !== undefined) {
      onColorFilterChange({ color, radius });
    }
  };

  const handleColorClear = () => {
    onColorFilterChange(undefined);
  };

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* 主过滤器下拉菜单 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="relative"
          >
            <Filter className="w-4 h-4" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Filters</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* 分类过滤器 */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Category
            </DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => onCategoryChange(undefined)}
              className={!category ? "bg-accent" : ""}
            >
              All Categories
            </DropdownMenuItem>
            {categories.map((cat) => (
              <DropdownMenuItem 
                key={cat.value}
                onClick={() => onCategoryChange(cat.value)}
                className={category === cat.value ? "bg-accent" : ""}
              >
                {cat.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator />
          
          {/* Icon Pack 过滤器 */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Icon Pack
            </DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => onIconPackChange(undefined)}
              className={!iconPack ? "bg-accent" : ""}
            >
              All Packs
            </DropdownMenuItem>
            {iconPacks.map((pack) => (
              <DropdownMenuItem 
                key={pack}
                onClick={() => onIconPackChange(pack)}
                className={iconPack === pack ? "bg-accent" : ""}
              >
                {pack}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator />
          
          {/* 清除所有过滤器 */}
          {activeFiltersCount > 0 && (
            <DropdownMenuItem 
              onClick={() => {
                onCategoryChange(undefined);
                onIconPackChange(undefined);
                onColorFilterChange(undefined);
              }}
              className="text-red-600 focus:text-red-600"
            >
              Clear All Filters
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 颜色过滤器 - 独立的颜色选择器 */}
      <ColorPicker
        selectedColor={colorFilter?.color}
        colorRadius={colorFilter?.radius}
        onColorChange={handleColorChange}
        onClear={handleColorClear}
      />
    </div>
  );
}
