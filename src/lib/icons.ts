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
  colors?: Array<string>; // HEX 颜色值数组
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
 * 计算两个颜色之间的差异度
 * 使用欧几里得距离计算 RGB 颜色空间中的距离
 */
function calculateColorDistance(color1: string, color2: string): number {
  const hex1 = color1.replace('#', '')
  const hex2 = color2.replace('#', '')
  
  const r1 = parseInt(hex1.substr(0, 2), 16)
  const g1 = parseInt(hex1.substr(2, 2), 16)
  const b1 = parseInt(hex1.substr(4, 2), 16)
  
  const r2 = parseInt(hex2.substr(0, 2), 16)
  const g2 = parseInt(hex2.substr(2, 2), 16)
  const b2 = parseInt(hex2.substr(4, 2), 16)
  
  return Math.sqrt(
    Math.pow(r2 - r1, 2) + 
    Math.pow(g2 - g1, 2) + 
    Math.pow(b2 - b1, 2)
  )
}

/**
 * 检查颜色是否在选定范围内
 */
function isColorInRange(targetColor: string, selectedColor: string, radius: number): boolean {
  const distance = calculateColorDistance(targetColor, selectedColor)
  // 将半径映射到 0-441 的范围（RGB 最大距离约为 441）
  const maxDistance = (radius / 100) * 441
  return distance <= maxDistance
}

/**
 * 搜索和筛选图标
 */
export function searchIcons(
  icons: Array<IconInfo>,
  searchTerm: string = '',
  category?: IconCategory,
  pack?: string,
  colorFilter?: { color: string; radius: number }
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

  // 按颜色过滤
  if (colorFilter) {
    filteredIcons = filteredIcons.filter(icon => {
      if (!icon.colors || icon.colors.length === 0) return false;
      return icon.colors.some(color => 
        isColorInRange(color, colorFilter.color, colorFilter.radius)
      );
    });
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
