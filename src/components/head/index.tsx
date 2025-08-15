import { SearchBox } from './search-box';
import { Filters } from './filters';
import { ViewControls } from './view-controls';
import { HeadMobile } from './mobile';
import type { HeadProps } from './types';

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
      {/* 移动端头部组件 - 在 md 断点以下显示 */}
      <div className="block md:hidden">
        <HeadMobile
          searchTerm={searchTerm}
          category={category}
          iconPack={iconPack}
          colorFilter={colorFilter}
          onSearchChange={onSearchChange}
          onCategoryChange={onCategoryChange}
          onIconPackChange={onIconPackChange}
          onColorFilterChange={onColorFilterChange}
          totalCount={totalCount}
        />
      </div>

      {/* 桌面端头部组件 - 在 md 断点以上显示 */}
      <div className="hidden md:block p-4 sticky top-0 z-10 border-gray-200/20 dark:border-gray-700/20 shadow-xl backdrop-blur-xl bg-white/10 dark:bg-black/10 isolate">
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
