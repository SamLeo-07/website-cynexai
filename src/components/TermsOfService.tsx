import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, AlertOctagon, Scale, ShieldAlert, Award } from 'lucide-react';

const TermsOfService = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  return (
    <div className="text-secondary font-inter pt-28 pb-20 min-h-screen bg-transparent">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-12"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center space-y-4">
            <div className="inline-flex items-center justify-center p-3 rounded-md bg-indigo-500/10 text-indigo-400 mb-2 border border-indigo-500/20">
              <Scale className="w-8 h-8 animate-pulse" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-display tracking-tight text-secondary">
              Terms of <span className="text-indigo-400">Service</span>
            </h1>
            <p className="text-secondary/70 text-sm md:text-base max-w-xl mx-auto">
              Last Updated: May 19, 2026. Please read these terms carefully before enrolling or using our services.
            </p>
          </motion.div>

          {/* Intro Card */}
          <motion.div variants={itemVariants}>
            <div className="bg-background-100 p-8 rounded-xl border border-secondary/10 shadow-sm relative overflow-hidden">
              <p className="text-secondary/80 leading-relaxed text-sm md:text-base">
                Welcome to CynexAI. By accessing our platform, enrolling in our training programs, or using the Student Portal, you agree to comply with and be bound by the following terms and conditions of service. If you disagree with any part of these terms, you may not access our educational programs.
              </p>
            </div>
          </motion.div>

          {/* Section 1: Admission & Enrollment */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h2 className="text-2xl font-bold text-secondary flex items-center gap-3">
              <BookOpen className="text-indigo-400 w-6 h-6" />
              1. Course Admission & Enrollment
            </h2>
            <div className="bg-background-100 p-6 md:p-8 rounded-xl border border-secondary/10 space-y-4 text-secondary/80 leading-relaxed text-sm md:text-base">
              <p>
                CynexAI offers specialized tech training courses. Enrollment is subject to candidate verification, submission of required application materials, and confirmation of fee payment options.
              </p>
              <ul className="list-disc list-inside space-y-2 text-secondary/70 text-xs pl-4 font-medium">
                <li>You agree to provide true, current, and complete details during the admission process.</li>
                <li>Your student account credentials (username, password) are personal and must not be shared.</li>
                <li>Course allocations, learning materials, and project workspaces are restricted for single-student use only.</li>
              </ul>
            </div>
          </motion.div>

          {/* Section 2: Fees, Installments & Refund Policy */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h2 className="text-2xl font-bold text-secondary flex items-center gap-3">
              <Award className="text-indigo-400 w-6 h-6" />
              2. Fees, Installments & Payments
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-background-100 p-6 rounded-xl border border-secondary/10 hover:border-indigo-500/30 transition-all duration-300">
                <h3 className="text-lg font-semibold text-secondary mb-2">Indian Rupees (₹) Payments</h3>
                <p className="text-secondary/70 text-xs md:text-sm leading-relaxed font-medium">
                  All fees are quoted and payable in Indian Rupees (₹). You agree to pay the total program fees or installments (EMIs) as agreed upon during enrollment, subject to due dates listed in your portal.
                </p>
              </div>
              <div className="bg-background-100 p-6 rounded-xl border border-secondary/10 hover:border-indigo-500/30 transition-all duration-300">
                <h3 className="text-lg font-semibold text-secondary mb-2">Refund Policy</h3>
                <p className="text-secondary/70 text-xs md:text-sm leading-relaxed font-medium">
                  Fees paid are generally non-refundable once the batch training has commenced. If you choose to defer your batch, you must contact student support and submit a formal request via the Support Hub.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Section 3: Student Code of Conduct */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h2 className="text-2xl font-bold text-secondary flex items-center gap-3">
              <ShieldAlert className="text-indigo-400 w-6 h-6" />
              3. Student Code of Conduct
            </h2>
            <div className="bg-background-100 p-6 md:p-8 rounded-xl border border-secondary/10 space-y-4 text-secondary/80 leading-relaxed text-sm md:text-base">
              <p>
                To maintain a healthy, collaborative learning ecosystem, students must adhere to the following rules:
              </p>
              <ul className="list-disc list-inside space-y-2 text-secondary/70 text-xs pl-4 font-medium">
                <li>No plagiarism or unauthorized distribution of course code samples, projects, or study materials.</li>
                <li>Respectful communication inside class sessions, discussion boards, and help tickets.</li>
                <li>Intentional abuse of platform APIs or Turso DB instances will lead to immediate account termination.</li>
              </ul>
            </div>
          </motion.div>

          {/* Section 4: Limitation of Liability */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h2 className="text-2xl font-bold text-secondary flex items-center gap-3">
              <AlertOctagon className="text-indigo-400 w-6 h-6" />
              4. Limitation of Liability & Governing Law
            </h2>
            <div className="bg-background-100 p-6 md:p-8 rounded-xl border border-secondary/10 space-y-4 text-secondary/80 leading-relaxed text-sm md:text-base">
              <p>
                CynexAI provides high-quality training and 100% placement assistance, but does not guarantee employment outcomes or package thresholds.
              </p>
              <p className="text-secondary/70 text-xs md:text-sm font-medium">
                These terms shall be governed by and construed in accordance with the laws of India. Any disputes arising under or in connection with these terms shall be subject to the exclusive jurisdiction of the courts located in Hyderabad, Telangana, India.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default TermsOfService;
