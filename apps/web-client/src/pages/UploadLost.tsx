import { useState } from "react";
import { Upload, Loader2, CheckCircle } from "lucide-react";
import { uploadItem } from "../lib/api";

export function UploadLost() {
  const [file, setFile] = useState<File | null>(null);
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("description", desc);

    try {
      const { data } = await uploadItem(formData);
      setResult(data);
    } catch {
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl w-full bg-white p-8 rounded-xl shadow-lg border border-gray-200">
      {/* Title */}
      <h1 className="text-3xl font-semibold text-gray-800 flex items-center gap-2 mb-6">
        <Upload className="w-7 h-7 text-blue-600" />
        Report Lost Item
      </h1>

      {/* File Upload */}
      <label
        htmlFor="file-upload"
        className="block cursor-pointer border-2 border-dashed border-gray-300 rounded-xl py-10 text-center hover:bg-gray-50 transition"
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        {file ? (
          <p className="text-green-600 font-medium">{file.name}</p>
        ) : (
          <p className="text-gray-500">Click to upload image of lost item</p>
        )}
      </label>

      {/* Description */}
      <textarea
        className="w-full mt-5 p-3 border rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder="Describe the item (e.g. Red backpack left at the station)"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />

      {/* Button */}
      <button
        onClick={handleUpload}
        disabled={loading}
        className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 className="animate-spin" /> : "Analyze & Post"}
      </button>

      {/* AI Result */}
      {result && (
        <div className="mt-8 p-5 bg-green-50 rounded-lg border border-green-200 animate-fade-in">
          <div className="flex items-center gap-2 text-green-800 font-semibold mb-3">
            <CheckCircle className="w-5 h-5" />
            AI Analysis Complete
          </div>

          <div className="flex gap-4">
            <img
              src={result.imageUrl}
              alt="Uploaded"
              className="w-24 h-24 rounded-lg object-cover border"
            />

            <div>
              <p className="text-gray-600 text-sm mb-1">Detected Tags:</p>
              <div className="flex gap-2 flex-wrap">
                {result.tags?.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs bg-white border border-green-300 text-green-700 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
