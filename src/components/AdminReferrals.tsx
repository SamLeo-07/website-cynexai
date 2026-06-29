import React, { useEffect, useState } from 'react';
import { Search, Edit2, Plus, X, Users, Award, CheckCircle2, TrendingUp } from 'lucide-react';
import { Referral, ReferralGift, getReferrals, getReferralGifts, updateReferralStatus, saveReferralGift, User, getUsers, createReferral } from '../lib/turso';
import { useToast } from './ToastContext';

export const AdminReferrals: React.FC = () => {
  const { showToast } = useToast();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [gifts, setGifts] = useState<ReferralGift[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'successful'>('all');

  // Add referral modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newReferrerId, setNewReferrerId] = useState('');
  const [newRefereeName, setNewRefereeName] = useState('');
  const [newRefereeEmail, setNewRefereeEmail] = useState('');
  const [newStatus, setNewStatus] = useState<'pending' | 'successful'>('pending');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [allRefs, allGifts, allUsers] = await Promise.all([
      getReferrals(),
      getReferralGifts(),
      getUsers()
    ]);
    setReferrals(allRefs);
    setGifts(allGifts);
    setUsers(allUsers);
    setLoading(false);
  };

  const handleUpdateReferralStatus = async (id: string, status: 'pending' | 'successful') => {
    await updateReferralStatus(id, status);
    showToast(`Referral status updated to ${status}`, 'success');
    loadData();
  };

  const handleUpdateGiftStatus = async (gift: ReferralGift, status: 'locked' | 'eligible' | 'delivered') => {
    const updated = { ...gift, status };
    if (updated.id.startsWith('temp-')) {
      updated.id = crypto.randomUUID();
    }
    await saveReferralGift(updated);
    showToast(`Gift status updated to ${status}`, 'success');
    loadData();
  };

  const handleForceSelectGift = async (gift: ReferralGift) => {
    const option = prompt("Enter gift selection (e.g. 'Amazon Gift Voucher'):", gift.gift_selected || "");
    if (option !== null) {
      const updated = { ...gift, gift_selected: option };
      if (updated.id.startsWith('temp-')) {
        updated.id = crypto.randomUUID();
      }
      await saveReferralGift(updated);
      showToast(`Gift selection updated`, 'success');
      loadData();
    }
  };

  const handleAddReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReferrerId) {
      showToast('Please select a referrer student.', 'warning');
      return;
    }
    if (!newRefereeName.trim()) {
      showToast('Please enter the referee name.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const newRef: Referral = {
        id: crypto.randomUUID(),
        referrer_id: newReferrerId,
        referee_name: newRefereeName.trim(),
        referee_email: newRefereeEmail.trim() || undefined,
        status: newStatus,
        created_at: new Date().toISOString()
      };
      await createReferral(newRef);
      showToast('Referral added successfully!', 'success');
      setShowAddModal(false);
      setNewRefereeName('');
      setNewRefereeEmail('');
      setNewStatus('pending');
      loadData();
    } catch (err) {
      console.error(err);
      showToast('Failed to add referral entry.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Group by student
  const studentMap = new Map<string, { user: User; refs: Referral[]; gifts: ReferralGift[] }>();
  users.forEach(u => {
    if (u.role === 'student') {
      studentMap.set(u.id, { user: u, refs: [], gifts: [] });
    }
  });

  referrals.forEach(r => {
    if (studentMap.has(r.referrer_id)) {
      studentMap.get(r.referrer_id)!.refs.push(r);
    }
  });

  gifts.forEach(g => {
    if (studentMap.has(g.student_id)) {
      // Avoid duplicate milestone gifts in the UI
      const existing = studentMap.get(g.student_id)!.gifts.find(x => x.milestone === g.milestone);
      if (!existing) {
        studentMap.get(g.student_id)!.gifts.push(g);
      }
    }
  });

  // Ensure standard milestones (3 and 5 admissions) exist for ALL students in studentMap
  studentMap.forEach((data, studentId) => {
    const successfulCount = data.refs.filter(r => r.status === 'successful').length;

    // Milestone 3
    let milestone3 = data.gifts.find(g => g.milestone === 3);
    if (!milestone3) {
      milestone3 = {
        id: `temp-3-${studentId}`,
        student_id: studentId,
        milestone: 3,
        gift_selected: null,
        status: successfulCount >= 3 ? 'eligible' : 'locked',
        created_at: new Date().toISOString()
      };
      data.gifts.push(milestone3);
    } else {
      // Auto-update status of existing milestone from locked to eligible if successfulCount reached milestone
      if (milestone3.status === 'locked' && successfulCount >= 3) {
        milestone3.status = 'eligible';
      }
    }

    // Milestone 5
    let milestone5 = data.gifts.find(g => g.milestone === 5);
    if (!milestone5) {
      milestone5 = {
        id: `temp-5-${studentId}`,
        student_id: studentId,
        milestone: 5,
        gift_selected: null,
        status: successfulCount >= 5 ? 'eligible' : 'locked',
        created_at: new Date().toISOString()
      };
      data.gifts.push(milestone5);
    } else {
      if (milestone5.status === 'locked' && successfulCount >= 5) {
        milestone5.status = 'eligible';
      }
    }

    // Sort gifts by milestone
    data.gifts.sort((a, b) => a.milestone - b.milestone);
  });

  const studentsWithReferrals = Array.from(studentMap.values())
    .filter(s => s.user.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(s => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'successful') return s.refs.some(r => r.status === 'successful');
      if (statusFilter === 'pending') return s.refs.some(r => r.status === 'pending');
      return true;
    });

  const totalReferrals = referrals.length;
  const successfulCount = referrals.filter(r => r.status === 'successful').length;
  const conversionRate = totalReferrals > 0 ? Math.round((successfulCount / totalReferrals) * 100) : 0;
  const pendingGiftsCount = gifts.filter(g => g.status === 'eligible' && g.gift_selected).length;

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading referral data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Referral Program Management</h2>
          <p className="text-slate-500">Manage successful admissions and milestone gifts.</p>
        </div>
        <button
          onClick={() => {
            const studentUsers = users.filter(u => u.role === 'student');
            if (studentUsers.length > 0) {
              setNewReferrerId(studentUsers[0].id);
            }
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all shadow-sm shadow-indigo-100 hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          Add Referral
        </button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Referrals</p>
            <h3 className="text-2xl font-extrabold text-slate-800">{totalReferrals}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Successful (Enrolled)</p>
            <h3 className="text-2xl font-extrabold text-emerald-600">{successfulCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Conversion Rate</p>
            <h3 className="text-2xl font-extrabold text-indigo-600">{conversionRate}%</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Pending Gift Deliveries</p>
            <h3 className="text-2xl font-extrabold text-amber-600">{pendingGiftsCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-800"
          />
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white p-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${statusFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${statusFilter === 'pending' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Has Pending
          </button>
          <button
            onClick={() => setStatusFilter('successful')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${statusFilter === 'successful' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Has Successful
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold text-slate-600">Student Name</th>
                <th className="py-3 px-4 font-semibold text-slate-600">Total Referrals</th>
                <th className="py-3 px-4 font-semibold text-slate-600">Successful</th>
                <th className="py-3 px-4 font-semibold text-slate-600">Milestone Gifts</th>
                <th className="py-3 px-4 font-semibold text-slate-600">Manage References</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {studentsWithReferrals.map(({ user, refs, gifts }) => {
                const successfulCount = refs.filter(r => r.status === 'successful').length;
                return (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4 font-medium text-slate-800">{user.name}</td>
                    <td className="py-4 px-4 text-slate-600">{refs.length}</td>
                    <td className="py-4 px-4 font-bold text-emerald-600">{successfulCount}</td>
                    <td className="py-4 px-4">
                      <div className="space-y-3">
                        {gifts.length === 0 ? (
                          <span className="text-slate-400 text-sm">No gifts unlocked</span>
                        ) : (
                          gifts.map(gift => (
                            <div key={gift.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-slate-700">{gift.milestone} Admissions</span>
                                <select
                                  value={gift.status}
                                  onChange={(e) => handleUpdateGiftStatus(gift, e.target.value as any)}
                                  className={`text-xs font-bold rounded-md px-2 py-1 outline-none border ${
                                    gift.status === 'delivered' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                    gift.status === 'eligible' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                    'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  <option value="locked">Locked</option>
                                  <option value="eligible">Eligible</option>
                                  <option value="delivered">Delivered</option>
                                </select>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600 truncate max-w-[150px]">
                                  {gift.gift_selected || "Not selected yet"}
                                </span>
                                <button
                                  onClick={() => handleForceSelectGift(gift)}
                                  className="p-1 hover:bg-slate-200 rounded text-slate-500"
                                  title="Edit Gift Selection"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {refs.map(r => (
                          <div key={r.id} className="flex flex-col gap-1 p-2 border border-slate-100 rounded bg-white text-sm">
                            <span className="font-medium">{r.referee_name}</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateReferralStatus(r.id, 'successful')}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${r.status === 'successful' ? 'bg-emerald-500 text-white' : 'bg-slate-100 hover:bg-emerald-100 text-slate-600'}`}
                              >
                                Success
                              </button>
                              <button
                                onClick={() => handleUpdateReferralStatus(r.id, 'pending')}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${r.status === 'pending' ? 'bg-amber-500 text-white' : 'bg-slate-100 hover:bg-amber-100 text-slate-600'}`}
                              >
                                Pending
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Referral Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Add New Referral</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddReferral} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Referrer (Student)</label>
                <select
                  value={newReferrerId}
                  onChange={(e) => setNewReferrerId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-slate-50 text-slate-850"
                  required
                >
                  <option value="" disabled>Select referring student</option>
                  {users
                    .filter(u => u.role === 'student')
                    .map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Referee Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={newRefereeName}
                  onChange={(e) => setNewRefereeName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-slate-50 text-slate-800 placeholder-slate-400"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Referee Email (Optional)</label>
                <input
                  type="email"
                  placeholder="e.g. john@example.com"
                  value={newRefereeEmail}
                  onChange={(e) => setNewRefereeEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-slate-50 text-slate-800 placeholder-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-slate-50 text-slate-800"
                  required
                >
                  <option value="pending">Pending</option>
                  <option value="successful">Successful</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-lg transition-all shadow-sm"
                >
                  {submitting ? 'Adding...' : 'Add Referral'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReferrals;
