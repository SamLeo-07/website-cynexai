import React, { useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Phone, Mail, Globe, MapPin, Clock, Users } from 'lucide-react';
import './Contact.css';

// ─── Floating Particle Orb ────────────────────────────────────────────────────
const ParticleOrb = ({ className }: { className?: string }) => (
  <div
    className={`absolute rounded-full pointer-events-none contact-particle-orb${className ? ` ${className}` : ''}`}
  />
);

const Contact = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    courseInterest: 'Select a course',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwx3j2nwzJWA1_OpjGPwTRGMvJA8aboye9V9YPuMHnBflsVyAmKHCaa9benkaQ7KcUZuQ/exec';

  const contactInfo = [
    { icon: Phone, label: 'Phone', value: '+91 9966639869', href: 'tel:+919966639869' },
    { icon: Mail, label: 'Email', value: 'contact@Cynexai.in', href: 'mailto:contact@Cynexai.in' },
    { icon: Globe, label: 'Website', value: 'CynexAI.in', href: 'https://CynexAI.in' },
    { icon: MapPin, label: 'Location', value: 'KPHB Phase I, Kukatpally, Hyderabad', href: 'https://maps.app.goo.gl/cMq38RHfxHpgEDKn9' },
  ];

  const stats = [
    { icon: Users, value: '100+', label: 'Students Trained' },
    { icon: Clock, value: '24/7', label: 'Support Available' },
    { icon: Globe, value: '10+', label: 'Cities Reached' },
  ];

  const courses = [
    'Data Science with AI',
    'Artificial Intelligence & Generative AI',
    'Full Stack JAVA Development',
    'DevOps & Cloud Services',
    'Python Programming',
    'Testing(Manual + Automation)',
    'SAP(FICO, MM, SD, ABAP)'
  ];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const itemVariants: Variants = {
    hidden: { y: 50, opacity: 0, rotateX: 15 },
    visible: {
      y: 0,
      opacity: 1,
      rotateX: 0,
      transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }
    }
  };

  const formFieldVariants: Variants = {
    hidden: { x: -30, opacity: 0, rotateY: -8 },
    visible: { x: 0, opacity: 1, rotateY: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    setStatusMessage('');

    const dataToSend = new FormData();
    dataToSend.append('fullName', formData.fullName);
    dataToSend.append('email', formData.email);
    dataToSend.append('phone', formData.phone);
    dataToSend.append('courseInterest', formData.courseInterest);
    dataToSend.append('message', formData.message);
    dataToSend.append('sheetName', 'Messages');

    if (!formData.fullName || !formData.email || !formData.message) {
      setSubmitStatus('error');
      setStatusMessage('Please fill out all required fields.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(SCRIPT_URL, { method: 'POST', body: dataToSend });
      if (response.ok) {
        setSubmitStatus('success');
        setStatusMessage('Your message has been sent successfully!');
        setFormData({ fullName: '', email: '', phone: '', courseInterest: 'Select a course', message: '' });
      } else {
        setSubmitStatus('error');
        setStatusMessage('Failed to send message. Please try again later.');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
      setStatusMessage('An error occurred. Please check your network and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-20 relative bg-transparent text-secondary overflow-hidden relative z-10">

      {/* Floating 3D Particle Orbs */}
      <ParticleOrb className="contact-orb-1" />
      <ParticleOrb className="contact-orb-2" />
      <ParticleOrb className="contact-orb-3" />
      <ParticleOrb className="contact-orb-4" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header with 3D entrance */}
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="text-center mb-16 contact-perspective"
        >
          <motion.h2
            variants={itemVariants}
            className="text-4xl md:text-5xl font-display font-bold mb-4 text-secondary"
          >
            Get In Touch
          </motion.h2>
          <motion.p variants={itemVariants} className="text-lg text-gray-300">
            Ready to transform your career? Contact us today and take the first step towards your tech journey.
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            className="space-y-12 contact-perspective"
          >
            <div>
              <motion.h3 variants={itemVariants} className="text-2xl font-semibold mb-6 text-secondary">
                Contact Information
              </motion.h3>
              <div className="space-y-4">
                {contactInfo.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <motion.a
                      key={i}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      variants={itemVariants}
                      whileHover={{ x: 10, rotateY: 2, scale: 1.02 }}
                      className="flex items-center space-x-4 p-4 bg-gray-900/40 rounded-xl border border-secondary/10 hover:border-[#41c8df] hover:shadow-[0_0_20px_rgba(65,200,223,0.2)] transition-all duration-300 contact-preserve-3d"
                    >
                      <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r from-[#41c8df] to-blue-500 text-secondary flex-shrink-0 contact-icon-3d shadow-md"
                      >
                        <Icon className="w-6 h-6 drop-shadow-sm" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 font-medium">{item.label}</p>
                        <p className="font-bold text-gray-100">{item.value}</p>
                      </div>
                    </motion.a>
                  );
                })}
              </div>
            </div>

            <div>
              <motion.h3 variants={itemVariants} className="text-2xl font-semibold mb-6 text-secondary">
                Why Choose Us
              </motion.h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {stats.map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={i}
                      variants={itemVariants}
                      whileHover={{ y: -8, rotateX: -5, scale: 1.05 }}
                      className="p-6 bg-gray-900/60 backdrop-blur-xl rounded-xl border border-secondary/10 text-center hover:border-[#41c8df]/60 hover:shadow-[0_10px_30px_rgba(65,200,223,0.2)] transition-all duration-300 cursor-default contact-stat-card shadow-sm"
                    >
                      <Icon className="w-8 h-8 text-[#41c8df] mx-auto mb-3 drop-shadow-[0_0_8px_rgba(65,200,223,0.4)]" />
                      <div className="text-2xl font-extrabold text-secondary mb-1">{stat.value}</div>
                      <div className="text-sm text-gray-400 font-medium">{stat.label}</div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Contact Form with 3D entrance */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            className="bg-background/40 backdrop-blur-xl rounded-2xl p-8 lg:p-10 border border-secondary/10 hover:border-[#41c8df]/50 hover:shadow-[0_15px_40px_rgba(65,200,223,0.2)] transition-all duration-500 contact-perspective contact-preserve-3d shadow-lg"
          >
            <motion.h3 variants={itemVariants} className="text-2xl font-semibold text-secondary mb-6">
              Send us a Message
            </motion.h3>
            <form className="space-y-5" onSubmit={handleSubmit}>
              {[
                { label: 'Full Name', id: 'fullName', type: 'text', placeholder: 'John Doe', required: true },
                { label: 'Email', id: 'email', type: 'email', placeholder: 'john@example.com', required: true },
                { label: 'Phone', id: 'phone', type: 'tel', placeholder: '+91 9876543210', required: false },
              ].map((field, i) => (
                <motion.div key={field.id} variants={formFieldVariants} className={`contact-field-delay-${i}`}>
                  <label htmlFor={field.id} className="block text-sm text-gray-400 mb-2">{field.label}</label>
                  <input
                    type={field.type}
                    id={field.id}
                    name={field.id}
                    value={formData[field.id as keyof typeof formData]}
                    onChange={handleChange}
                    className="w-full px-4 py-3.5 border border-secondary/10 rounded-xl bg-secondary/5 backdrop-blur-md text-secondary focus:ring-2 focus:ring-[#41c8df] focus:border-transparent outline-none transition-all duration-300 hover:border-[#41c8df]/50 shadow-inner"
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                </motion.div>
              ))}

              <motion.div variants={formFieldVariants}>
                <label htmlFor="courseInterest" className="block text-sm text-gray-400 mb-2">Course Interest</label>
                <select
                  id="courseInterest"
                  name="courseInterest"
                  value={formData.courseInterest}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 border border-secondary/10 rounded-xl bg-secondary/5 backdrop-blur-md text-secondary focus:ring-2 focus:ring-[#41c8df] outline-none transition-all duration-300 hover:border-[#41c8df]/50 shadow-inner [&>option]:bg-gray-900"
                >
                  {courses.map((course, index) => (
                    <option key={index} value={course}>{course}</option>
                  ))}
                </select>
              </motion.div>

              <motion.div variants={formFieldVariants}>
                <label htmlFor="message" className="block text-sm text-gray-400 mb-2">Message</label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 border border-secondary/10 rounded-xl bg-secondary/5 backdrop-blur-md text-secondary focus:ring-2 focus:ring-[#41c8df] outline-none transition-all duration-300 hover:border-[#41c8df]/50 resize-none shadow-inner"
                  placeholder="Your message..."
                  required
                />
              </motion.div>

              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={!isSubmitting ? { scale: 1.03, rotateX: -3, y: -2 } : {}}
                whileTap={!isSubmitting ? { scale: 0.97, rotateX: 3, y: 2 } : {}}
                className={`w-full py-3 text-secondary font-semibold rounded-lg transition-all duration-300 contact-submit-btn ${isSubmitting
                  ? 'bg-gray-600/50 text-secondary/50 cursor-not-allowed'
                  : 'bg-[#41c8df] text-black hover:bg-blue-600 hover:text-secondary hover:shadow-[0_4px_20px_rgba(65,200,223,0.4)]'
                  }`}
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </motion.button>
            </form>

            <AnimatePresence>
              {submitStatus && (
                <motion.div
                  initial={{ opacity: 0, y: -20, rotateX: -10 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`mt-4 p-4 rounded-lg text-center ${submitStatus === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                >
                  {statusMessage}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
