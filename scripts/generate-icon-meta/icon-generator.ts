import { availableIconPacks } from 'material-icon-theme';
import { extractIconsFromManifest, getIconManifest } from './manifest-parser.js';
import type { IconCategory, IconInfo } from './types.js';

/**
 * 生成所有图标包的图标数据
 */
export function generateAllIcons(): Array<IconInfo> {
  const allIcons: Array<IconInfo> = [];
  const seenPaths = new Set<string>();
  
  console.log('正在生成默认图标包数据...');
  // 获取默认图标包的图标（这些是基础图标，不属于任何特定包）
  const defaultManifest = getIconManifest();
  const defaultIcons = extractIconsFromManifest(defaultManifest);
  
  // 添加默认图标，不添加包前缀
  defaultIcons.forEach(icon => {
    if (!seenPaths.has(icon.iconPath)) {
      allIcons.push(icon);
      seenPaths.add(icon.iconPath);
    }
  });

  console.log(`已生成 ${defaultIcons.length} 个默认图标`);

  // 获取各个图标包的图标
  availableIconPacks.forEach((pack, index) => {
    console.log(`正在生成 ${pack} 图标包数据... (${index + 1}/${availableIconPacks.length})`);
    
    const manifest = getIconManifest(pack);
    const icons = extractIconsFromManifest(manifest);
    
    // 只添加该图标包特有的新图标
    const newPackIcons = icons.filter(icon => !seenPaths.has(icon.iconPath));
    const iconsWithPack = newPackIcons.map(icon => ({ 
      ...icon, 
      pack,
      // 对于图标包特有的图标，使用更合理的 ID 命名
      id: `${pack}-${icon.name.replace(/[^a-zA-Z0-9-]/g, '-')}`
    }));
    
    iconsWithPack.forEach(icon => {
      allIcons.push(icon);
      seenPaths.add(icon.iconPath);
    });
    
    console.log(`${pack} 包新增了 ${newPackIcons.length} 个特有图标`);
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
