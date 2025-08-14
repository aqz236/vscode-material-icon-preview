#!/usr/bin/env bun
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { availableIconPacks, generateManifest } from 'material-icon-theme';
import type { IconPackValue, Manifest } from 'material-icon-theme';

// 类型定义
export interface IconInfo {
  id: string;
  name: string;
  iconPath: string;
  category: IconCategory;
  pack?: IconPackValue;
  iconId: string;
  hasLightVersion: boolean;
  lightIconPath?: string;
}

export type IconCategory = 'file' | 'folder' | 'language' | 'fileExtension' | 'fileName';

export interface IconMetadata {
  icons: Array<IconInfo>;
  totalCount: number;
  categories: { [key in IconCategory]: number };
  availablePacks: Array<IconPackValue>;
}

export interface InitialIconData {
  icons: Array<IconInfo>;
  totalCount: number;
  hasMore: boolean;
}

/**
 * 检测图标是否有明暗版本
 */
function detectLightVersion(iconPath: string): { hasLightVersion: boolean; lightIconPath?: string } {
  // 图标路径格式: "./../icons/xxx.svg"
  // 我们需要检查是否存在对应的 xxx_light.svg 文件
  
  if (!iconPath.endsWith('.svg')) {
    return { hasLightVersion: false };
  }
  
  // 移除 .svg 扩展名
  const basePath = iconPath.slice(0, -4);
  // 生成对应的 light 版本路径
  const lightPath = `${basePath}_light.svg`;
  
  // 检查文件是否存在
  // 将相对路径转换为绝对路径进行检查
  const absoluteIconPath = join(process.cwd(), 'public', lightPath.replace('./../', ''));
  const hasLightVersion = existsSync(absoluteIconPath);
  
  return {
    hasLightVersion,
    lightIconPath: hasLightVersion ? lightPath : undefined
  };
}

/**
 * 创建图标信息对象
 */
function createIconInfo(
  id: string,
  name: string,
  iconPath: string,
  category: IconCategory,
  iconId: string,
  pack?: IconPackValue
): IconInfo {
  const { hasLightVersion, lightIconPath } = detectLightVersion(iconPath);
  
  return {
    id,
    name,
    iconPath,
    category,
    iconId,
    pack,
    hasLightVersion,
    lightIconPath
  };
}

/**
 * 生成指定配置的图标清单
 */
function getIconManifest(activeIconPack?: IconPackValue): Manifest {
  return generateManifest({
    activeIconPack,
  });
}

/**
 * 从清单中提取所有图标信息
 */
function extractIconsFromManifest(manifest: Manifest): Array<IconInfo> {
  const icons: Array<IconInfo> = [];
  const iconDefinitions = manifest.iconDefinitions;

  if (!iconDefinitions) {
    return icons;
  }

  // 处理文件夹图标
  if (manifest.folderNames) {
    Object.entries(manifest.folderNames).forEach(([folderName, iconId]) => {
      icons.push(createIconInfo(
        `folder-${folderName}`,
        folderName,
        iconDefinitions[iconId].iconPath,
        'folder',
        iconId
      ));
    });
  }

  // 处理文件扩展名图标
  if (manifest.fileExtensions) {
    Object.entries(manifest.fileExtensions).forEach(([extension, iconId]) => {
      icons.push(createIconInfo(
        `ext-${extension}`,
        `.${extension}`,
        iconDefinitions[iconId].iconPath,
        'fileExtension',
        iconId
      ));
    });
  }

  // 处理特定文件名图标
  if (manifest.fileNames) {
    Object.entries(manifest.fileNames).forEach(([fileName, iconId]) => {
      icons.push(createIconInfo(
        `file-${fileName}`,
        fileName,
        iconDefinitions[iconId].iconPath,
        'fileName',
        iconId
      ));
    });
  }

  // 处理语言图标
  if (manifest.languageIds) {
    Object.entries(manifest.languageIds).forEach(([language, iconId]) => {
      icons.push(createIconInfo(
        `lang-${language}`,
        language,
        iconDefinitions[iconId].iconPath,
        'language',
        iconId
      ));
    });
  }

  // 处理默认文件图标
  if (manifest.file) {
    icons.push(createIconInfo(
      'default-file',
      'Default File',
      iconDefinitions[manifest.file].iconPath,
      'file',
      manifest.file
    ));
  }

  return icons;
}

/**
 * 生成所有图标包的图标数据
 */
function generateAllIcons(): Array<IconInfo> {
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
function calculateCategories(icons: Array<IconInfo>) {
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

/**
 * 主函数：生成图标元数据
 */
function main() {
  console.log('开始生成图标元数据...');
  
  const startTime = Date.now();
  
  // 确保输出目录存在
  const outputDir = join(process.cwd(), 'public', 'meta');
  mkdirSync(outputDir, { recursive: true });

  // 生成所有图标数据
  const icons = generateAllIcons();
  const categories = calculateCategories(icons);

  // 生成元数据
  const metadata: IconMetadata = {
    icons,
    totalCount: icons.length,
    categories,
    availablePacks: availableIconPacks,
  };

  // 写入文件
  const outputPath = join(outputDir, 'icons.json');
  writeFileSync(outputPath, JSON.stringify(metadata, null, 2));

  const endTime = Date.now();
  console.log(`✅ 图标元数据生成完成！`);
  console.log(`📁 输出路径: ${outputPath}`);
  console.log(`📊 总图标数: ${metadata.totalCount}`);
  console.log(`⏱️  耗时: ${endTime - startTime}ms`);
  console.log(`📦 可用图标包: ${metadata.availablePacks.join(', ')}`);
  
  // 分类统计
  console.log('\n📈 分类统计:');
  Object.entries(categories).forEach(([category, count]) => {
    console.log(`  ${category}: ${count}`);
  });
}

// 运行脚本
main();
