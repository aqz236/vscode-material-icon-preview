import { fileIcons } from './fileIcons';
import { folderIcons } from './folderIcons';

export interface IconInfo {
  name: string;
  category: 'file' | 'folder';
  extensions?: Array<string>;
  fileNames?: Array<string>;
  folderNames?: Array<string>;
  description?: string;
  hasLightVariant?: boolean;
}

// 提取所有文件图标信息
export function getFileIcons(): Array<IconInfo> {
  const icons: Array<IconInfo> = [];
  
  fileIcons.icons.forEach(icon => {
    icons.push({
      name: icon.name,
      category: 'file',
      extensions: icon.fileExtensions,
      fileNames: icon.fileNames,
      hasLightVariant: icon.light || false,
      description: `File icon for ${icon.fileExtensions?.join(', ') || icon.fileNames?.join(', ') || icon.name}`
    });
  });

  // 添加默认文件图标
  icons.push({
    name: fileIcons.defaultIcon.name,
    category: 'file',
    description: 'Default file icon'
  });

  return icons;
}

// 提取所有文件夹图标信息
export function getFolderIcons(): Array<IconInfo> {
  const icons: Array<IconInfo> = [];
  
  folderIcons.forEach(theme => {
    // 添加默认文件夹图标
    icons.push({
      name: theme.defaultIcon.name,
      category: 'folder',
      description: 'Default folder icon'
    });

    // 添加根文件夹图标
    if (theme.rootFolder) {
      icons.push({
        name: theme.rootFolder.name,
        category: 'folder',
        description: 'Root folder icon'
      });
    }

    // 添加特定文件夹图标
    theme.icons?.forEach(icon => {
      icons.push({
        name: icon.name,
        category: 'folder',
        folderNames: icon.folderNames,
        description: `Folder icon for ${icon.folderNames?.join(', ') || icon.name}`
      });
    });
  });

  return icons;
}

// 获取所有图标
export function getAllIcons(): Array<IconInfo> {
  const fileIconsList = getFileIcons();
  const folderIconsList = getFolderIcons();
  
  return [...fileIconsList, ...folderIconsList];
}

// 按名称搜索图标
export function searchIcons(query: string): Array<IconInfo> {
  const allIcons = getAllIcons();
  const searchTerm = query.toLowerCase();
  
  return allIcons.filter(icon => 
    icon.name.toLowerCase().includes(searchTerm) ||
    icon.description?.toLowerCase().includes(searchTerm) ||
    icon.extensions?.some(ext => ext.toLowerCase().includes(searchTerm)) ||
    icon.fileNames?.some(name => name.toLowerCase().includes(searchTerm)) ||
    icon.folderNames?.some(name => name.toLowerCase().includes(searchTerm))
  );
}

// 按类别筛选图标
export function getIconsByCategory(category: 'file' | 'folder'): Array<IconInfo> {
  return getAllIcons().filter(icon => icon.category === category);
}
