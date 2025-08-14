import { detectLightVersion } from './file-detector.js';
import { parseColorsFromSvg } from './color-parser.js';
import type { IconPackValue } from 'material-icon-theme';
import type { IconCategory, IconInfo } from './types.js';

/**
 * 创建图标信息对象
 */
export function createIconInfo(
  id: string,
  name: string,
  iconPath: string,
  category: IconCategory,
  iconId: string,
  pack?: IconPackValue
): IconInfo {
  const { hasLightVersion, lightIconPath } = detectLightVersion(iconPath);
  const colors = parseColorsFromSvg(iconPath);
  
  return {
    id,
    name,
    iconPath,
    category,
    iconId,
    pack,
    hasLightVersion,
    lightIconPath,
    colors
  };
}
