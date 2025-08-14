import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * RGB 转 HEX
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number): string => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 解析 SVG 文件中的颜色信息
 */
export function parseColorsFromSvg(iconPath: string): Array<string> {
  try {
    // 将相对路径转换为绝对路径
    const absolutePath = join(process.cwd(), 'public', iconPath.replace('./../', ''));
    
    if (!existsSync(absolutePath)) {
      return [];
    }
    
    const svgContent = readFileSync(absolutePath, 'utf-8');
    const colors = new Set<string>();
    
    // 匹配 HEX 颜色 (#后跟3或6位十六进制字符)
    const hexRegex = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
    let match;
    while ((match = hexRegex.exec(svgContent)) !== null) {
      let hex = match[0].toLowerCase();
      // 将3位HEX转为6位
      if (hex.length === 4) {
        hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
      }
      colors.add(hex);
    }
    
    // 匹配 RGB 颜色 rgb(r, g, b)
    const rgbRegex = /rgb\s*\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*\)/gi;
    while ((match = rgbRegex.exec(svgContent)) !== null) {
      const r = parseFloat(match[1]);
      const g = parseFloat(match[2]);
      const b = parseFloat(match[3]);
      colors.add(rgbToHex(r, g, b));
    }
    
    // 匹配 RGBA 颜色 rgba(r, g, b, a) - 只提取RGB部分
    const rgbaRegex = /rgba\s*\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*[\d.]+\s*\)/gi;
    while ((match = rgbaRegex.exec(svgContent)) !== null) {
      const r = parseFloat(match[1]);
      const g = parseFloat(match[2]);
      const b = parseFloat(match[3]);
      colors.add(rgbToHex(r, g, b));
    }
    
    // 过滤掉无效颜色（如 #000000 和 #ffffff 可能是背景色，根据需要可以保留）
    return Array.from(colors);
  } catch (error) {
    console.warn(`解析颜色失败: ${iconPath}`, error);
    return [];
  }
}
