import { useCallback } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useResumeStore } from '../store/useResumeStore';

export function ResumeUpload() {
  const { uploadResume, uploadProgress } = useResumeStore();
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    handleFile(file);
    
    // Clear input to allow re-uploading the same file
    e.target.value = '';
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleFile = (file: File) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      alert('Only PDF and Word files are supported (.pdf, .doc, .docx).');
      return;
    }
    
    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File size must be 5MB or less.');
      return;
    }
    
    // Upload file
    uploadResume(file);
  };
  
  // Convert Map to array for rendering
  const progressArray = Array.from(uploadProgress.values());
  
  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary transition-colors cursor-pointer bg-white"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          type="file"
          id="resume-upload"
          className="hidden"
          accept=".pdf,.doc,.docx"
          onChange={handleFileSelect}
        />
        
        <label 
          htmlFor="resume-upload" 
          className="cursor-pointer flex flex-col items-center"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Resume</h3>
          
          <p className="text-sm text-gray-600 mb-4">
            Click to choose a file or drag it here
          </p>
          
          <p className="text-xs text-gray-500">
            Supports PDF and Word formats, max 5MB
          </p>
        </label>
      </motion.div>
      
      {/* Upload Progress */}
      {progressArray.length > 0 && (
        <div className="space-y-2">
          {progressArray.map((progress) => (
            <motion.div
              key={progress.fileName}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {progress.fileName}
                  </p>
                  
                  {progress.status === 'uploading' && (
                    <div className="mt-2">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${progress.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Uploading... {progress.progress}%
                      </p>
                    </div>
                  )}
                  
                  {progress.status === 'done' && (
                    <p className="text-xs text-green-600 mt-1">✓ Upload complete</p>
                  )}
                  
                  {progress.status === 'error' && (
                    <p className="text-xs text-red-600 mt-1">
                      ✗ {progress.error || 'Upload failed'}
                    </p>
                  )}
                </div>
                
                {progress.status === 'done' && (
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
