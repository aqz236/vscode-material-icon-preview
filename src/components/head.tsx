import { ChevronDown, Filter, Grid2X2, Grid3X3, Search } from 'lucide-react';
import type { IconCategory } from '@/lib/icons';
import { ThemeToggle } from '@/components/theme-toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface NewHeadProps {
  searchTerm: string;
  category?: IconCategory;
  iconPack?: string;
  viewSize: 'sm' | 'md';
  onSearchChange: (term: string) => void;
  onCategoryChange: (category?: IconCategory) => void;
  onIconPackChange: (pack?: string) => void;
  onViewSizeChange: (size: 'sm' | 'md') => void;
  totalCount: number;
}

const categories: Array<{ value: IconCategory; label: string }> = [
  { value: 'fileExtension', label: 'extension' },
  { value: 'fileName', label: 'file_name' },
  { value: 'folder', label: 'folder' },
  { value: 'language', label: 'language' },
  { value: 'file', label: 'file' },
];

const viewSizes: Array<{ value: 'sm' | 'md'; label: string; icon: React.ReactNode }> = [
  { value: 'sm', label: 'sm', icon: <Grid3X3 className="w-4 h-4" /> },
  { value: 'md', label: 'md', icon: <Grid2X2 className="w-4 h-4" /> },
];

// 暂时使用静态的图标包选项，之后可以从预生成数据中获取
const iconPacks = ['angular', 'react', 'vue', 'svelte'];

export function Head({
  searchTerm,
  category,
  iconPack,
  viewSize,
  onSearchChange,
  onCategoryChange,
  onIconPackChange,
  onViewSizeChange,
  totalCount,
}: NewHeadProps) {
  return (
    <>
      {/* SVG滤镜定义 - 液态玻璃扭曲效果
      <svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }}>
        <defs>
          <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.008 0.008" numOctaves="2" seed="92" result="noise" />
            <feGaussianBlur in="noise" stdDeviation="2" result="blurred" />
            <feDisplacementMap in="SourceGraphic" in2="blurred" scale="77" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg> */}
      
      <div className=" p-4 sticky top-0 z-10 border-gray-200/20 dark:border-gray-700/20 shadow-xl backdrop-blur-xl bg-white/10 dark:bg-black/10 isolate ">
        {/* 毛玻璃背景层 */}
        <div className="absolute inset-0 -z-10 backdrop-blur-2xl bg-white/20 dark:bg-black/20 shadow-inner" />
        
        {/* 内阴影效果层 */}
        <div className="absolute inset-0 -z-20 bg-gradient-to-b from-white/30 via-transparent to-transparent dark:from-white/10" />

        <div className="max-w-7xl mx-auto space-y-3 relative z-10">
        {/* 第一行：搜索框、筛选器和视图控制 */}
        <div className="flex items-center gap-4">
          {/* 搜索框 - 较小宽度 */}
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={`Total ${totalCount} icons`}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-white/30 dark:border-gray-600/30 rounded-lg 
                       backdrop-blur-md bg-white/20 dark:bg-black/20 text-gray-900 dark:text-gray-100 text-sm
                       focus:outline-none focus:bg-white/30 dark:focus:bg-black/30
                       transition-all duration-200 shadow-inner
                       placeholder:text-gray-500 dark:placeholder:text-gray-400"
            />
          </div>

          {/* 筛选器 */}
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
                <span>{category ? categories.find(cat => cat.value === category)?.label : 'All Category'}</span>
                <ChevronDown className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="backdrop-blur-md bg-white/90 dark:bg-black/90 border border-white/30 dark:border-gray-600/30">
                <DropdownMenuItem 
                  onClick={() => onCategoryChange(undefined)}
                  className="cursor-pointer"
                >
                  All Category
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
          </div>

          {/* 视图大小控制和主题切换 */}
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                View：
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
        </div>
        </div>
      </div>
    </>
  );
}
