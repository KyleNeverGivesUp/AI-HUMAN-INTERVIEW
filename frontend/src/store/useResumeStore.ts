import { create } from 'zustand';
import axios from 'axios';
import type { Resume, ResumeListResponse, UploadProgress } from '../types';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

interface ResumeStore {
  // State
  resumes: Resume[];
  uploadProgress: Map<string, UploadProgress>;
  selectedResume: Resume | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchResumes: () => Promise<void>;
  uploadResume: (file: File) => Promise<void>;
  deleteResume: (id: string) => Promise<void>;
  downloadResume: (id: string, originalName: string) => Promise<void>;
  setSelectedResume: (resume: Resume | null) => void;
  clearError: () => void;
}

export const useResumeStore = create<ResumeStore>((set, get) => ({
  // Initial state
  resumes: [],
  uploadProgress: new Map(),
  selectedResume: null,
  isLoading: false,
  error: null,
  
  // Fetch resume list
  fetchResumes: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get<ResumeListResponse>(`${API_URL}/api/resumes`);
      set({ resumes: response.data.items, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch resumes:', error);
      set({ 
        error: 'Failed to load resumes', 
        isLoading: false 
      });
    }
  },
  
  // Upload resume
  uploadResume: async (file: File) => {
    const fileName = file.name;
    
    // Set initial upload progress
    const newProgress = new Map(get().uploadProgress);
    newProgress.set(fileName, {
      fileName,
      progress: 0,
      status: 'uploading'
    });
    set({ uploadProgress: newProgress, error: null });
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post<Resume>(
        `${API_URL}/api/resumes/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const progress = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            
            const updatedProgress = new Map(get().uploadProgress);
            updatedProgress.set(fileName, {
              fileName,
              progress,
              status: 'uploading'
            });
            set({ uploadProgress: updatedProgress });
          }
        }
      );
      
      // Upload complete
      const finalProgress = new Map(get().uploadProgress);
      finalProgress.set(fileName, {
        fileName,
        progress: 100,
        status: 'done'
      });
      set({ uploadProgress: finalProgress });
      
      // Refresh list
      await get().fetchResumes();
      
      // Clear progress after 2 seconds
      setTimeout(() => {
        const clearedProgress = new Map(get().uploadProgress);
        clearedProgress.delete(fileName);
        set({ uploadProgress: clearedProgress });
      }, 2000);
      
    } catch (error: any) {
      console.error('Upload failed:', error);
      
      const errorProgress = new Map(get().uploadProgress);
      errorProgress.set(fileName, {
        fileName,
        progress: 0,
        status: 'error',
        error: error.response?.data?.detail || 'Upload failed'
      });
      set({ 
        uploadProgress: errorProgress,
        error: error.response?.data?.detail || 'Upload failed'
      });
    }
  },
  
  // Delete resume
  deleteResume: async (id: string) => {
    set({ error: null });
    try {
      await axios.delete(`${API_URL}/api/resumes/${id}`);
      
      // 从列表中移除
      set({ 
        resumes: get().resumes.filter(r => r.id !== id),
        selectedResume: get().selectedResume?.id === id ? null : get().selectedResume
      });
    } catch (error: any) {
      console.error('Delete failed:', error);
      set({ error: error.response?.data?.detail || 'Delete failed' });
      throw error;
    }
  },
  
  // Download resume
  downloadResume: async (id: string, originalName: string) => {
    set({ error: null });
    try {
      const response = await axios.get(
        `${API_URL}/api/resumes/${id}/download`,
        { responseType: 'blob' }
      );
      
      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Download failed:', error);
      set({ error: error.response?.data?.detail || 'Download failed' });
      throw error;
    }
  },
  
  // Set selected resume
  setSelectedResume: (resume: Resume | null) => {
    set({ selectedResume: resume });
  },
  
  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
