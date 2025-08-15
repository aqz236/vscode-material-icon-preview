import { SearchBox } from './mobile-search-box';
import { Filters } from './mobile-filters';
import { ThemeToggle } from './mobile-theme-toggle';
import type { HeadProps } from '../types';

export function HeadMobile({
  searchTerm,
  category,
  iconPack,
  colorFilter,
  onSearchChange,
  onCategoryChange,
  onIconPackChange,
  onColorFilterChange,
  totalCount,
}: Omit<HeadProps, 'viewSize' | 'onViewSizeChange'>) {
  return (
    <div className="p-3 sticky top-0 z-10 border-b border-gray-200/20 dark:border-gray-700/20 shadow-lg backdrop-blur-lg bg-white/95 dark:bg-black/95">
      <div className="flex items-center gap-2">
        {/* 移动端过滤器 - 下拉菜单形式 */}
        <Filters
          category={category}
          iconPack={iconPack}
          colorFilter={colorFilter}
          onCategoryChange={onCategoryChange}
          onIconPackChange={onIconPackChange}
          onColorFilterChange={onColorFilterChange}
        />

        {/* 搜索框 - 占据剩余空间 */}
        <div className="flex-1">
          <SearchBox 
            searchTerm={searchTerm}
            totalCount={totalCount}
            onSearchChange={onSearchChange}
          />
        </div>

        {/* 主题切换 - 明暗模式切换 */}
        <ThemeToggle />
      </div>
    </div>
  );
}
