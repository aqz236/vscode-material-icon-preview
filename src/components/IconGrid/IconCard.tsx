import { useState } from 'react';

interface IconCardProps {
  name: string;
  category: 'file' | 'folder';
  description?: string;
  extensions?: Array<string>;
  fileNames?: Array<string>;
  folderNames?: Array<string>;
  hasLightVariant?: boolean;
}

export default function IconCard({ 
  name, 
  category, 
  description, 
  extensions, 
  fileNames, 
  folderNames,
  hasLightVariant 
}: IconCardProps) {
  const [imageError, setImageError] = useState(false);
  const [lightMode, setLightMode] = useState(false);

  const getIconPath = () => {
    const variant = lightMode && hasLightVariant ? '_light' : '';
    return `/icons/${name}${variant}.svg`;
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const getAssociations = () => {
    const associations = [];
    if (extensions?.length) {
      associations.push(`Extensions: ${extensions.join(', ')}`);
    }
    if (fileNames?.length) {
      associations.push(`Files: ${fileNames.join(', ')}`);
    }
    if (folderNames?.length) {
      associations.push(`Folders: ${folderNames.join(', ')}`);
    }
    return associations;
  };

  const copyIconName = () => {
    navigator.clipboard.writeText(name);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow duration-200">
      <div className="flex flex-col items-center space-y-3">
        {/* 图标显示区域 */}
        <div className="relative w-16 h-16 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg">
          {!imageError ? (
            <img
              src={getIconPath()}
              alt={name}
              className="w-12 h-12 object-contain"
              onError={handleImageError}
            />
          ) : (
            <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded flex items-center justify-center text-xs text-gray-500">
              缺失
            </div>
          )}
          
          {/* 类别标识 */}
          <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
            {category === 'file' ? 'F' : 'D'}
          </div>
        </div>

        {/* 图标名称 */}
        <div className="text-center">
          <button
            onClick={copyIconName}
            className="font-mono text-sm text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            title="点击复制图标名称"
          >
            {name}
          </button>
        </div>

        {/* 灯光模式切换 */}
        {hasLightVariant && (
          <button
            onClick={() => setLightMode(!lightMode)}
            className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors"
          >
            {lightMode ? '浅色' : '深色'}
          </button>
        )}

        {/* 描述信息 */}
        {description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 text-center line-clamp-2">
            {description}
          </p>
        )}

        {/* 关联信息 */}
        {getAssociations().length > 0 && (
          <div className="w-full">
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                关联信息
              </summary>
              <div className="mt-2 space-y-1">
                {getAssociations().map((association, index) => (
                  <div key={index} className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    {association}
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
