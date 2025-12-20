import { useState } from 'react';
import { Search, MapPin, AlertCircle } from 'lucide-react';
import { searchItems } from '../lib/api';

export function SearchItems() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setHasSearched(true);
    try {
      // Calls Node -> Python -> Milvus -> Postgres
      const { data } = await searchItems(query);
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-8 p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Find Lost Items</h1>
      
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative max-w-xl mx-auto mb-10">
        <input
          type="text"
          placeholder="Search by description (e.g., 'blue bicycle')"
          className="w-full p-4 pl-12 rounded-full border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-lg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Search className="absolute left-4 top-4 text-gray-400 w-6 h-6" />
        <button 
          type="submit"
          disabled={loading}
          className="absolute right-2 top-2 bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((item) => (
          <div key={item.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition border border-gray-100">
            <div className="relative h-48">
              <img src={item.imageUrl} alt="Item" className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                 {/* Visualizing Vector Distance as "Match %" (inverted logic for display) */}
                 Match: {Math.max(0, Math.round((1 - item.score) * 100))}%
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-800 line-clamp-1">{item.description}</h3>
              </div>
              
              <div className="flex flex-wrap gap-1 mb-3">
                {item.tags?.slice(0, 3).map((tag: string) => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center text-xs text-gray-500 gap-1 mt-2">
                <MapPin className="w-3 h-3" />
                <span>Last seen recently</span>
              </div>
              
              <button className="w-full mt-4 bg-blue-50 text-blue-600 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition">
                Contact Finder
              </button>
            </div>
          </div>
        ))}
      </div>

      {hasSearched && results.length === 0 && !loading && (
        <div className="text-center mt-10 text-gray-500">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p>No items found matching "{query}".</p>
        </div>
      )}
    </div>
  );
}