import { useState } from 'react';
import { Camera } from 'lucide-react';
import { uploadItem } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export function ReportFound() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', desc);
    formData.append('type', 'found'); // <--- Mark as FOUND

    await uploadItem(formData);
    setLoading(false);
    alert("Thanks! We've indexed this item. If someone searches for it, we'll let you know.");
    navigate('/');
  };

  return (
    <div className="max-w-md mx-auto mt-6 bg-white p-6 rounded-3xl shadow-xl border border-slate-50">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Camera className="w-6 h-6 text-slate-600" /> Report Found Item
        </h2>
      </div>

      {/* Upload Box */}
      <div className="border-2 border-dashed border-indigo-200 bg-indigo-50 rounded-2xl h-48 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-indigo-100 transition relative">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        {file ? (
          <img src={URL.createObjectURL(file)} className="h-full w-full object-cover rounded-2xl" />
        ) : (
          <>
            <div className="bg-white p-3 rounded-full shadow-sm mb-2">
              <Camera className="w-6 h-6 text-indigo-600" />
            </div>
            <p className="text-indigo-900 font-medium">Upload Photo</p>
            <p className="text-indigo-400 text-xs">AI will auto-detect details</p>
          </>
        )}
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-bold text-slate-700 ml-1">Title</label>
          <input className="w-full mt-1 bg-slate-50 border-none p-4 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Red Scarf" />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 ml-1">Description</label>
          <textarea
            className="w-full mt-1 bg-slate-50 border-none p-4 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none"
            placeholder="Details about the item..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full mt-8 bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-black transition"
      >
        {loading ? 'Processing...' : 'Report Found'}
      </button>
    </div>
  );
}