import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { toast } from 'sonner';
import { Moon, Sun } from 'lucide-react';
import type { IconInfo } from '@/lib/icons';

// 重新定义图标卡片组件，避免类型冲突
interface BaseIconCardProps {
  icon: IconInfo;
  onSelect?: (icon: IconInfo) => void;
}

// 从原有组件复制样式，避免类型问题
function SmallIconCard({ icon, onSelect }: BaseIconCardProps) {
  const [isDarkVersion, setIsDarkVersion] = useState(false);
  
  // 优化：使用 useMemo 缓存图标 URL 计算
  const iconUrl = useMemo(() => {
    if (isDarkVersion && icon.hasLightVersion && icon.lightIconPath) {
      return `/icons/${icon.lightIconPath.replace('./../icons/', '')}`;
    }
    return `/icons/${icon.iconPath.replace('./../icons/', '')}`;
  }, [isDarkVersion, icon.hasLightVersion, icon.lightIconPath, icon.iconPath]);

  // 优化：使用 useCallback 避免函数重新创建
  const handleClick = useCallback(async () => {
    // 打印图标的所有信息到控制台
    console.log('Icon Info:', icon);
    
    // 复制 iconId 到剪切板
    try {
      await navigator.clipboard.writeText(icon.name);
      toast.success('Icon name copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      toast.error('Failed to copy to clipboard');
    }
    
    // 调用原有的 onSelect 回调
    onSelect?.(icon);
  }, [icon, onSelect]);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    console.warn(`Failed to load icon: ${iconUrl}`, e);
  }, [iconUrl]);

  const handleToggleTheme = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDarkVersion(!isDarkVersion);
  }, [isDarkVersion]);

  return (
    <div
      className="
        w-16 h-16 p-1 rounded-lg border border-gray-200 dark:border-gray-700 
        bg-white dark:bg-gray-800 
        hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600
        transition-all duration-200 cursor-pointer
        flex items-center justify-center relative group
      "
      onClick={handleClick}
      title={`${icon.name} (${icon.category})`}
    >
      {/* 明暗切换按钮 - 只有支持明暗版本的图标才显示 */}
      {icon.hasLightVersion && (
        <button
          onClick={handleToggleTheme}
          className="
            absolute -top-1 -right-1 w-5 h-5 rounded-full 
            bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600
            hover:bg-gray-200 dark:hover:bg-gray-600
            opacity-0 group-hover:opacity-100
            flex items-center justify-center
            z-10
          "
          title={isDarkVersion ? "Switch to dark version" : "Switch to light version"}
        >
          {isDarkVersion ? (
            <Moon className="w-3 h-3 text-gray-600 dark:text-gray-300" />
          ) : (
            <Sun className="w-3 h-3 text-gray-600 dark:text-gray-300" />
          )}
        </button>
      )}
      
      <div className="w-10 h-10 flex items-center justify-center">
        <img
          src={iconUrl}
          alt={icon.name}
          className="w-full h-full object-contain transition-opacity duration-300 ease-in-out"
          onError={handleImageError}
          key={iconUrl} // 强制重新渲染当切换版本时
        />
      </div>
    </div>
  );
}

