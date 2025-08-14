import type { IconPackValue } from 'material-icon-theme';

export type IconCategory = 'file' | 'folder' | 'language' | 'fileExtension' | 'fileName';

export interface IconInfo {
  id: string;
  name: string;
  iconPath: string;
  category: IconCategory;
  pack?: IconPackValue;
  iconId: string;
  hasLightVersion: boolean;
  lightIconPath?: string;
  colors: Array<string>;
}

export interface IconMetadata {
  icons: Array<IconInfo>;
  totalCount: number;
  categories: { [key in IconCategory]: number };
  availablePacks: Array<IconPackValue>;
}

export interface InitialIconData {
  icons: Array<IconInfo>;
  totalCount: number;
  hasMore: boolean;
}
