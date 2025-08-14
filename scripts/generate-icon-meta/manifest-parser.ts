import { generateManifest } from 'material-icon-theme';
import { createIconInfo } from './icon-factory.js';
import type { IconPackValue, Manifest } from 'material-icon-theme';
import type { IconInfo } from './types.js';

/**
 * 生成指定配置的图标清单
 */
export function getIconManifest(activeIconPack?: IconPackValue): Manifest {
  return generateManifest({
    activeIconPack,
  });
}

/**
 * 从清单中提取所有图标信息
 */
export function extractIconsFromManifest(manifest: Manifest): Array<IconInfo> {
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