function MediumIconCard({ icon, onSelect }: BaseIconCardProps) {
  const [isDarkVersion, setIsDarkVersion] = useState(false);
  
  // 优化：使用 useMemo 缓存图标 URL 计算
  const iconUrl = useMemo(() => {
    if (isDarkVersion && icon.hasLightVersion && icon.lightIconPath) {
      return `/icons/${icon.lightIconPath.replace('./../icons/', '')}`;
    }
    return `/icons/${icon.iconPath.replace('./../icons/', '')}`;
  }, [isDarkVersion, icon.hasLightVersion, icon.lightIconPath, icon.iconPath]);

  const handleClick = useCallback(async () => {
    // 打印图标的所有信息到控制台
    console.log('Icon Info:', icon);
    
    // 复制 iconId 到剪切板
    try {
      await navigator.clipboard.writeText(icon.name);
      toast.success('Icon name copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      toast.error('Failed to copy to clipboard');
    }
    
    // 调用原有的 onSelect 回调
    onSelect?.(icon);
  }, [icon, onSelect]);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    console.warn(`Failed to load icon: ${iconUrl}`, e);
  }, [iconUrl]);

  const handleToggleTheme = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDarkVersion(!isDarkVersion);
  }, [isDarkVersion]);

  return (
    <div
      className="
        w-28 h-28 p-3 rounded-lg border border-gray-200 dark:border-gray-700 
        bg-white dark:bg-gray-800 
        hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600
        transition-all duration-200 cursor-pointer
        flex flex-col items-center justify-center gap-2 relative group
      "
      onClick={handleClick}
      title={`${icon.name} (${icon.category})`}
    >
      {/* 明暗切换按钮 - 只有支持明暗版本的图标才显示 */}
      {icon.hasLightVersion && (
        <button
          onClick={handleToggleTheme}
          className="
            absolute -top-1 -right-1 w-6 h-6 rounded-full 
            bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600
            hover:bg-gray-200 dark:hover:bg-gray-600
            opacity-0 group-hover:opacity-100
            transition-all duration-200 ease-in-out
            flex items-center justify-center
            z-10 shadow-sm
          "
          title={isDarkVersion ? "Switch to dark version" : "Switch to light version"}
        >
          {isDarkVersion ? (
            <Moon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          ) : (
            <Sun className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          )}
        </button>
      )}
      
      <div className="w-12 h-12 flex items-center justify-center">
        <img
          src={iconUrl}
          alt={icon.name}
          className="w-full h-full object-contain transition-opacity duration-300 ease-in-out"
          onError={handleImageError}
          key={iconUrl} // 强制重新渲染当切换版本时
        />
      </div>
      <div className="text-center w-full">
        <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
          {icon.name}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
          {icon.category}
        </div>
      </div>
    </div>
  );
}

interface VirtualIconGridProps {
  icons: Array<IconInfo>;
  size: 'sm' | 'md';
  className?: string;
  scrollElement?: HTMLElement | null;
  onIconSelect?: (icon: IconInfo) => void;
}

export function VirtualIconGrid({
  icons,
  size = 'md',
  onIconSelect,
  className = '',
  scrollElement
}: VirtualIconGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1280);

  // 优化：防抖的宽度更新函数
  const updateWidth = useCallback(() => {
    if (parentRef.current) {
      setContainerWidth(parentRef.current.clientWidth);
    }
  }, []);

  // 监听容器宽度变化
  useEffect(() => {
    updateWidth();
    
    const resizeObserver = new ResizeObserver(updateWidth);
    if (parentRef.current) {
      resizeObserver.observe(parentRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateWidth]);

  // 优化：预计算布局常量，避免重复计算
  const layoutConfig = useMemo(() => ({
    sm: { iconWidth: 64, gap: 12, padding: 32, estimateSize: 80, gridGap: 'gap-3' },
    md: { iconWidth: 112, gap: 16, padding: 32, estimateSize: 140, gridGap: 'gap-4' }
  }), []);

  // 根据容器宽度和图标大小计算每行的列数
  const columnsPerRow = useMemo(() => {
    const config = layoutConfig[size];
    const availableWidth = containerWidth - config.padding;
    return Math.max(1, Math.floor(availableWidth / (config.iconWidth + config.gap)));
  }, [containerWidth, size, layoutConfig]);

  // 计算总行数
  const totalRows = Math.ceil(icons.length / columnsPerRow);

  // 创建虚拟化器
  const virtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => scrollElement || (parentRef.current?.parentElement) || null,
    estimateSize: () => layoutConfig[size].estimateSize,
    overscan: 2,
  });

  const items = virtualizer.getVirtualItems();
  const IconComponent = size === 'sm' ? SmallIconCard : MediumIconCard;
  const gridGap = layoutConfig[size].gridGap;

  return (
    <div className={className} ref={parentRef}>
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualRow) => {
          // 动态计算当前行的图标数据
          const startIndex = virtualRow.index * columnsPerRow;
          const endIndex = Math.min(startIndex + columnsPerRow, icons.length);
          const rowIcons = icons.slice(startIndex, endIndex);

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '16px',
              }}
            >
              <div 
                className={`flex ${gridGap} justify-center flex-wrap w-full max-w-7xl`}
              >
                {rowIcons.map((icon) => (
                  <IconComponent
                    key={`${icon.id}-${size}`}
                    icon={icon}
                    onSelect={onIconSelect}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
