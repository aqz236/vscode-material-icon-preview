import type { CategoryOption } from './types';

export const categories: Array<CategoryOption> = [
  { value: 'fileExtension', label: 'extension' },
  { value: 'fileName', label: 'file_name' },
  { value: 'folder', label: 'folder' },
  { value: 'language', label: 'language' },
  { value: 'file', label: 'file' },
];

// 暂时使用静态的图标包选项，之后可以从预生成数据中获取
export const iconPacks = ['angular', 'react', 'vue', 'svelte'];
