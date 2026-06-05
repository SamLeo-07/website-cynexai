import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, BookOpen, TrendingUp, DollarSign, 
  CheckCircle2, Clock, Ticket, Briefcase,
  BarChart3, PieChart, Activity
} from 'lucide-react';
import {
  getAdminStats,
  getEnrollmentStatsByCourse,
  getRevenueOverTime,
  AdminStats
} from '../lib/turso';

const AdminAnalytics = () => {
  const [stats, setStats] = useState<AdminStats>({
    totalStudents: 0, totalCourses: 0, totalEnrollments: 0,
    activeEnrollments: 0, completedEnrollments: 0,
    totalRevenue: 0, totalPayments: 0, openTickets: 0,
    totalJobs: 0, totalWebinars: 0
  });
  const [courseEnrollments, setCourseEnrollments] = useState<{ course_title: string; count: number }[]>([]);
  const [revenueData, setRevenueData] = useState<{ month: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, ce, rd] = await Promise.all([
        getAdminStats(),
        getEnrollmentStatsByCourse(),
        getRevenueOverTime()
      ]);
      setStats(s);
      setCourseEnrollments(ce);
      setRevenueData(rd);
    } catch (e) {
      console.error("Failed to load analytics", e);
    } finally {
      setLoading(false);
    }
  };

  const kpiCards = [
    { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500/10' },
    { label: 'Total Courses', value: stats.totalCourses, icon: BookOpen, color: 'from-purple-500 to-pink-500', bg: 'bg-purple-500/10' },
    { label: 'Total Enrollments', value: stats.totalEnrollments, icon: TrendingUp, color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500/10' },
    { label: 'Active Enrollments', value: stats.activeEnrollments, icon: Activity, color: 'from-[#41c8df] to-cyan-400', bg: 'bg-[#41c8df]/10' },
    { label: 'Completed', value: stats.completedEnrollments, icon: CheckCircle2, color: 'from-green-500 to-emerald-400', bg: 'bg-green-500/10' },
    { label: 'Total Revenue', value: `₹${(stats.totalRevenue).toLocaleString()}`, icon: DollarSign, color: 'from-yellow-500 to-orange-400', bg: 'bg-yellow-500/10' },
    { label: 'Open Tickets', value: stats.openTickets, icon: Ticket, color: 'from-red-500 to-rose-400', bg: 'bg-red-500/10' },
    { label: 'Job Listings', value: stats.totalJobs, icon: Briefcase, color: 'from-indigo-500 to-violet-400', bg: 'bg-indigo-500/10' },
  ];

  const maxEnrollment = Math.max(...courseEnrollments.map(e => e.count), 1);
  const maxRevenue = Math.max(...revenueData.map(r => r.revenue), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#41c8df] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`${kpi.bg} border border-secondary/10 rounded-2xl p-5 hover:scale-[1.02] transition-all cursor-default`}
          >
            <div className="flex items-center justify-between mb-3">
              <kpi.icon className={`w-5 h-5 bg-gradient-to-br ${kpi.color} text-transparent bg-clip-text`} />
              <span className={`text-[10px] font-black uppercase tracking-widest bg-gradient-to-r ${kpi.color} text-transparent bg-clip-text`}>
                {kpi.label}
              </span>
            </div>
            <div className="text-2xl font-black text-secondary">{kpi.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment by Course Bar Chart */}
        <div className="bg-background/40 backdrop-blur-xl border border-secondary/10 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="text-[#41c8df]" size={20} />
            <h3 className="text-lg font-bold text-secondary">Enrollments by Course</h3>
          </div>
          {courseEnrollments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No enrollment data yet.</p>
          ) : (
            <div className="space-y-3">
              {courseEnrollments.map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300 font-medium truncate">{item.course_title}</span>
                    <span className="text-secondary font-bold">{item.count}</span>
                  </div>
                  <div className="w-full bg-secondary/10 rounded-full h-2.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.count / maxEnrollment) * 100}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className="h-full bg-gradient-to-r from-[#41c8df] to-cyan-400 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revenue Over Time */}
        <div className="bg-background/40 backdrop-blur-xl border border-secondary/10 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <PieChart className="text-emerald-400" size={20} />
            <h3 className="text-lg font-bold text-secondary">Revenue Overview</h3>
          </div>
          {revenueData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No revenue data yet.</p>
          ) : (
            <div className="space-y-3">
              {revenueData.map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300 font-medium">{item.month}</span>
                    <span className="text-emerald-400 font-bold">₹{item.revenue.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-secondary/10 rounded-full h-2.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.revenue / maxRevenue) * 100}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Payment Records', value: stats.totalPayments, icon: DollarSign },
          { label: 'Webinars', value: stats.totalWebinars, icon: Activity },
          { label: 'Active Courses', value: stats.totalCourses, icon: BookOpen },
          { label: 'Enrollment Rate', value: stats.totalEnrollments > 0 ? `${Math.round((stats.activeEnrollments / stats.totalEnrollments) * 100)}%` : '0%', icon: TrendingUp },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            className="bg-secondary/5 border border-secondary/10 rounded-xl p-4 text-center"
          >
            <item.icon className="w-4 h-4 text-gray-400 mx-auto mb-2" />
            <div className="text-lg font-black text-secondary">{item.value}</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">{item.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminAnalytics;
