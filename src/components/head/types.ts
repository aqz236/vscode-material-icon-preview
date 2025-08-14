import type { IconCategory } from '@/lib/icons';

export interface HeadProps {
  searchTerm: string;
  category?: IconCategory;
  iconPack?: string;
  viewSize: 'sm' | 'md';
  onSearchChange: (term: string) => void;
  onCategoryChange: (category?: IconCategory) => void;
  onIconPackChange: (pack?: string) => void;
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
