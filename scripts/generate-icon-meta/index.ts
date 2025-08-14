#!/usr/bin/env bun
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { availableIconPacks } from 'material-icon-theme';
import { calculateCategories, generateAllIcons } from './icon-generator.js';
import type { IconMetadata } from './types.js';

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
