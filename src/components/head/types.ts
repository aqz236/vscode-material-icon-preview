import type { IconCategory } from '@/lib/icons';

export interface HeadProps {
  searchTerm: string;
  category?: IconCategory;
  iconPack?: string;
  colorFilter?: { color: string; radius: number };
  viewSize: 'sm' | 'md';
  onSearchChange: (term: string) => void;
  onCategoryChange: (category?: IconCategory) => void;
  onIconPackChange: (pack?: string) => void;
  onColorFilterChange: (colorFilter?: { color: string; radius: number }) => void;
  onViewSizeChange: (size: 'sm' | 'md') => void;
  totalCount: number;
}

export interface CategoryOption {
  value: IconCategory;
  label: string;
}

export interface ViewSizeOption {
  value: 'sm' | 'md';
  label: string;
  icon: React.ReactNode;
}
