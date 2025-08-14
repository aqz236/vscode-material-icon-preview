// 导出所有类型
export type * from './types.js';

// 导出所有功能模块
export { parseColorsFromSvg } from './color-parser.js';
export { detectLightVersion } from './file-detector.js';
export { createIconInfo } from './icon-factory.js';
export { extractIconsFromManifest, getIconManifest } from './manifest-parser.js';
export { calculateCategories, generateAllIcons } from './icon-generator.js';
