import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { getFaqs, FAQItem } from '../lib/turso';

const FAQ = () => {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const data = await getFaqs(false); // false to only fetch visible FAQs
        setFaqs(data);
      } catch (error) {
        console.error('Failed to load FAQs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  if (loading) {
    return (
      <div className="py-24 bg-white flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#41c8df] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (faqs.length === 0) {
    return null; // Don't render empty section
  }

  return (
    <section className="py-24 bg-white relative z-10 border-t border-slate-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-flex items-center px-4 py-2 rounded-full bg-[#41c8df]/10 border border-[#41c8df]/30 text-[#0891b2] text-sm font-semibold mb-6">
            <HelpCircle className="w-4 h-4 mr-2" />
            Support & FAQs
          </span>
          <h2 className="text-4xl font-display font-extrabold text-slate-900 mb-4">
            Frequently Asked <span className="text-[#0891b2]">Questions</span>
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-base">
            Have questions about our training tracks, certification, or placement assistance? We've got answers.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={item.id}
                className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left font-bold text-slate-800 hover:text-slate-900 transition-colors"
                >
                  <span className="text-base pr-4">{item.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-500 shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180 text-[#0891b2]' : ''
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="px-6 pb-6 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                        {item.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
