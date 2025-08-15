import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface ColorPickerProps {
  selectedColor?: string
  colorRadius?: number
  onColorChange: (color?: string, radius?: number) => void
  onClear: () => void
}

// 预设颜色调色板
const PRESET_COLORS = [
  "#ef5350", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5", "#2196f3",
  "#03a9f4", "#00bcd4", "#009688", "#4caf50", "#8bc34a", "#cddc39",
  "#ffeb3b", "#ffc107", "#ff9800", "#ff5722", "#795548", "#9e9e9e",
  "#607d8b", "#000000", "#ffffff", "#f44336", "#e53935", "#d32f2f",
  "#c62828", "#b71c1c", "#ff1744", "#f50057", "#c51162", "#880e4f",
  "#ad1457", "#8e24aa", "#7b1fa2", "#6a1b9a", "#4a148c", "#ea80fc",
  "#e040fb", "#d500f9", "#aa00ff", "#7c4dff", "#651fff", "#6200ea",
  "#3d5afe", "#304ffe", "#2962ff", "#0091ea", "#00b0ff", "#0288d1",
  "#0277bd", "#01579b", "#006064", "#00695c", "#00796b", "#388e3c",
  "#689f38", "#9e9d24", "#f57f17", "#ff6f00", "#e65100", "#bf360c"
] as const

// 颜色按钮组件 - 使用 memo 避免不必要的重渲染
const ColorButton = memo(({ 
  color, 
  isSelected, 
  onSelect 
}: { 
  color: string
  isSelected: boolean
  onSelect: (color: string) => void 
}) => (
  <button
    onClick={() => onSelect(color)}
    className={cn(
      "w-6 h-6 rounded-md border-2 transition-all duration-150",
      "hover:scale-110 hover:shadow-md",
      isSelected 
        ? "border-blue-500 ring-2 ring-blue-500/30" 
        : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
    )}
    style={{ backgroundColor: color }}
    title={color}
  />
))

/**
 * 计算两个颜色之间的差异度
 * 使用欧几里得距离计算 RGB 颜色空间中的距离
 * 增加了缓存机制提高性能
 */
const colorDistanceCache = new Map<string, number>()

function calculateColorDistance(color1: string, color2: string): number {
  const cacheKey = `${color1}-${color2}`
  
  if (colorDistanceCache.has(cacheKey)) {
    return colorDistanceCache.get(cacheKey)!
  }
  
  const hex1 = color1.replace('#', '')
  const hex2 = color2.replace('#', '')
  
  const r1 = parseInt(hex1.substring(0, 2), 16)
  const g1 = parseInt(hex1.substring(2, 4), 16)
  const b1 = parseInt(hex1.substring(4, 6), 16)
  
  const r2 = parseInt(hex2.substring(0, 2), 16)
  const g2 = parseInt(hex2.substring(2, 4), 16)
  const b2 = parseInt(hex2.substring(4, 6), 16)
  
  const distance = Math.sqrt(
    Math.pow(r2 - r1, 2) + 
    Math.pow(g2 - g1, 2) + 
    Math.pow(b2 - b1, 2)
  )
  
  colorDistanceCache.set(cacheKey, distance)
  return distance
}

/**
 * 检查颜色是否在选定范围内
 */
export function isColorInRange(targetColor: string, selectedColor: string, radius: number): boolean {
  const distance = calculateColorDistance(targetColor, selectedColor)
  // 将半径映射到 0-441 的范围（RGB 最大距离约为 441）
  const maxDistance = (radius / 100) * 441
  return distance <= maxDistance
}

