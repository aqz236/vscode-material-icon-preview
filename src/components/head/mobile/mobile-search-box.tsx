import { Search } from 'lucide-react';

interface MobileSearchBoxProps {
  searchTerm: string;
  totalCount: number;
  onSearchChange: (value: string) => void;
}

export function SearchBox({ searchTerm, totalCount, onSearchChange }: MobileSearchBoxProps) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        type="text"
        placeholder={`Search ${totalCount} icons...`}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="
          w-full pl-9 pr-3 py-2 text-sm
          bg-white dark:bg-gray-800 
          border border-gray-200 dark:border-gray-700 
          rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          placeholder-gray-400 dark:placeholder-gray-500
        "
      />
    </div>
  );
}
