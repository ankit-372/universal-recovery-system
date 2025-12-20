import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      {/* Icon Placeholder */}
      <div className="bg-yellow-100 p-4 rounded-full mb-6">
        <span className="text-4xl">🤝</span>
      </div>

      <h1 className="text-5xl font-extrabold text-slate-900 mb-2">
        Reuniting People <br />
        <span className="text-indigo-600">With Their Things</span>
      </h1>
      
      <p className="text-slate-500 max-w-lg mt-4 text-lg">
        A friendly community platform powered by AI to help you find what you lost, or return what you found.
      </p>

      <div className="flex flex-col gap-4 mt-10 w-full max-w-xs">
        {/* "I Found Something" Button */}
        <Link 
          to="/report-found"
          className="bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition transform hover:-translate-y-1"
        >
          I Found Something
        </Link>
        
        {/* "I Lost Something" Button */}
        <Link 
          to="/report-lost"
          className="bg-white text-slate-700 py-4 rounded-xl font-bold border-2 border-slate-100 shadow-sm hover:border-indigo-100 hover:text-indigo-600 transition"
        >
          I Lost Something
        </Link>
      </div>
    </div>
  );
}