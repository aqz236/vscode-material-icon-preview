import { useEffect, useMemo, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import type { IconCategory, IconInfo } from '@/lib/icons';
import { loadIconsMetadata, searchIcons } from '@/lib/icons';
import { VirtualIconGrid } from '@/components/virtual-icon-grid';
import { Head } from '@/components/head';

export const Route = createFileRoute('/')({
  component: App,
  loader: async () => {
  },
})

function App() {
  // 
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IconCategory | undefined>();
  const [selectedIconPack, setSelectedIconPack] = useState<string | undefined>();
  const [colorFilter, setColorFilter] = useState<{ color: string; radius: number } | undefined>();
  const [viewSize, setViewSize] = useState<'sm' | 'md'>('md');
  const [isLoading, setIsLoading] = useState(true);
  const [allIcons, setAllIcons] = useState<Array<IconInfo>>([]);
  const scrollContainerRef = useRef<HTMLElement>(null);

  // Asynchronously load pre-generated icon data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const metadata = await loadIconsMetadata();
        setAllIcons(metadata.icons);
        // availablePacks 暂时不使用，之后可能用于筛选器选项
      } catch (error) {
        console.error('Failed to load icons metadata:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Search and filter icons
  const searchResult = useMemo(() => {
    if (isLoading || allIcons.length === 0) {
      return { icons: [], totalCount: 0, categories: {} };
    }
    return searchIcons(allIcons, searchTerm, selectedCategory, selectedIconPack, colorFilter);
  }, [allIcons, searchTerm, selectedCategory, selectedIconPack, colorFilter, isLoading]);

  // 处理搜索和筛选变化
  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  const handleCategoryChange = (category?: IconCategory) => {
    setSelectedCategory(category);
  };

  const handleIconPackChange = (pack?: string) => {
    setSelectedIconPack(pack);
  };

  const handleColorFilterChange = (filter?: { color: string; radius: number }) => {
    setColorFilter(filter);
  };

  const handleViewSizeChange = (size: 'sm' | 'md') => {
    setViewSize(size);
  };

  // 临时类型转换移除，现在使用正确的类型
  return (
    <div className="h-screen flex flex-col">
      {/* 头部组件 */}
      <Head
        searchTerm={searchTerm}
        category={selectedCategory}
        iconPack={selectedIconPack}
        colorFilter={colorFilter}
        viewSize={viewSize}
        onSearchChange={handleSearchChange}
        onCategoryChange={handleCategoryChange}
        onIconPackChange={handleIconPackChange}
        onColorFilterChange={handleColorFilterChange}
        onViewSizeChange={handleViewSizeChange}
        totalCount={searchResult.totalCount}
      />

      {/* 主内容区域 - 在这里添加滚动容器 */}
      <main ref={scrollContainerRef} className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-full">
              <div className="text-center">
                <div className="text-gray-500 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h3 className="text-lg font-medium">Loading...</h3>
                </div>
              </div>
            </div>
          ) : searchResult.icons.length > 0 ? (
            <VirtualIconGrid
              icons={searchResult.icons}
              size={viewSize}
              scrollElement={scrollContainerRef.current}
            />
          ) : (
            <div className="flex items-center justify-center min-h-full">
              <div className="text-center">
                <div className="text-gray-500 dark:text-gray-400">
                  <svg
                    className="mx-auto h-12 w-12 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.034 0-3.894.609-5.448 1.652M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="text-lg font-medium">No matching icon found</h3>
                  <p className="mt-1">Please try adjusting your search criteria or filters</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
