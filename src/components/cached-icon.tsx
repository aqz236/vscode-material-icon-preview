import { useCallback, useEffect, useRef, useState } from 'react';

// SVG 缓存管理器
class SVGCache {
  private cache = new Map<string, string>();
  private loadingPromises = new Map<string, Promise<string>>();
  private maxSize: number;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  async get(url: string): Promise<string> {
    // 检查缓存
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    // 检查是否正在加载
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    // 开始加载
    const loadPromise = this.loadSVG(url);
    this.loadingPromises.set(url, loadPromise);

    try {
      const svgContent = await loadPromise;
      
      // 如果缓存已满，删除最旧的项
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
        }
      }

      this.cache.set(url, svgContent);
      this.loadingPromises.delete(url);
      return svgContent;
    } catch (error) {
      this.loadingPromises.delete(url);
      throw error;
    }
  }

  private async loadSVG(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load SVG: ${response.statusText}`);
    }
    return response.text();
  }

  // 获取缓存统计
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      loadingCount: this.loadingPromises.size
    };
  }

  // 清空缓存
  clear() {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  // 预加载 SVG
  async preload(urls: Array<string>) {
    const promises = urls.map(url => this.get(url).catch(() => null));
    await Promise.allSettled(promises);
  }
}

// 全局缓存实例
const svgCache = new SVGCache();

interface CachedIconProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onError?: (error: Error) => void;
  onLoad?: () => void;
  fallbackSrc?: string;
}

/**
 * 带缓存的 SVG 图标组件
 * 将 SVG 内容缓存在内存中，避免重复的 HTTP 请求
 */
export function CachedIcon({ 
  src, 
  alt, 
  className = '', 
  style = {},
  onError,
  onLoad,
  fallbackSrc
}: CachedIconProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadIcon = useCallback(async (url: string) => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      const content = await svgCache.get(url);
      
      // 检查是否被取消
      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      setSvgContent(content);
      setIsLoading(false);
      onLoad?.();
    } catch (err) {
      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      const loadError = err instanceof Error ? err : new Error('Failed to load icon');
      setError(loadError);
      setIsLoading(false);
      onError?.(loadError);
      
      // 尝试加载备用图标
      if (fallbackSrc && url !== fallbackSrc) {
        loadIcon(fallbackSrc);
      }
    }
  }, [onError, onLoad, fallbackSrc]);

  useEffect(() => {
    loadIcon(src);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [src, loadIcon]);

  // 加载中状态
  if (isLoading) {
    return (
      <div 
        className={`${className} animate-pulse bg-gray-200 dark:bg-gray-700 rounded`}
        style={style}
        title={`Loading ${alt}...`}
      />
    );
  }

  // 错误状态
  if (error || !svgContent) {
    return (
      <div 
        className={`${className} bg-gray-100 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs`}
        style={style}
        title={`Failed to load ${alt}: ${error?.message || 'Unknown error'}`}
      >
        ?
      </div>
    );
  }

  // 成功加载，渲染 SVG
  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: svgContent }}
      title={alt}
    />
  );
}

// 导出缓存管理工具
export const iconCache = {
  getStats: () => svgCache.getStats(),
  clear: () => svgCache.clear(),
  preload: (urls: Array<string>) => svgCache.preload(urls)
};

// 预加载 Hook
export function useIconPreloader() {
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [isPreloading, setIsPreloading] = useState(false);

  const preloadIcons = useCallback(async (urls: Array<string>) => {
    if (urls.length === 0) return;

    setIsPreloading(true);
    setPreloadProgress(0);

    const batchSize = 10; // 批量加载大小
    const batches = [];
    
    for (let i = 0; i < urls.length; i += batchSize) {
      batches.push(urls.slice(i, i + batchSize));
    }

    for (let i = 0; i < batches.length; i++) {
      await svgCache.preload(batches[i]);
      setPreloadProgress(((i + 1) / batches.length) * 100);
    }

    setIsPreloading(false);
  }, []);

  return {
    preloadIcons,
    preloadProgress,
    isPreloading
  };
}
