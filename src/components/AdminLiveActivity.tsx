import { useState, useEffect } from 'react';
import { Activity, Clock, LogOut, Search, UserCheck } from 'lucide-react';
import { getUsers, User } from '../lib/turso';

const AdminLiveActivity = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadUsers();
    const interval = setInterval(loadUsers, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadUsers = async () => {
    try {
      const allUsers = await getUsers();
      setUsers(allUsers.filter(u => u.role === 'student'));
    } catch (error) {
      console.error('Failed to load users for live activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const onlineStudents = users.filter(u => u.is_online === 1);
  const offlineStudents = users.filter(u => u.is_online !== 1 && u.last_logout);

  const filteredOnline = onlineStudents.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );
  
  const filteredOffline = offlineStudents.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => new Date(b.last_logout!).getTime() - new Date(a.last_logout!).getTime()).slice(0, 50);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#41c8df] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-slate-900 p-6 rounded-2xl border border-white/5">
        <div>
          <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Activity className="text-[#41c8df] w-6 h-6" /> Live Student Activity
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Monitor real-time student logins and recent logouts.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl text-center">
            <div className="text-2xl font-black text-emerald-400">{onlineStudents.length}</div>
            <div className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-wider">Currently Online</div>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search students by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#41c8df] transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Online Students */}
        <div className="bg-slate-950 border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-slate-900/50 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-bold text-white">Online Now</h3>
          </div>
          <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
            {filteredOnline.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No students currently online.</div>
            ) : (
              filteredOnline.map(student => (
                <div key={student.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <UserCheck size={18} className="text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{student.name}</h4>
                      <div className="text-xs text-gray-400">{student.email}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-0.5">Logged In</div>
                    <div className="text-xs text-[#41c8df] font-medium flex items-center gap-1 justify-end">
                      <Clock size={12} />
                      {student.last_login ? new Date(student.last_login).toLocaleTimeString() : 'Unknown'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recently Offline Students */}
        <div className="bg-slate-950 border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-slate-900/50 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-500" />
            <h3 className="font-bold text-white">Recently Logged Out</h3>
          </div>
          <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
            {filteredOffline.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No recent activity.</div>
            ) : (
              filteredOffline.map(student => (
                <div key={student.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                      <LogOut size={18} className="text-gray-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-300">{student.name}</h4>
                      <div className="text-xs text-gray-500">{student.email}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black uppercase text-gray-600 tracking-wider mb-0.5">Logged Out</div>
                    <div className="text-xs text-gray-400 font-medium flex items-center gap-1 justify-end">
                      <Clock size={12} />
                      {student.last_logout ? new Date(student.last_logout).toLocaleTimeString() : 'Unknown'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLiveActivity;
