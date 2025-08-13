import { useEffect, useMemo, useRef, useState } from 'react';
import { getAllIcons, getIconsByCategory, searchIcons } from '../../data/iconData';
import IconCard from './IconCard';
import type { IconInfo } from '../../data/iconData';

export default function IconGrid() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'file' | 'folder'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSticky, setIsSticky] = useState(false);
  const itemsPerPage = 50;
  const searchRef = useRef<HTMLDivElement>(null);

  // 监听滚动事件
  useEffect(() => {
    const handleScroll = () => {
      if (searchRef.current) {
        const rect = searchRef.current.getBoundingClientRect();
        const threshold = 50; // 滚动阈值，调整为更小的值
        setIsSticky(window.scrollY > threshold);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const filteredIcons = useMemo(() => {
    let icons: Array<IconInfo> = [];
    
    if (searchQuery.trim()) {
      icons = searchIcons(searchQuery);
    } else {
      icons = getAllIcons();
    }

    if (selectedCategory !== 'all') {
      icons = getIconsByCategory(selectedCategory);
      if (searchQuery.trim()) {
        icons = icons.filter(icon => 
          icon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          icon.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
    }

    // 去重处理
    const uniqueIcons = icons.filter((icon, index, self) => 
      index === self.findIndex(i => i.name === icon.name)
    );

    return uniqueIcons;
  }, [searchQuery, selectedCategory]);

  const totalPages = Math.ceil(filteredIcons.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentIcons = filteredIcons.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPaginationRange = () => {
    const range = [];
    const delta = 2;
    
    for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) {
      range.push(i);
    }
    
    return range;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      {/* <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Material Icon Preview
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Preview and search all icons from VSCode Material Icon Theme
        </p>
      </div> */}

      {/* Search and Filter Area */}
      <div 
        ref={searchRef}
        className={`transition-all duration-500 ease-out ${
          isSticky 
            ? 'fixed top-0 left-0 right-0 z-50 bg-white/15 dark:bg-black/25 backdrop-blur-xl backdrop-saturate-150 border-b border-white/20 dark:border-white/10 shadow-2xl shadow-black/10 dark:shadow-black/30' 
            : 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700'
        } ${isSticky ? 'px-6 py-4 mx-4 mt-4 rounded-2xl' : 'p-6'} mb-8`}
        style={isSticky ? {
          background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        } : {}}
      >
        <div className={isSticky ? 'container mx-auto' : ''}>
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Box */}
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Icons
            </label>
            <input
              id="search"
              type="text"
              placeholder="Enter icon name, file extension, or description..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category Filter
            </label>
            <select
              id="category"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value as 'all' | 'file' | 'folder');
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All ({getAllIcons().length})</option>
              <option value="file">File Icons ({getIconsByCategory('file').length})</option>
              <option value="folder">Folder Icons ({getIconsByCategory('folder').length})</option>
            </select>
          </div>
        </div>

        {/* Results Summary */}
        {/* <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Found <span className="font-semibold text-blue-600 dark:text-blue-400">{filteredIcons.length}</span> icons
            {searchQuery && (
              <span> for search: "<span className="font-semibold">{searchQuery}</span>"</span>
            )}
          </p>
        </div> */}
        </div>
      </div>

      {/* Spacer when search is sticky */}
      {isSticky && <div className="h-[140px]" />}

      {/* Icon Grid */}
      {currentIcons.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 mb-8">
          {currentIcons.map((icon) => (
            <IconCard
              key={`${icon.name}-${icon.category}`}
              name={icon.name}
              category={icon.category}
              description={icon.description}
              extensions={icon.extensions}
              fileNames={icon.fileNames}
              folderNames={icon.folderNames}
              hasLightVariant={icon.hasLightVariant}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Icons Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your search criteria or selecting a different category
          </p>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            Previous
          </button>

          {getPaginationRange().map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`px-3 py-2 text-sm font-medium border ${
                page === currentPage
                  ? 'text-blue-600 bg-blue-50 border-blue-300 dark:bg-blue-900 dark:text-blue-200'
                  : 'text-gray-500 bg-white border-gray-300 hover:bg-gray-50 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
