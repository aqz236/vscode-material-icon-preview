import { SearchBox } from './head/search-box';
import { Filters } from './head/filters';
import { ViewControls } from './head/view-controls';
import type { HeadProps } from './head/types';

export function Head({
  searchTerm,
  category,
  iconPack,
  colorFilter,
  viewSize,
  onSearchChange,
  onCategoryChange,
  onIconPackChange,
  onColorFilterChange,
  onViewSizeChange,
  totalCount,
}: HeadProps) {
  return (
    <>
      <div className=" p-4 sticky top-0 z-10 border-gray-200/20 dark:border-gray-700/20 shadow-xl backdrop-blur-xl bg-white/10 dark:bg-black/10 isolate ">
        <div className="max-w-7xl mx-auto space-y-3 relative z-10">
          {/* 第一行：搜索框、筛选器和视图控制 */}
          <div className="flex items-center gap-4">
            {/* 搜索框 - 较小宽度 */}
            <SearchBox 
              searchTerm={searchTerm}
              totalCount={totalCount}
              onSearchChange={onSearchChange}
            />

            {/* 筛选器 */}
            <Filters
              category={category}
              iconPack={iconPack}
              colorFilter={colorFilter}
              onCategoryChange={onCategoryChange}
              onIconPackChange={onIconPackChange}
              onColorFilterChange={onColorFilterChange}
            />

            {/* 视图大小控制和主题切换 */}
            <ViewControls
              viewSize={viewSize}
              onViewSizeChange={onViewSizeChange}
            />
          </div>
        </div>
      </div>
    </>
  );
}
