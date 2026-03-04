import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const ApplyForm = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  // State to hold form data and UI status
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // IMPORTANT: Replace this with the Web App URL from your Google Apps Script deployment
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxmluWiU1uciTJuYYrrwuNWjugFyzWDzvG4mTuGlNN6zu2DAf7JmSb8mQL7UrGxHeQfTw/exec';

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionStatus('loading');
    setMessage('');

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // IMPORTANT: This is required to bypass CORS restrictions for the Apps Script endpoint.
        headers: {
          'Content-Type': 'application/json',
        },
        // The payload includes the courseId from the URL and all form data
        body: JSON.stringify({ ...formData, courseId }),
      });

      // The `no-cors` mode prevents reading the actual response, so we just assume success.
      // In a production scenario with a custom backend, you would check `response.ok`.
      setSubmissionStatus('success');
      setMessage('Application submitted successfully! We will get in touch with you shortly.');

      // Clear the form after a delay
      setTimeout(() => {
        setFormData({ name: '', email: '', phone: '', message: '' });
      }, 2000);

    } catch (error) {
      console.error('Submission error:', error);
      setSubmissionStatus('error');
      setMessage('There was an error submitting your form. Please try again.');
    }
  };

  const isFormDisabled = submissionStatus === 'loading' || submissionStatus === 'success';

  return (
    <div className="bg-transparent text-secondary min-h-screen font-sans flex flex-col items-center justify-center py-24 px-4 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-xl w-full bg-background/40 backdrop-blur-xl rounded-[2rem] shadow-[0_0_50px_rgba(65,200,223,0.15)] p-8 md:p-12 border border-secondary/10 relative"
      >
        <div className="flex items-center mb-6">
          <button onClick={() => navigate(-1)} className="text-[#41c8df] hover:text-secondary transition-colors" title="Go back">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
          </button>
          <h2 className="text-3xl font-display font-bold text-center flex-grow">Apply for Course</h2>
        </div>
        <p className="text-center text-gray-400 mb-8">
          Fill out the form below to apply for: <span className="text-[#41c8df] font-semibold">{courseId}</span>
        </p>

        {submissionStatus === 'success' && (
          <div className="bg-green-900/50 text-green-300 p-4 rounded-lg mb-6 text-center">
            {message}
          </div>
        )}
        {submissionStatus === 'error' && (
          <div className="bg-red-900/50 text-red-300 p-4 rounded-lg mb-6 text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-4 py-4 bg-secondary/5 border border-secondary/10 rounded-xl text-secondary placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#41c8df] focus:border-transparent transition-all"
              disabled={isFormDisabled}
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-4 py-4 bg-secondary/5 border border-secondary/10 rounded-xl text-secondary placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#41c8df] focus:border-transparent transition-all"
              disabled={isFormDisabled}
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-300">Phone Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-4 py-4 bg-secondary/5 border border-secondary/10 rounded-xl text-secondary placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#41c8df] focus:border-transparent transition-all"
              disabled={isFormDisabled}
            />
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-300">Additional Message (Optional)</label>
            <textarea
              id="message"
              name="message"
              rows={4}
              value={formData.message}
              onChange={handleChange}
              className="mt-1 block w-full px-4 py-4 bg-secondary/5 border border-secondary/10 rounded-xl text-secondary placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#41c8df] focus:border-transparent transition-all resize-none"
              disabled={isFormDisabled}
            ></textarea>
          </div>
          <button
            type="submit"
            className="w-full bg-[#41c8df] text-black font-black py-4 px-6 rounded-xl transition-all duration-300 hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#41c8df] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-widest shadow-[0_0_20px_rgba(65,200,223,0.3)] hover:shadow-[0_0_30px_rgba(65,200,223,0.5)]"
            disabled={isFormDisabled}
          >
            {submissionStatus === 'loading' && (
              <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.961l1-1.67z"></path>
              </svg>
            )}
            {submissionStatus === 'loading' ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default ApplyForm;
