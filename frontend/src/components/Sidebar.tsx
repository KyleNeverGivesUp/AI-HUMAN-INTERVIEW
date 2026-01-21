import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Briefcase, 
  Video, 
  FileText, 
  User, 
  Settings, 
  CreditCard,
  Sparkles,
  X
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const menuItems = [
  { icon: Briefcase, label: 'Jobs', path: '/' },
  { icon: Video, label: 'AI Mock Interview', path: '/digital-human' },
  { icon: FileText, label: 'Resume', path: '/resume' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: Settings, label: 'Setting', path: '/settings' },
  { icon: CreditCard, label: 'Subscription', path: '/subscription' },
  { icon: Sparkles, label: 'Extra Credits', path: '/credits' },
];

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 z-50",
          "flex flex-col transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:static lg:z-auto"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">JN</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              JobSeeker
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  navigate(item.path);
                  if (onClose) onClose();
                }}
                className={cn(
                  "w-full flex items-center space-x-3 px-4 py-3 rounded-lg",
                  "transition-all duration-200 group",
                  isActive
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Icon 
                  className={cn(
                    "w-5 h-5 transition-transform group-hover:scale-110",
                    isActive ? "text-white" : "text-gray-500"
                  )} 
                />
                <span className="font-medium">{item.label}</span>
              </motion.button>
            );
          })}
        </nav>

        {/* Upgrade Section */}
        <div className="p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 text-white"
          >
            <h3 className="text-lg font-bold mb-2">Upgrade Your Plan</h3>
            <p className="text-sm text-purple-100 mb-4">
              Boost your success rate now!
            </p>
            <button className="w-full bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-purple-50 transition-colors">
              Subscription
            </button>
          </motion.div>
        </div>
      </aside>
    </>
  );
}
