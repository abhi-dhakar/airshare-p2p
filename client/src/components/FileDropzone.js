import { Upload } from "lucide-react";

export default function FileDropzone({ onFileSelect }) {
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <label
        htmlFor="file-upload"
        className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer bg-gray-50 hover:bg-blue-50 hover:border-blue-400 transition-all group"
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <div className="bg-white p-4 rounded-full mb-4 shadow-sm group-hover:scale-110 transition-transform">
            <Upload className="w-8 h-8 text-blue-500" />
          </div>
          <p className="mb-2 text-xl font-semibold text-gray-700">Select File</p>
          <p className="text-sm text-gray-500">Click or Drag & Drop</p>
        </div>
        <input
          id="file-upload"
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
}