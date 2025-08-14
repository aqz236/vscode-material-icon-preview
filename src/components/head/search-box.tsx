import { Search } from 'lucide-react';

interface SearchBoxProps {
  searchTerm: string;
  totalCount: number;
  onSearchChange: (term: string) => void;
}

export function SearchBox({ searchTerm, totalCount, onSearchChange }: SearchBoxProps) {
  return (
    <div className="relative w-80">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      <input
        type="text"
        placeholder={`Total ${totalCount} icons`}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full pl-9 pr-4 py-2 border border-white/30 dark:border-gray-600/30 rounded-lg 
                 backdrop-blur-md bg-white/20 dark:bg-black/20 text-gray-900 dark:text-gray-100 text-sm
                 focus:outline-none focus:bg-white/30 dark:focus:bg-black/30
                 transition-all duration-200 shadow-inner
                 placeholder:text-gray-500 dark:placeholder:text-gray-400"
      />
    </div>
  );
}
