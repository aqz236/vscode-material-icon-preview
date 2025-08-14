import { availableIconPacks } from 'material-icon-theme';
import { extractIconsFromManifest, getIconManifest } from './manifest-parser.js';
import type { IconCategory, IconInfo } from './types.js';

/**
 * 生成所有图标包的图标数据
 */
export function generateAllIcons(): Array<IconInfo> {
  const allIcons: Array<IconInfo> = [];
  
  console.log('正在生成默认图标包数据...');
  // 获取默认图标包的图标
  const defaultManifest = getIconManifest();
  const defaultIcons = extractIconsFromManifest(defaultManifest);
  allIcons.push(...defaultIcons);

  console.log(`已生成 ${defaultIcons.length} 个默认图标`);

  // 获取各个图标包的图标
  availableIconPacks.forEach((pack, index) => {
    console.log(`正在生成 ${pack} 图标包数据... (${index + 1}/${availableIconPacks.length})`);
    
    const manifest = getIconManifest(pack);
    const icons = extractIconsFromManifest(manifest);
    const iconsWithPack = icons.map(icon => ({ 
      ...icon, 
      pack,
      // 为每个图标包的图标添加包名前缀，确保 id 唯一
      id: `${pack}-${icon.id}`
    }));
    allIcons.push(...iconsWithPack);
    
    console.log(`${pack} 包生成了 ${icons.length} 个图标`);
  });

  console.log('正在去重和唯一化ID...');
  // 去重（基于 iconPath）并确保 id 唯一
  const uniqueIcons = allIcons.reduce((acc, icon) => {
    const existingIcon = acc.find(existing => existing.iconPath === icon.iconPath);
    if (!existingIcon) {
      acc.push(icon);
    } else if (icon.pack && !existingIcon.pack) {
      // 如果新图标有包信息而现有图标没有，则替换
      const index = acc.indexOf(existingIcon);
      acc[index] = icon;
    }
    return acc;
  }, [] as Array<IconInfo>);

  // 最终检查并确保所有 id 都是唯一的
  const idSet = new Set<string>();
  const finalIcons = uniqueIcons.map((icon) => {
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

  console.log(`去重后共生成 ${finalIcons.length} 个图标`);
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
