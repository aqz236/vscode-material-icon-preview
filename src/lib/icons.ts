// 类型定义
export interface IconInfo {
  id: string;
  name: string;
  iconPath: string;
  category: IconCategory;
  pack?: string;
  iconId: string;
  hasLightVersion: boolean;
  lightIconPath?: string;
}

export type IconCategory = 'file' | 'folder' | 'language' | 'fileExtension' | 'fileName';

export interface IconMetadata {
  icons: Array<IconInfo>;
  totalCount: number;
  categories: { [key in IconCategory]: number };
  availablePacks: Array<string>;
}

export interface IconSearchResult {
  icons: Array<IconInfo>;
  totalCount: number;
  categories: { [key in IconCategory]: number };
}

export interface InitialIconsData {
  icons: Array<IconInfo>;
  totalCount: number;
  hasMore: boolean;
}

/**
 * 从预生成的JSON文件加载图标数据
 */
export async function loadIconsMetadata(): Promise<IconMetadata> {
  try {
    const response = await fetch('/meta/icons.json');
    if (!response.ok) {
      throw new Error(`Failed to load icons metadata: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading icons metadata:', error);
    // 返回空数据作为后备
    return {
      icons: [],
      totalCount: 0,
      categories: {
        file: 0,
        folder: 0,
        language: 0,
        fileExtension: 0,
        fileName: 0,
      },
      availablePacks: [],
    };
  }
}

/**
 * 搜索和筛选图标
 */
export function searchIcons(
  icons: Array<IconInfo>,
  searchTerm: string = '',
  category?: IconCategory,
  pack?: string
): IconSearchResult {
  let filteredIcons = icons;

  // 按分类过滤
  if (category) {
    filteredIcons = filteredIcons.filter(icon => icon.category === category);
  }

  // 按图标包过滤
  if (pack) {
    filteredIcons = filteredIcons.filter(icon => icon.pack === pack);
  }

  // 模糊搜索
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    filteredIcons = filteredIcons.filter(icon =>
      icon.name.toLowerCase().includes(searchLower) ||
      icon.id.toLowerCase().includes(searchLower)
    );
  }

  // 统计各分类的数量
  const categories: { [key in IconCategory]: number } = {
    file: 0,
    folder: 0,
    language: 0,
    fileExtension: 0,
    fileName: 0,
  };

  filteredIcons.forEach(icon => {
    categories[icon.category]++;
  });

  return {
    icons: filteredIcons,
    totalCount: filteredIcons.length,
    categories,
  };
}

/**
 * 根据图标路径获取完整的 URL
 */
export function getIconUrl(iconPath: string): string {
  // material-icon-theme 的图标路径是相对路径，需要转换为静态资源路径
  const iconName = iconPath.replace('./../icons/', '');
  return `/icons/${iconName}`;
}
