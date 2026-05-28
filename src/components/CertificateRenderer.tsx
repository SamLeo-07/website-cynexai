import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Download, Calendar, Award, ShieldCheck, X, Printer, FileCheck } from 'lucide-react';
import { 
  getCertificatesByStudent, 
  checkAndIssueCertificate, 
  Certificate 
} from '../lib/turso';

interface CertificateRendererProps {
  studentId: string;
  studentName: string;
  enrollments: { 
    enrollment: { id: string; course_id: string; progress_percentage: number }; 
    course: { id: string; title: string } 
  }[];
}

export const CertificateRenderer: React.FC<CertificateRendererProps> = ({
  studentId,
  studentName,
  enrollments
}) => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  const checkAndFetchCertificates = async () => {
    setLoading(true);
    try {
      // 1. For any 100% completed courses, run auto-issue
      const completeEnrollments = enrollments.filter(e => e.enrollment.progress_percentage === 100);
      
      for (const e of completeEnrollments) {
        await checkAndIssueCertificate(
          studentId,
          studentName,
          e.course.id,
          e.course.title,
          100
        );
      }

      // 2. Fetch all certificates
      const certs = await getCertificatesByStudent(studentId);
      setCertificates(certs);
    } catch (e) {
      console.error("Failed to load certificates", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAndFetchCertificates();
  }, [studentId, enrollments]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[50vh] gap-4">
        <div className="w-12 h-12 border-4 border-secondary/10 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm font-bold text-secondary/40 uppercase tracking-widest">Generating Diplomas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Print styles */}
      <style>{`
        @media print {
          /* Hide everything except the printable certificate */
          body * {
            visibility: hidden !important;
          }
          #print-area, #print-area * {
            visibility: visible !important;
          }
          #print-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: #0f172a !important;
            z-index: 99999 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      {/* Page Header */}
      <div>
        <h3 className="text-3xl lg:text-4xl font-black text-secondary mb-2 tracking-tight">Credentials & Certificates</h3>
        <p className="text-sm lg:text-base text-secondary/60 font-medium">Verify, view, and print your officially earned digital certifications.</p>
      </div>

      {certificates.length === 0 ? (
        <div className="bg-background-100 border border-secondary/10 rounded-xl p-10 text-center shadow-sm max-w-4xl mx-auto">
          <div className="w-20 h-20 bg-secondary/5 rounded-md border border-secondary/5 flex items-center justify-center mx-auto mb-6 text-slate-300">
            <Award className="w-12 h-12" />
          </div>
          <h3 className="text-2xl font-bold text-secondary mb-3">No Credentials Yet</h3>
          <p className="text-secondary/60 max-w-md mx-auto mb-8">
            Complete any of your enrolled courses to 100% and successfully pass the evaluation. Your official certificate will be generated automatically.
          </p>
          <div className="text-[10px] font-black text-secondary/40 uppercase tracking-widest">
            Complete progress to auto-unlock
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {certificates.map((cert) => (
            <motion.div
              key={cert.id}
              whileHover={{ y: -4 }}
              className="bg-background-100 border-2 border-secondary/10 hover:border-amber-400 transition-all rounded-xl p-6 shadow-sm flex flex-col justify-between relative group overflow-hidden"
            >
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div>
                {/* Header Row */}
                <div className="flex items-center justify-between mb-6">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-md flex items-center justify-center text-amber-500">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] font-mono text-secondary/40 bg-secondary/5 border border-secondary/5 px-3 py-1 rounded-md">
                    {cert.certificate_number}
                  </span>
                </div>

                {/* Info */}
                <h4 className="text-xl font-black text-secondary leading-snug mb-3">
                  {cert.course_title}
                </h4>
                <div className="space-y-2 text-xs text-secondary/60 font-medium mb-8">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-indigo-400" />
                    <span>Issued: {new Date(cert.issued_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <span>Verified ID Credentials</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => setSelectedCert(cert)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-900/10 text-sm"
              >
                <Download className="w-4 h-4" /> View & Print
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Certificate Viewer Modal */}
      <AnimatePresence>
        {selectedCert && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCert(null)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-secondary text-background w-full max-w-4xl rounded-xl shadow-2xl relative z-10 overflow-hidden"
            >
              
              {/* Modal Actions Header */}
              <div className="px-8 py-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                <div className="flex items-center gap-3">
                  <Award className="text-amber-400" />
                  <span className="font-bold text-sm text-slate-300">CynexAI Official Certificate Verification</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePrint}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md transition-all flex items-center gap-2 text-xs font-bold"
                    title="Print"
                  >
                    <Printer size={16} /> Print Credentials
                  </button>
                  <button 
                    onClick={() => setSelectedCert(null)} 
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition-all"
                    title="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Certificate Design View (ID for print) */}
              <div className="p-8 md:p-12 bg-slate-950 flex justify-center overflow-x-auto">
                <div 
                  id="print-area" 
                  className="w-[800px] h-[560px] bg-slate-900 border-[16px] border-double border-amber-500/40 relative overflow-hidden shrink-0 flex flex-col justify-between p-12 text-center"
                  style={{
                    backgroundImage: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)'
                  }}
                >
                  
                  {/* Decorative corner borders */}
                  <div className="absolute top-4 left-4 w-20 h-20 border-t-2 border-l-2 border-amber-500/30" />
                  <div className="absolute top-4 right-4 w-20 h-20 border-t-2 border-r-2 border-amber-500/30" />
                  <div className="absolute bottom-4 left-4 w-20 h-20 border-b-2 border-l-2 border-amber-500/30" />
                  <div className="absolute bottom-4 right-4 w-20 h-20 border-b-2 border-r-2 border-amber-500/30" />

                  {/* Top Header */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-indigo-400 tracking-[0.3em] uppercase">
                      CynexAI Advanced Learning Academy
                    </div>
                    <div className="text-[9px] font-mono text-amber-500/60 uppercase tracking-widest">
                      E-Credentials Verification Ledger
                    </div>
                  </div>

                  {/* Body Text */}
                  <div className="space-y-6">
                    <h2 className="font-serif text-amber-400 text-4xl italic tracking-wider font-light">
                      Certificate of Completion
                    </h2>
                    
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium text-secondary/40 uppercase tracking-widest">
                        This is proudly presented to
                      </p>
                      <h3 className="text-white text-3xl font-black uppercase tracking-wide border-b border-slate-700/60 pb-2 max-w-md mx-auto">
                        {studentName}
                      </h3>
                    </div>

                    <div className="space-y-2 max-w-xl mx-auto">
                      <p className="text-xs text-secondary/40 font-medium">
                        for successfully completing the core curriculum requirements and final tests of the course
                      </p>
                      <h4 className="text-indigo-400 text-xl font-bold tracking-tight">
                        {selectedCert.course_title}
                      </h4>
                    </div>
                  </div>

                  {/* Footer Row */}
                  <div className="grid grid-cols-3 items-end pt-6 border-t border-slate-800/60 text-left">
                    <div className="space-y-1">
                      <div className="text-[9px] font-black text-secondary/60 uppercase tracking-widest">Issue Date</div>
                      <div className="text-[11px] font-bold text-slate-300">
                        {new Date(selectedCert.issued_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center pb-2">
                      {/* Stylized circular seal */}
                      <div className="w-16 h-16 rounded-full border-2 border-amber-500/40 flex items-center justify-center flex-col relative bg-slate-900/50">
                        <Award className="w-8 h-8 text-amber-400/80" />
                        <div className="text-[6px] font-bold uppercase tracking-tighter text-amber-500/60 absolute bottom-1.5">SEAL</div>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="text-[9px] font-black text-secondary/60 uppercase tracking-widest">Credential Number</div>
                      <div className="text-[11px] font-mono font-bold text-amber-500">
                        {selectedCert.certificate_number}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
