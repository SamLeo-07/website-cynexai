import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Award, Search, Plus, Trash2, Eye, EyeOff, X, Calendar, ShieldCheck, Printer, Key, Upload, FileCheck, Download
} from 'lucide-react';
import { 
  getAllCertificates, 
  issueCertificate, 
  deleteCertificate, 
  Certificate,
  getUsers,
  createUser,
  User
} from '../lib/turso';

interface AdminCertificatesProps {
  users: { id: string; name: string; email: string }[];
  courses: { id: string; title: string }[];
}

export const AdminCertificates: React.FC<AdminCertificatesProps> = ({
  users,
  courses
}) => {
  const [subTab, setSubTab] = useState<'registry' | 'portal'>('registry');

  // Registry State
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const exportToCSV = (data: any[], filename: string, headers?: string[]) => {
    if (!data || !data.length) {
      alert("No data available to download");
      return;
    }
    const keys = Object.keys(data[0]);
    const displayHeaders = headers || keys;
    const csvRows = [];
    csvRows.push(displayHeaders.map(header => `"${String(header).replace(/"/g, '""')}"`).join(','));
    for (const row of data) {
      const values = keys.map(key => {
        const val = row[key];
        const strVal = val === null || val === undefined ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${strVal.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadRegistry = () => {
    const data = certificates.map(c => ({
      CredentialID: c.id,
      StudentName: c.student_name,
      CourseTitle: c.course_title,
      IssuedAt: c.issued_at
    }));
    exportToCSV(data, 'certificates_registry.csv', ['Credential ID', 'Student Name', 'Course Title', 'Issued At']);
  };

  const handleDownloadCredentials = () => {
    const data = studentUsers.map(u => ({
      StudentID: u.id,
      StudentName: u.name,
      Email: u.email,
      Phone: u.phone || 'N/A',
      BatchID: u.batch_id || 'N/A'
    }));
    exportToCSV(data, 'student_portal_credentials.csv', ['Student ID', 'Student Name', 'Email', 'Phone', 'Batch ID']);
  };
  
  // Portal Credentials State (Uses main Users table)
  const [studentUsers, setStudentUsers] = useState<User[]>([]);
  const [credSearchQuery, setCredSearchQuery] = useState('');
  const [isCredModalOpen, setIsCredModalOpen] = useState(false);
  const [credFormData, setCredFormData] = useState({
    email: '',
    password: '',
    student_name: '',
    phone: '',
    photo_url: ''
  });
  const [showCredPassword, setShowCredPassword] = useState(false);

  // Upload State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFormData, setUploadFormData] = useState({
    credential_id: '',
    course_title: '',
    issued_at: new Date().toISOString().split('T')[0],
    file_data: '',
    file_type: ''
  });
  
  // Modals
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedCertForPreview, setSelectedCertForPreview] = useState<Certificate | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    student_id: '',
    course_id: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
        const [certs, usersList] = await Promise.all([
          getAllCertificates(),
          getUsers()
        ]);
        setCertificates(certs);
        setStudentUsers(usersList.filter(u => u.role === 'student'));
    } catch (e) {
      console.error("Failed to load certificates data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (users.length > 0) {
      setFormData(prev => ({ ...prev, student_id: users[0].id }));
    }
    if (courses.length > 0) {
      setFormData(prev => ({ ...prev, course_id: courses[0].id }));
    }
  }, [users, courses]);

  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_id || !formData.course_id) return;

    setSubmitting(true);
    const student = users.find(u => u.id === formData.student_id);
    const course = courses.find(c => c.id === formData.course_id);

    if (!student || !course) {
      setSubmitting(false);
      return;
    }

    const exists = certificates.some(c => c.student_id === student.id && c.course_id === course.id);
    if (exists) {
      alert("This student has already been issued a certificate for this course.");
      setSubmitting(false);
      return;
    }

    // Find the highest sequence number for CYNEX certificates to avoid unique key conflicts on deletions
    const cynexCerts = certificates.filter(c => c.certificate_number.startsWith(`CYNEX-${new Date().getFullYear()}-`));
    let nextNum = 1;
    if (cynexCerts.length > 0) {
      const numbers = cynexCerts.map(c => {
        const parts = c.certificate_number.split('-');
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        return isNaN(num) ? 0 : num;
      });
      nextNum = Math.max(...numbers) + 1;
    }
    const certNumber = `CYNEX-${new Date().getFullYear()}-${String(nextNum).padStart(5, '0')}`;
    const newCert: Certificate = {
      id: crypto.randomUUID(),
      student_id: student.id,
      student_name: student.name,
      course_id: course.id,
      course_title: course.title,
      issued_at: new Date().toISOString(),
      certificate_number: certNumber
    };

    try {
      await issueCertificate(newCert);
      setIsIssueModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to issue certificate.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createUser({
        id: crypto.randomUUID(),
        email: credFormData.email,
        password_hash: credFormData.password, // Storing as plain text matching original login schema for now
        name: credFormData.student_name,
        phone: credFormData.phone,
        photo_url: credFormData.photo_url,
        role: 'student'
      });
      setIsCredModalOpen(false);
      setCredFormData({ email: '', password: '', student_name: '', phone: '', photo_url: '' });
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to create user. Email may already exist.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      alert("File size must be under 500KB due to database limits. Please compress your PDF or Image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadFormData(prev => ({
        ...prev,
        file_data: event.target?.result as string,
        file_type: file.type
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleUploadCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFormData.credential_id || !uploadFormData.file_data) {
      alert("Please select a student and upload a file.");
      return;
    }
    
    setSubmitting(true);
    const cred = studentUsers.find(c => c.id === uploadFormData.credential_id);
    
    if (!cred) {
      setSubmitting(false);
      return;
    }

    // Find the highest sequence number for PORTAL certificates to avoid unique key conflicts on deletions
    const portalCerts = certificates.filter(c => c.certificate_number.startsWith(`PORTAL-${new Date().getFullYear()}-`));
    let nextNum = 1;
    if (portalCerts.length > 0) {
      const numbers = portalCerts.map(c => {
        const parts = c.certificate_number.split('-');
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        return isNaN(num) ? 0 : num;
      });
      nextNum = Math.max(...numbers) + 1;
    }
    const certNumber = `PORTAL-${new Date().getFullYear()}-${String(nextNum).padStart(5, '0')}`;
    
    try {
      await issueCertificate({
        id: crypto.randomUUID(),
        student_id: cred.id, 
        student_name: cred.name,
        course_id: 'MANUAL',
        course_title: uploadFormData.course_title || 'Custom Certification',
        issued_at: new Date(uploadFormData.issued_at).toISOString(),
        certificate_number: certNumber,
        credential_id: cred.id,
        file_data: uploadFormData.file_data,
        file_type: uploadFormData.file_type
      });
      setIsUploadModalOpen(false);
      setUploadFormData({ credential_id: '', course_title: '', issued_at: new Date().toISOString().split('T')[0], file_data: '', file_type: '' });
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert(`Failed to upload certificate: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCertificate = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete/revoke this certificate?")) return;
    try {
      await deleteCertificate(id);
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to delete certificate.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const totalIssued = certificates.length;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const issuedThisMonth = certificates.filter(c => {
    const d = new Date(c.issued_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const filteredCertificates = certificates.filter(c => {
    const q = searchQuery.toLowerCase();
    return c.student_name.toLowerCase().includes(q) || 
           c.course_title.toLowerCase().includes(q) || 
           c.certificate_number.toLowerCase().includes(q);
  });

  const filteredCredentials = studentUsers.filter(c => {
    const q = credSearchQuery.toLowerCase();
    return c.email.toLowerCase().includes(q) || 
           c.name.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8 text-white">
      {/* Print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-preview-cert, #print-preview-cert * {
            visibility: visible !important;
          }
          #print-preview-cert {
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
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-3xl font-bold tracking-tight text-white">Certificates System</h3>
          <p className="text-sm text-gray-400 font-medium">Issue generated certificates or manage portal uploads.</p>
        </div>
      </div>

      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setSubTab('registry')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all ${subTab === 'registry' ? 'border-white text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          Auto-Generated Registry
        </button>
        <button
          onClick={() => setSubTab('portal')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all ${subTab === 'portal' ? 'border-white text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          Portal Logistics & Manual Uploads
        </button>
      </div>

      {subTab === 'registry' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
             <div className="grid grid-cols-2 gap-4 flex-1">
                <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Issued</p>
                    <h4 className="text-2xl font-bold text-white">{totalIssued}</h4>
                  </div>
                  <Award className="text-indigo-400" />
                </div>
                <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">This Month</p>
                    <h4 className="text-2xl font-bold text-white">{issuedThisMonth}</h4>
                  </div>
                  <Calendar className="text-emerald-400" />
                </div>
             </div>
            <div className="flex items-center gap-3">
              {certificates.length > 0 && (
                <button
                  onClick={handleDownloadRegistry}
                  className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 shadow-sm"
                  title="Download Certificates Registry as CSV"
                >
                  <Download size={16} /> Download Registry
                </button>
              )}
              <button
                onClick={() => setIsIssueModalOpen(true)}
                className="px-5 py-3 bg-white hover:bg-slate-200 text-black text-sm font-semibold rounded-lg transition-all flex items-center gap-2 shadow-sm"
              >
                <Plus size={16} /> Issue Auto-Cert
              </button>
            </div>
          </div>

          <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3 flex items-center gap-3 shadow-sm">
            <Search className="text-slate-500 w-4 h-4 ml-1" />
            <input
              type="text"
              placeholder="Search registry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-0 outline-none w-full text-slate-200 placeholder:text-slate-600 text-sm"
            />
          </div>

          <div className="bg-[#0f172a] border border-slate-800 rounded-lg overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-12 text-center text-gray-400">Loading...</div>
            ) : filteredCertificates.filter(c => !c.file_data).length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No auto-generated certificates found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#0a0a0a] border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Number</th>
                      <th className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Student Name</th>
                      <th className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Course</th>
                      <th className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredCertificates.filter(c => !c.file_data).map((cert) => (
                      <tr key={cert.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-4 font-mono font-medium text-slate-300 text-xs">{cert.certificate_number}</td>
                        <td className="px-5 py-4 text-sm font-medium text-white">{cert.student_name}</td>
                        <td className="px-5 py-4 text-sm text-slate-400">{cert.course_title}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setSelectedCertForPreview(cert)} className="p-1.5 text-slate-400 hover:text-indigo-400 transition-colors">
                              <Eye size={16} />
                            </button>
                            <button onClick={() => handleDeleteCertificate(cert.id)} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Credentials Column */}
          <div className="space-y-4">
             <div className="flex items-center justify-between mb-2">
                <h4 className="text-lg font-semibold text-white">Portal Logins</h4>
                <div className="flex items-center gap-2">
                  {studentUsers.length > 0 && (
                    <button
                      onClick={handleDownloadCredentials}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                      title="Download Student Portal Logins as CSV"
                    >
                      <Download size={14} /> Download
                    </button>
                  )}
                  <button onClick={() => setIsCredModalOpen(true)} className="px-3 py-1.5 bg-[#0f172a] border border-slate-700 hover:border-slate-500 rounded-md text-xs font-medium text-slate-200 transition-colors flex items-center gap-1.5 shadow-sm">
                    <Key size={14} /> New Credential
                  </button>
                </div>
             </div>
             <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 shadow-sm">
                <input
                  type="text"
                  placeholder="Search student names..."
                  value={credSearchQuery}
                  onChange={(e) => setCredSearchQuery(e.target.value)}
                  className="bg-[#0a0a0a] border border-slate-700 rounded-md px-3 py-2 text-sm outline-none w-full mb-4 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 transition-colors"
                />
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
                  {filteredCredentials.length === 0 ? (
                    <p className="text-xs text-slate-500 italic text-center py-4">No students added yet.</p>
                  ) : filteredCredentials.map(cred => (
                    <div key={cred.id} className="bg-[#0a0a0a] border border-slate-800 p-3 rounded-md flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{cred.name}</p>
                        <p className="text-xs font-medium text-slate-400">{cred.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button className="p-1.5 text-slate-500 hover:text-indigo-400 transition-colors bg-slate-800/50 rounded-md">
                          <Key size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>

          {/* Uploads Column */}
          <div className="space-y-4">
             <div className="flex items-center justify-between mb-2">
                <h4 className="text-lg font-semibold text-white">Manual Uploads</h4>
                <button onClick={() => setIsUploadModalOpen(true)} className="px-3 py-1.5 bg-white text-black hover:bg-slate-200 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm">
                  <Upload size={14} /> Upload Custom PDF
                </button>
             </div>
             <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 shadow-sm">
               <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
                 {filteredCertificates.filter(c => c.file_data).length === 0 ? (
                    <p className="text-xs text-slate-500 italic text-center py-4">No manually uploaded certificates.</p>
                 ) : filteredCertificates.filter(c => c.file_data).map(cert => (
                   <div key={cert.id} className="bg-[#0a0a0a] border border-slate-800 p-3 rounded-md flex items-center justify-between group">
                      <div>
                        <p className="text-sm font-medium text-slate-200">{cert.student_name}</p>
                        <p className="text-xs font-slate-500">{cert.course_title}</p>
                        <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-wider">{cert.file_type === 'application/pdf' ? 'PDF DOCUMENT' : 'IMAGE FILE'}</p>
                      </div>
                      <button onClick={() => handleDeleteCertificate(cert.id)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} />
                      </button>
                   </div>
                 ))}
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Auto-Issue Modal */}
      <AnimatePresence>
        {isIssueModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsIssueModalOpen(false)} />
             <div className="bg-[#0f172a] border border-slate-800 w-full max-w-md rounded-lg shadow-2xl relative z-10 overflow-hidden text-slate-200">
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-semibold tracking-wide text-white">Auto-Generate Certificate</h3>
                  <button onClick={() => setIsIssueModalOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X size={16}/></button>
                </div>
                <form onSubmit={handleIssueCertificate} className="p-5 space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Select Student</label>
                    <select value={formData.student_id} onChange={(e) => setFormData({ ...formData, student_id: e.target.value })} className="bg-[#0a0a0a] border border-slate-700 rounded-md px-3 py-2.5 text-sm text-slate-200 w-full focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all">
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Select Course</label>
                    <select value={formData.course_id} onChange={(e) => setFormData({ ...formData, course_id: e.target.value })} className="bg-[#0a0a0a] border border-slate-700 rounded-md px-3 py-2.5 text-sm text-slate-200 w-full focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all">
                      {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                  <div className="pt-2">
                    <button type="submit" disabled={submitting} className="w-full py-2.5 bg-white hover:bg-slate-200 text-black text-sm font-semibold rounded-md transition-colors shadow-sm">{submitting ? 'Generating...' : 'Confirm & Issue'}</button>
                  </div>
                </form>
             </div>
          </div>
        )}
      </AnimatePresence>

      {/* New Credential Modal */}
      <AnimatePresence>
        {isCredModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <div className="fixed inset-0 bg-[#000000]/80 backdrop-blur-sm" onClick={() => setIsCredModalOpen(false)} />
             <div className="bg-[#0f172a] border border-slate-800 w-full max-w-lg rounded-md shadow-2xl relative z-10 overflow-hidden text-slate-200">
                <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-[#0a0a0a]">
                  <h3 className="text-base font-semibold text-white flex items-center gap-2"><Key className="w-5 h-5 text-indigo-400" /> Create Student Portal Login</h3>
                  <button onClick={() => setIsCredModalOpen(false)} className="text-slate-500 hover:text-white transition-colors p-1 bg-slate-800/50 rounded-md"><X size={16}/></button>
                </div>
                <form onSubmit={handleCreateCredential} className="p-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Student Name</label>
                      <input required type="text" value={credFormData.student_name} onChange={e=>setCredFormData({...credFormData, student_name:e.target.value})} className="bg-[#0a0a0a] border border-slate-700 rounded-md px-3.5 py-2.5 text-sm text-slate-200 w-full focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600" placeholder="e.g., John Doe" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                      <input required type="email" value={credFormData.email} onChange={e=>setCredFormData({...credFormData, email:e.target.value})} className="bg-[#0a0a0a] border border-slate-700 rounded-md px-3.5 py-2.5 text-sm text-slate-200 w-full focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600" placeholder="e.g., student@cynexai.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
                      <input type="tel" value={credFormData.phone} onChange={e=>setCredFormData({...credFormData, phone:e.target.value})} className="bg-[#0a0a0a] border border-slate-700 rounded-md px-3.5 py-2.5 text-sm text-slate-200 w-full focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600" placeholder="+91 9876543210" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                      <div className="relative">
                        <input required type={showCredPassword ? "text" : "password"} value={credFormData.password} onChange={e=>setCredFormData({...credFormData, password:e.target.value})} className="bg-[#0a0a0a] border border-slate-700 rounded-md pl-3.5 pr-10 py-2.5 text-sm text-slate-200 w-full focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600" placeholder="••••••••" />
                        <button type="button" onClick={() => setShowCredPassword(!showCredPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                          {showCredPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Profile Photo URL (Optional)</label>
                    <input type="url" value={credFormData.photo_url} onChange={e=>setCredFormData({...credFormData, photo_url:e.target.value})} className="bg-[#0a0a0a] border border-slate-700 rounded-md px-3.5 py-2.5 text-sm text-slate-200 w-full focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600" placeholder="https://..." />
                  </div>
                  <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                    <button type="button" onClick={() => setIsCredModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors">Cancel</button>
                    <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-white hover:bg-slate-200 text-black text-sm font-semibold rounded-md transition-colors shadow-sm disabled:opacity-50">{submitting ? 'Creating...' : 'Create Login'}</button>
                  </div>
                </form>
             </div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Custom Certificate Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsUploadModalOpen(false)} />
             <div className="bg-[#0f172a] border border-slate-800 w-full max-w-md rounded-lg shadow-2xl relative z-10 overflow-hidden text-slate-200">
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-semibold tracking-wide text-white">Upload Custom Certificate</h3>
                  <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X size={16}/></button>
                </div>
                <form onSubmit={handleUploadCertificate} className="p-5 space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Assign to Credential</label>
                    <select required value={uploadFormData.credential_id} onChange={(e) => setUploadFormData({ ...uploadFormData, credential_id: e.target.value })} className="bg-[#0a0a0a] border border-slate-700 rounded-md px-3 py-2.5 text-sm text-slate-200 w-full focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all">
                      <option value="">-- Select Student Portal Login --</option>
                      {studentUsers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Course / Topic Name</label>
                    <input required type="text" value={uploadFormData.course_title} onChange={e=>setUploadFormData({...uploadFormData, course_title:e.target.value})} className="bg-[#0a0a0a] border border-slate-700 rounded-md px-3 py-2.5 text-sm text-slate-200 w-full focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600" placeholder="e.g., Advanced Placement Bootcamp" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Issue Date</label>
                    <input required type="date" value={uploadFormData.issued_at} onChange={e=>setUploadFormData({...uploadFormData, issued_at:e.target.value})} className="bg-[#0a0a0a] border border-slate-700 rounded-md px-3 py-2.5 text-sm text-slate-200 w-full focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" />
                  </div>
                  
                  <div className="border border-dashed border-slate-600 hover:border-slate-400 rounded-md p-6 text-center cursor-pointer transition-colors bg-[#0a0a0a]" onClick={() => fileInputRef.current?.click()}>
                     <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/png,image/jpeg" onChange={handleFileChange} />
                     {!uploadFormData.file_data ? (
                       <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                         <Upload size={24} className="text-slate-500" />
                         <p className="text-sm font-semibold text-white">Click to select PDF or Image</p>
                         <p className="text-[11px]">Max size: 500KB</p>
                       </div>
                     ) : (
                       <div className="flex flex-col items-center justify-center gap-2 text-indigo-400">
                         <FileCheck size={24} />
                         <p className="text-sm font-semibold text-white">File Ready for Upload</p>
                         <p className="text-[11px]">({uploadFormData.file_type})</p>
                       </div>
                     )}
                  </div>

                  <div className="pt-2">
                    <button type="submit" disabled={submitting || !uploadFormData.file_data} className="w-full py-2.5 bg-white hover:bg-slate-200 text-black text-sm font-semibold rounded-md transition-colors shadow-sm disabled:opacity-50">{submitting ? 'Uploading...' : 'Upload & Assign'}</button>
                  </div>
                </form>
             </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Preview Certificate */}
      <AnimatePresence>
        {selectedCertForPreview && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
             <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedCertForPreview(null)} />
             <div className="bg-gray-800 text-white w-full max-w-4xl rounded-2xl shadow-2xl relative z-10 overflow-hidden">
               <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between bg-gray-900/50">
                  <div className="flex items-center gap-3 text-sm font-bold">
                    <Award className="text-amber-400" />
                    <span>Credential Preview</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={handlePrint} className="px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"><Printer size={14} /> Print</button>
                    <button onClick={() => setSelectedCertForPreview(null)} className="p-2 bg-gray-900 text-gray-400 hover:text-white rounded-lg transition-all"><X size={14} /></button>
                  </div>
               </div>

               {/* Certificate Layout */}
               <div className="p-8 bg-gray-900 flex justify-center overflow-x-auto">
                 <div id="print-preview-cert" className="w-[800px] h-[520px] bg-slate-900 border-[16px] border-double border-amber-500/40 relative overflow-hidden shrink-0 flex flex-col justify-between p-12 text-center" style={{ backgroundImage: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)' }}>
                    <div className="absolute top-4 left-4 w-20 h-20 border-t-2 border-l-2 border-amber-500/30" />
                    <div className="absolute top-4 right-4 w-20 h-20 border-t-2 border-r-2 border-amber-500/30" />
                    <div className="absolute bottom-4 left-4 w-20 h-20 border-b-2 border-l-2 border-amber-500/30" />
                    <div className="absolute bottom-4 right-4 w-20 h-20 border-b-2 border-r-2 border-amber-500/30" />

                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-[#41c8df] tracking-[0.3em] uppercase">CynexAI Advanced Learning Academy</div>
                      <div className="text-[9px] font-mono text-amber-500/60 uppercase tracking-widest">Official E-Credentials Ledger</div>
                    </div>

                    <div className="space-y-4">
                      <h2 className="font-serif text-amber-400 text-4xl italic tracking-wider font-light">Certificate of Completion</h2>
                      <div className="space-y-2">
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">This is proudly presented to</p>
                        <h3 className="text-white text-2xl font-black uppercase tracking-wide border-b border-slate-700/60 pb-1.5 max-w-md mx-auto">{selectedCertForPreview.student_name}</h3>
                      </div>
                      <div className="space-y-1.5 max-w-xl mx-auto">
                        <p className="text-[11px] text-slate-400 font-medium">for successfully completing the core curriculum requirements and final tests of the course</p>
                        <h4 className="text-[#41c8df] text-lg font-bold tracking-tight">{selectedCertForPreview.course_title}</h4>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 items-end pt-6 border-t border-slate-800/60 text-left">
                      <div className="space-y-1">
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Issue Date</div>
                        <div className="text-[10px] font-bold text-slate-300">{new Date(selectedCertForPreview.issued_at).toLocaleDateString()}</div>
                      </div>
                      <div className="flex flex-col items-center justify-center pb-2">
                        <div className="w-14 h-14 rounded-full border-2 border-amber-500/30 flex items-center justify-center flex-col relative bg-slate-900/50">
                          <Award className="w-6 h-6 text-amber-400/80" />
                          <div className="text-[5px] font-bold uppercase tracking-tighter text-amber-500/60 absolute bottom-1">SEAL</div>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Credential Number</div>
                        <div className="text-[10px] font-mono font-bold text-amber-500">{selectedCertForPreview.certificate_number}</div>
                      </div>
                    </div>
                 </div>
               </div>
             </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
