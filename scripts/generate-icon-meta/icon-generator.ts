import { availableIconPacks } from 'material-icon-theme';
import { extractIconsFromManifest, getIconManifest } from './manifest-parser.js';
import type { IconCategory, IconInfo } from './types.js';

/**
 * 生成所有图标包的图标数据
 */
export function generateAllIcons(): Array<IconInfo> {
  const allIcons: Array<IconInfo> = [];
  const seenIconIds = new Set<string>();
  
  console.log('正在生成默认图标包数据...');
  // 获取默认图标包的图标（这些是基础图标，不属于任何特定包）
  const defaultManifest = getIconManifest();
  const defaultIcons = extractIconsFromManifest(defaultManifest);
  
  // 收集所有图标（先不去重，稍后统一处理）
  const tempIcons: Array<IconInfo & { pack?: string }> = [...defaultIcons];

  console.log(`已收集 ${defaultIcons.length} 个默认图标`);

  // 获取各个图标包的图标
  availableIconPacks.forEach((pack, index) => {
    console.log(`正在收集 ${pack} 图标包数据... (${index + 1}/${availableIconPacks.length})`);
    
    const manifest = getIconManifest(pack);
    const icons = extractIconsFromManifest(manifest);
    
    // 收集图标包特有的图标，添加包信息
    const iconsWithPack = icons.map(icon => ({ 
      ...icon, 
      pack,
      // 对于图标包特有的图标，使用更合理的 ID 命名
      id: `${pack}-${icon.name.replace(/[^a-zA-Z0-9-]/g, '-')}`
    }));
    
    tempIcons.push(...iconsWithPack);
    console.log(`${pack} 包收集了 ${icons.length} 个图标`);
  });

  console.log(`总共收集了 ${tempIcons.length} 个图标，开始去重...`);

  // 统一去重：优先保留默认包的图标，然后是特定包的图标
  tempIcons.forEach(icon => {
    if (!seenIconIds.has(icon.iconId)) {
      allIcons.push(icon);
      seenIconIds.add(icon.iconId);
    }
  });

  // 最终检查并确保所有 id 都是唯一的
  const idSet = new Set<string>();
  const finalIcons = allIcons.map((icon) => {
    let uniqueId = icon.id;
    let counter = 1;
    
    // 如果 id 重复，添加数字后缀
    while (idSet.has(uniqueId)) {
      uniqueId = `${icon.id}-${counter}`;
      counter++;
    }
    
    idSet.add(uniqueId);
    
    return {
      ...icon,
      id: uniqueId
    };
  });

  console.log(`最终生成了 ${finalIcons.length} 个唯一图标`);
  return finalIcons;
}

/**
 * 计算分类统计
 */
export function calculateCategories(icons: Array<IconInfo>) {
  const categories: { [key in IconCategory]: number } = {
    file: 0,
    folder: 0,
    language: 0,
    fileExtension: 0,
    fileName: 0,
  };

  icons.forEach(icon => {
    categories[icon.category]++;
  });

  return categories;
}