export function ColorPicker({ selectedColor, colorRadius = 20, onColorChange, onClear }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentRadius, setCurrentRadius] = useState(colorRadius)

  // 同步外部传入的 colorRadius
  useEffect(() => {
    setCurrentRadius(colorRadius)
  }, [colorRadius])

  // 使用 useMemo 缓存样式表创建逻辑
  const sliderStyles = useMemo(() => {
    return `
      .slider::-webkit-slider-thumb {
        appearance: none;
        height: 16px;
        width: 16px;
        border-radius: 50%;
        background: #3b82f6;
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }

      .slider::-moz-range-thumb {
        height: 16px;
        width: 16px;
        border-radius: 50%;
        background: #3b82f6;
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
    `
  }, [])

  // 添加滑块样式，使用 useEffect 但优化了依赖
  useEffect(() => {
    if (typeof document === 'undefined') return

    const styleSheet = document.createElement("style")
    styleSheet.innerText = sliderStyles
    document.head.appendChild(styleSheet)
    
    return () => {
      if (document.head.contains(styleSheet)) {
        document.head.removeChild(styleSheet)
      }
    }
  }, [sliderStyles])

  // 使用 useCallback 缓存事件处理函数
  const handleColorSelect = useCallback((color: string) => {
    onColorChange(color, currentRadius)
  }, [onColorChange, currentRadius])

  const handleRadiusChange = useCallback((radius: number) => {
    setCurrentRadius(radius)
    if (selectedColor) {
      onColorChange(selectedColor, radius)
    }
  }, [onColorChange, selectedColor])

  const handleClear = useCallback(() => {
    onClear()
    setIsOpen(false)
  }, [onClear])

  // 使用 useCallback 缓存自定义颜色输入处理
  const handleCustomColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      handleColorSelect(value)
    }
  }, [handleColorSelect])

  // 缓存按钮类名
  const buttonClassName = useMemo(() => cn(
    "px-3 py-2 border border-white/30 dark:border-gray-600/30 rounded-lg",
    "backdrop-blur-md bg-white/20 dark:bg-black/20 text-gray-900 dark:text-gray-100 text-sm",
    "focus:outline-none focus:bg-white/30 dark:focus:bg-black/30",
    "transition-all duration-200 shadow-inner",
    "flex items-center gap-2 min-w-[120px] justify-between",
    selectedColor && "border-2 border-blue-400/50"
  ), [selectedColor])

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={buttonClassName}
        >
          <div className="flex items-center gap-2">
            {selectedColor ? (
              <div 
                className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: selectedColor }}
              />
            ) : (
              <Palette className="w-4 h-4" />
            )}
            <span>{selectedColor ? 'Color' : 'Color Filter'}</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="backdrop-blur-md bg-white/95 dark:bg-black/95 border border-white/30 dark:border-gray-600/30 w-64 p-4"
        align="start"
      >
        <div className="space-y-4">
          {/* 颜色选择标题 */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Select Color Range</span>
            {selectedColor && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-6 px-2 text-xs"
              >
                Clear
              </Button>
            )}
          </div>

          {/* 半径调节器 */}
          {selectedColor && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>Range: {currentRadius}%</span>
                <span>Tolerance</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                value={currentRadius}
                onChange={(e) => handleRadiusChange(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          )}

          {/* 颜色网格 */}
          <div className="grid grid-cols-8 gap-1.5">
            {PRESET_COLORS.map((color) => (
              <ColorButton
                key={color}
                color={color}
                isSelected={selectedColor === color}
                onSelect={handleColorSelect}
              />
            ))}
          </div>

          {/* 自定义颜色输入 */}
          <div className="space-y-2">
            <label className="text-xs text-gray-600 dark:text-gray-400">
              Custom Color (HEX):
            </label>
            <input
              type="text"
              placeholder="#ffffff"
              className="w-full px-2 py-1 text-xs bg-white/50 dark:bg-black/50 border border-gray-300 dark:border-gray-600 rounded"
              onChange={handleCustomColorChange}
            />
          </div>

          {/* 当前选择的颜色信息 */}
          {selectedColor && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-xs">
                <div 
                  className="w-4 h-4 rounded border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: selectedColor }}
                />
                <span className="font-mono">{selectedColor}</span>
                <span className="text-gray-500">±{currentRadius}%</span>
              </div>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
