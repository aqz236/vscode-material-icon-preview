import { Github } from 'lucide-react';
import { SearchBox } from './head/search-box';
import { Filters } from './head/filters';
import { ViewControls } from './head/view-controls';
import { ThemeToggle } from './theme-toggle';
import type { HeadProps } from './head/types';
import { Button } from '@/components/ui/button';

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
            {/* 左侧：搜索框和筛选器 */}
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
            </div>

            {/* 右侧：控制按钮组 */}
            <div className="flex items-center gap-2 ml-auto">
              {/* 视图大小切换按钮 */}
              <ViewControls
                viewSize={viewSize}
                onViewSizeChange={onViewSizeChange}
              />
              {/* 主题切换按钮 */}
              <ThemeToggle />

              {/* GitHub 链接 */}
              <Button 
                variant="outline" 
                size="icon" 
                asChild
              >
                <a
                  href="https://github.com/aqz236/vscode-material-icon-preview"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="I love you"
                >
                  <Github className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">Open GitHub repository</span>
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
