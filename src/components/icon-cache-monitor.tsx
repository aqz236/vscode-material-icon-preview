// import { useEffect, useState } from 'react';
// import { Database, RefreshCw, Trash2 } from 'lucide-react';
// import { iconCache } from '@/components/cached-icon';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
// import { Button } from '@/components/ui/button';

// interface CacheStats {
//   size: number;
//   maxSize: number;
//   loadingCount: number;
// }

// interface IconCacheMonitorProps {
//   className?: string;
// }

// export function IconCacheMonitor({ className }: IconCacheMonitorProps) {
//   const [stats, setStats] = useState<CacheStats>({ size: 0, maxSize: 500, loadingCount: 0 });
//   const [isExpanded, setIsExpanded] = useState(false);

//   const updateStats = () => {
//     setStats(iconCache.getStats());
//   };

//   useEffect(() => {
//     // 初始更新
//     updateStats();

//     // 定期更新统计信息
//     const interval = setInterval(updateStats, 2000);
//     return () => clearInterval(interval);
//   }, []);

//   const handleClearCache = () => {
//     iconCache.clear();
//     updateStats();
//   };

//   const getCacheHealthColor = () => {
//     const usage = (stats.size / stats.maxSize) * 100;
//     if (usage < 50) return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
//     if (usage < 80) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';
//     return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
//   };

//   const usage = Math.round((stats.size / stats.maxSize) * 100);

//   if (!isExpanded) {
//     return (
//       <Button
//         variant="outline"
//         size="sm"
//         onClick={() => setIsExpanded(true)}
//         className={`px-2 py-1 h-8 text-xs ${className}`}
//       >
//         <Database className="w-3 h-3 mr-1" />
//         SVG Cache ({stats.size}/{stats.maxSize})
//         {stats.loadingCount > 0 && (
//           <RefreshCw className="w-3 h-3 ml-1 animate-spin" />
//         )}
//       </Button>
//     );
//   }

//   return (
//     <Card className={`w-80 ${className}`}>
//       <CardHeader className="pb-3">
//         <div className="flex items-center justify-between">
//           <CardTitle className="text-sm flex items-center gap-2">
//             <Database className="w-4 h-4" />
//             SVG Icon Cache
//           </CardTitle>
//           <Button
//             variant="ghost"
//             size="sm"
//             onClick={() => setIsExpanded(false)}
//             className="h-6 w-6 p-0"
//           >
//             ×
//           </Button>
//         </div>
//         <CardDescription className="text-xs">
//           实时 SVG 图标缓存状态监控
//         </CardDescription>
//       </CardHeader>
      
//       <CardContent className="space-y-4">
//         {/* 缓存使用率 */}
//         <div className="space-y-2">
//           <div className="flex items-center justify-between">
//             <span className="text-xs text-gray-600 dark:text-gray-400">Cache Usage</span>
//             <Badge variant="secondary" className={getCacheHealthColor()}>
//               {usage}%
//             </Badge>
//           </div>
          
//           <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
//             <div 
//               className="bg-blue-500 h-2 rounded-full transition-all duration-300"
//               style={{ width: `${usage}%` }}
//             />
//           </div>
          
//           <div className="flex justify-between text-xs text-gray-500">
//             <span>{stats.size} cached</span>
//             <span>max {stats.maxSize}</span>
//           </div>
//         </div>

//         {/* 加载状态 */}
//         {stats.loadingCount > 0 && (
//           <div className="flex items-center gap-2 text-xs">
//             <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
//             <span className="text-gray-600 dark:text-gray-400">
//               Loading {stats.loadingCount} icons...
//             </span>
//           </div>
//         )}

//         {/* 缓存效果说明 */}
//         <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
//           <div className="flex justify-between">
//             <span>Cached Icons:</span>
//             <span className="font-medium">{stats.size}</span>
//           </div>
//           <div className="flex justify-between">
//             <span>Memory Usage:</span>
//             <span className="font-medium">~{Math.round(stats.size * 2.5)}KB</span>
//           </div>
//           <div className="flex justify-between">
//             <span>HTTP Requests Saved:</span>
//             <span className="font-medium text-green-600 dark:text-green-400">
//               {stats.size > 0 ? `${stats.size * 3}+` : '0'}
//             </span>
//           </div>
//         </div>

//         {/* 操作按钮 */}
//         <div className="flex gap-2">
//           <Button
//             onClick={updateStats}
//             size="sm"
//             variant="outline"
//             className="flex-1 text-xs h-8"
//           >
//             <RefreshCw className="w-3 h-3 mr-1" />
//             刷新
//           </Button>
          
//           <Button
//             onClick={handleClearCache}
//             size="sm"
//             variant="outline"
//             className="flex-1 text-xs h-8"
//             disabled={stats.size === 0}
//           >
//             <Trash2 className="w-3 h-3 mr-1" />
//             清空
//           </Button>
//         </div>

//         {/* 说明文字 */}
//         <div className="text-xs text-gray-500 leading-relaxed">
//           <p className="mb-1">• <strong>内存缓存</strong>：避免重复 HTTP 请求</p>
//           <p className="mb-1">• <strong>自动清理</strong>：缓存满时移除最旧项</p>
//           <p>• <strong>即时加载</strong>：滚动时快速显示图标</p>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }
