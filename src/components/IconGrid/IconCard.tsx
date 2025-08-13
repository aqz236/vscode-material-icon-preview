import { useState } from 'react';
import { ChevronDown, Copy } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`Copied "${text}" to clipboard`, {
        description: 'Ready to use in your project',
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const getAssociations = () => {
    const associations = [];
    if (extensions?.length) {
      associations.push({
        type: 'Extensions',
        items: extensions
      });
    }
    if (fileNames?.length) {
      associations.push({
        type: 'File Names',
        items: fileNames
      });
    }
    if (folderNames?.length) {
      associations.push({
        type: 'Folder Names',
        items: folderNames
      });
    }
    return associations;
  };

  const hasAssociations = getAssociations().length > 0;

  // 获取第一个关联项的值
  const getFirstAssociatedValue = () => {
    const associations = getAssociations();
    if (associations.length > 0 && associations[0].items.length > 0) {
      return associations[0].items[0];
    }
    return null;
  };

  const handleIconClick = () => {
    const firstValue = getFirstAssociatedValue();
    if (firstValue) {
      copyToClipboard(firstValue);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow duration-200">
      <div className="flex flex-col items-center space-y-3">
        {/* Icon Display Area */}
        <button 
          onClick={handleIconClick}
          className="relative w-16 h-16 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
          disabled={!hasAssociations}
          title={hasAssociations ? `Click to copy: ${getFirstAssociatedValue()}` : 'No associations available'}
        >
          {!imageError ? (
            <img
              src={getIconPath()}
              alt={name}
              className="w-12 h-12 object-contain"
              onError={handleImageError}
            />
          ) : (
            <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded flex items-center justify-center text-xs text-gray-500">
              Missing
            </div>
          )}
          
          {/* Category Badge */}
          <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
            {category === 'file' ? 'F' : 'D'}
          </div>
        </button>

        {/* Icon Name with Dropdown */}
        <div className="text-center w-full">
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={handleIconClick}
              className={`font-mono text-sm transition-colors ${
                hasAssociations 
                  ? 'text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer' 
                  : 'text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
              disabled={!hasAssociations}
              title={hasAssociations ? `Click to copy: ${getFirstAssociatedValue()}` : 'No associations available'}
            >
              {name}
            </button>
            
            {hasAssociations && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                    <ChevronDown className="w-3 h-3 text-gray-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  side="top" 
                  align="center" 
                  className="w-64 max-h-80 overflow-y-auto"
                  sideOffset={8}
                >
                  <DropdownMenuLabel>Associated Items (Click to Copy)</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {getAssociations().map((group, groupIndex) => (
                    <div key={group.type}>
                      <DropdownMenuLabel className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                        {group.type}
                      </DropdownMenuLabel>
                      {group.items.map((item, itemIndex) => (
                        <DropdownMenuItem
                          key={`${group.type}-${itemIndex}`}
                          onClick={() => copyToClipboard(item)}
                          className="flex items-center justify-between cursor-pointer"
                        >
                          <span className="font-mono text-sm">{item}</span>
                          <Copy className="w-3 h-3" />
                        </DropdownMenuItem>
                      ))}
                      {groupIndex < getAssociations().length - 1 && <DropdownMenuSeparator />}
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Light Mode Toggle */}
        {hasLightVariant && (
          <button
            onClick={() => setLightMode(!lightMode)}
            className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors"
          >
            {lightMode ? 'Light' : 'Dark'}
          </button>
        )}

        {/* Description */}
        {description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 text-center line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
