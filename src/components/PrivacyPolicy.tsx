import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, Lock, FileText, Phone, Mail, MapPin } from 'lucide-react';

const PrivacyPolicy = () => {
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
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-[#41c8df]/10 text-[#41c8df] mb-2 border border-[#41c8df]/20">
              <Shield className="w-8 h-8 animate-pulse" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-display tracking-tight text-secondary">
              Privacy <span className="text-[#41c8df]">Policy</span>
            </h1>
            <p className="text-secondary/70 text-sm md:text-base max-w-xl mx-auto">
              Effective Date: May 19, 2026. At CynexAI, we value your trust and are committed to protecting your personal data.
            </p>
          </motion.div>

          {/* Intro Card */}
          <motion.div variants={itemVariants}>
            <div className="bg-background-100 p-8 rounded-3xl border border-secondary/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#41c8df]/5 rounded-bl-full pointer-events-none"></div>
              <p className="text-secondary/80 leading-relaxed">
                This Privacy Policy explains how CynexAI ("we", "our", or "us") collects, uses, processes, and protects your information when you visit our website, enroll in our courses, or use our Student Portal. By accessing or using our services, you consent to the collection and use of information in accordance with this policy.
              </p>
            </div>
          </motion.div>

          {/* Section 1: Information We Collect */}
          <motion.div variants={itemVariants} className="space-y-6">
            <h2 className="text-2xl font-bold text-secondary flex items-center gap-3">
              <Eye className="text-[#41c8df] w-6 h-6" />
              1. Information We Collect
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-background-100 p-6 rounded-2xl border border-secondary/10 hover:border-[#41c8df]/30 transition-all duration-300">
                <h3 className="text-lg font-semibold text-secondary mb-2">Personal Information</h3>
                <p className="text-secondary/70 text-sm leading-relaxed">
                  When you apply for admission, register on our site, or communicate with us, we collect details such as your full name, email address, phone number, academic records, and professional background.
                </p>
              </div>
              <div className="bg-background-100 p-6 rounded-2xl border border-secondary/10 hover:border-[#41c8df]/30 transition-all duration-300">
                <h3 className="text-lg font-semibold text-secondary mb-2">Payment Details</h3>
                <p className="text-secondary/70 text-sm leading-relaxed">
                  For fee processing and EMI logs, we record details related to your payments (e.g. amount paid, outstanding dues, and transaction status) which are secured through Turso Database and authorized payment processing pathways.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Section 2: How We Use Your Information */}
          <motion.div variants={itemVariants} className="space-y-6">
            <h2 className="text-2xl font-bold text-secondary flex items-center gap-3">
              <FileText className="text-[#41c8df] w-6 h-6" />
              2. How We Use Your Information
            </h2>
            <div className="bg-background-100 p-8 rounded-3xl border border-secondary/10 space-y-4">
              <p className="text-secondary/80 leading-relaxed">
                We process your personal information for purposes based on legitimate business interests, the fulfillment of our contract with you, compliance with legal obligations, and/or your consent. Specifically, we use it to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-secondary/70 text-sm pl-4">
                <li>Facilitate account creation, student portal login, and enrollment verification.</li>
                <li>Deliver our educational content, track course progression, and award achievements/badges.</li>
                <li>Process payment transactions and notify you about upcoming EMI installments or dues.</li>
                <li>Provide prompt student support, respond to tickets, and resolve academic issues.</li>
                <li>Send career listings, internship updates, and newsletter notifications (you can opt-out at any time).</li>
              </ul>
            </div>
          </motion.div>

          {/* Section 3: Data Protection & Security */}
          <motion.div variants={itemVariants} className="space-y-6">
            <h2 className="text-2xl font-bold text-secondary flex items-center gap-3">
              <Lock className="text-[#41c8df] w-6 h-6" />
              3. Data Security & Protection
            </h2>
            <div className="bg-background-100 p-8 rounded-3xl border border-secondary/10 leading-relaxed space-y-4 text-secondary/80">
              <p>
                CynexAI implements strict technical and organizational security measures to prevent unauthorized access, alteration, disclosure, or destruction of your personal data.
              </p>
              <p className="text-secondary/70 text-sm">
                Student and payment information are encrypted and persisted securely via Turso Cloud Database instances. Access is restricted to authorized personnel and is subject to strict confidentiality agreements. However, no electronic transmission over the internet or database storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </div>
          </motion.div>

          {/* Section 4: Contact & Grievance */}
          <motion.div variants={itemVariants} className="space-y-6">
            <h2 className="text-2xl font-bold text-secondary">4. Contact & Support</h2>
            <div className="bg-background-100 p-8 rounded-3xl border border-secondary/10 grid md:grid-cols-3 gap-6">
              <div className="flex items-center gap-4 text-secondary/80">
                <div className="p-3 bg-[#41c8df]/10 text-[#41c8df] rounded-xl">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-secondary/50 font-bold uppercase">Call Us</div>
                  <div className="text-sm font-semibold text-secondary">+91 9966639869</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-secondary/80">
                <div className="p-3 bg-[#41c8df]/10 text-[#41c8df] rounded-xl">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-secondary/50 font-bold uppercase">Email Support</div>
                  <a href="mailto:contact@Cynexai.in" className="text-sm font-semibold text-secondary hover:text-[#41c8df] transition-colors">contact@Cynexai.in</a>
                </div>
              </div>
              <div className="flex items-start gap-4 text-secondary/80">
                <div className="p-3 bg-[#41c8df]/10 text-[#41c8df] rounded-xl flex-shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-secondary/50 font-bold uppercase">Location</div>
                  <div className="text-xs leading-tight text-secondary">MIG-215, Rd Number 1, KPHB Kukatpally, Hyderabad, 500072</div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
