import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 检测图标是否有明暗版本
 */
export function detectLightVersion(iconPath: string): { hasLightVersion: boolean; lightIconPath?: string } {
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
