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
    
    // 清空input，允许重复上传同一文件
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
    // 验证文件类型
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      alert('只支持 PDF 和 Word 文件 (.pdf, .doc, .docx)');
      return;
    }
    
    // 验证文件大小 (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('文件大小不能超过 5MB');
      return;
    }
    
    // 上传文件
    uploadResume(file);
  };
  
  // 将 Map 转换为数组用于渲染
  const progressArray = Array.from(uploadProgress.values());
  
  return (
    <div className="space-y-4">
      {/* 上传区域 */}
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
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            上传简历
          </h3>
          
          <p className="text-sm text-gray-600 mb-4">
            点击选择文件或拖拽文件到这里
          </p>
          
          <p className="text-xs text-gray-500">
            支持 PDF、Word 格式，最大 5MB
          </p>
        </label>
      </motion.div>
      
      {/* 上传进度列表 */}
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
                        上传中... {progress.progress}%
                      </p>
                    </div>
                  )}
                  
                  {progress.status === 'done' && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ 上传成功
                    </p>
                  )}
                  
                  {progress.status === 'error' && (
                    <p className="text-xs text-red-600 mt-1">
                      ✗ {progress.error || '上传失败'}
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
