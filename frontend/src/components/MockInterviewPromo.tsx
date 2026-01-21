import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Target, MessageSquare, TrendingUp } from 'lucide-react';

export function MockInterviewPromo() {
  const navigate = useNavigate();
  
  const features = [
    {
      icon: Target,
      title: 'Job-Specific Focus',
      description: 'Practice with questions tailored to your target role, ensuring relevance and preparation.',
    },
    {
      icon: MessageSquare,
      title: 'Actionable Feedback',
      description: 'Get detailed analysis of your responses and practice, step-by-step improvement suggestions.',
    },
    {
      icon: TrendingUp,
      title: 'Boost Success Rates',
      description: 'Perfect your interview skills and increase your chances of landing the job you want.',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="sticky top-6 space-y-6"
    >
      {/* Main Promo Card */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-100">
        <div className="flex items-center space-x-2 mb-4">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            Ace Your Interviews with AI-Powered Mock Sessions!
          </h3>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Struggling with interview nerves or unique how to prepare? Let our cutting-edge AI mock interviews help you nail it!
        </p>

        <div className="space-y-4 mb-6">
          <h4 className="font-semibold text-gray-900">Why Choose Our AI Mock Interviews? ✨</h4>
          
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-start space-x-3"
              >
                <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h5 className="font-semibold text-sm text-gray-900 mb-1">
                    {feature.title}:
                  </h5>
                  <p className="text-xs text-gray-600">{feature.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/digital-human')}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
        >
          🎥 Mock Interview
        </motion.button>
      </div>
    </motion.div>
  );
}
