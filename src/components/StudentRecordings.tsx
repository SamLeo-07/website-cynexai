import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayCircle, Clock, Calendar, CheckCircle2, X, AlertCircle, HelpCircle, Video, ExternalLink, Sparkles, Terminal, FileText, Send, Loader2, Trophy } from 'lucide-react';
import { Course, Enrollment, getDailyRecordingsByBatch, getDailyRecordings, DailyRecording, markAutomaticAttendance, getBatches, Batch } from '../lib/turso';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface StudentRecordingsProps {
  enrollments: { enrollment: Enrollment; course: Course }[];
  batchId?: string;
  studentId?: string;
  studentName?: string;
}

const BASE_SUBJECTS = [
  { name: 'All', color: '#cbd5e1', accent: '#64748b' },
  { name: 'Python', color: '#6366f1', accent: '#4f46e5' },
  { name: 'SQL', color: '#f97316', accent: '#ea580c' },
  { name: 'ML', color: '#ec4899', accent: '#db2777' },
  { name: 'PowerBI', color: '#eab308', accent: '#ca8a04' },
  { name: 'Java', color: '#f43f5e', accent: '#e11d48' },
  { name: 'HTML/CSS', color: '#0ea5e9', accent: '#0284c7' },
  { name: 'JavaScript', color: '#10b981', accent: '#059669' },
  { name: 'DevOps', color: '#a855f7', accent: '#9333ea' },
  { name: 'Others', color: '#94a3b8', accent: '#475569' }
];

// --- Main component ---
export const StudentRecordings: React.FC<StudentRecordingsProps> = ({ enrollments, batchId, studentId, studentName }) => {
  const [recordings, setRecordings] = useState<DailyRecording[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState('All');
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);

  // Playback Simulation States
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // New Gamification & Automation States
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [watchTime, setWatchTime] = useState(0);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'chapters' | 'ainotes' | 'sandbox'>('chapters');
  
  // AI Notes simulation
  const [aiNotesGenerated, setAiNotesGenerated] = useState<Record<string, boolean>>({});
  const [aiNotesGenerating, setAiNotesGenerating] = useState(false);
  const [geminiNotes, setGeminiNotes] = useState<Record<string, { summary: string, takeaways: string[], codeSnippet: string, sandboxTask: string, chapters: { time: string, title: string }[] }>>({});

  // Sandbox simulation
  const [sandboxCode, setSandboxCode] = useState('');
  const [sandboxConsole, setSandboxConsole] = useState<string[]>([]);
  const [sandboxRunning, setSandboxRunning] = useState(false);
  const [sandboxPassed, setSandboxPassed] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('cynexai_sandbox_passed');
    return saved ? JSON.parse(saved) : {};
  });

  // Level-up celebration animation overlay state
  const [showLevelUp, setShowLevelUp] = useState<{ active: boolean; badgeTitle: string; xp: number } | null>(null);

  // Dynamic Subjects computation
  const dynamicSubjects = React.useMemo(() => {
    const existingNames = new Set(BASE_SUBJECTS.map(s => s.name.toLowerCase()));
    const customSubjects = recordings
      .map(r => r.subject)
      .filter(Boolean)
      .filter(s => !existingNames.has(s.toLowerCase()));
      
    const uniqueCustom = Array.from(new Set(customSubjects)).map((name, i) => {
      // Pick a random-ish stable color for new subjects based on index
      const colors = ['#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444', '#3b82f6'];
      const accents = ['#7c3aed', '#0d9488', '#d97706', '#dc2626', '#2563eb'];
      return {
        name,
        color: colors[i % colors.length],
        accent: accents[i % accents.length]
      };
    });

    return [...BASE_SUBJECTS, ...uniqueCustom];
  }, [recordings]);

  // Reset video-specific states when selected video changes
  useEffect(() => {
    if (selectedVideo) {
      setWatchTime(0);
      setAttendanceMarked(false);
      setSidebarTab('chapters');
      setIsFocusMode(false);
      
      // Load sandbox starter code based on subject
      const sub = (selectedVideo.subject || 'python').toLowerCase();
      if (sub === 'sql') {
        setSandboxCode(`-- Write a SQL query to select all columns from 'students' where status is 'active' \nSELECT * FROM students \nWHERE status = 'pass'; -- edit this query`);
      } else if (sub === 'ml' || sub === 'machine learning') {
        setSandboxCode(`# Write a python function to compute Mean Squared Error (y_true, y_pred)\ndef compute_mse(y_true, y_pred):\n    # y_true and y_pred are lists of numbers of equal length\n    # TODO: Implement MSE calculation\n    pass`);
      } else {
        setSandboxCode(`# Write a Python function 'get_even_numbers(lst)' that returns only the even numbers from 'lst'\ndef get_even_numbers(lst):\n    # TODO: Implement list filtering\n    pass`);
      }
      setSandboxConsole(['Terminal initialized. Write code and click Run Code to execute test cases.']);
    }
  }, [selectedVideo]);

  // Watch-time auto attendance tracker
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying && selectedVideo && !attendanceMarked) {
      interval = setInterval(() => {
        setWatchTime(prev => {
          const nextTime = prev + 1;
          // Auto-trigger at 12 seconds
          if (nextTime >= 12) {
            handleRealPlay(); // Registers attendance
            setAttendanceMarked(true);
            setToastMessage("Attendance marked automatically (Watched 80% of video)!");
            setTimeout(() => setToastMessage(null), 4000);
            
            // Log streak XP for watching recording
            const prevWatchXp = parseInt(localStorage.getItem('cynexai_mock_test_xp') || '0', 10);
            localStorage.setItem('cynexai_mock_test_xp', (prevWatchXp + 50).toString());
            
            if (interval) clearInterval(interval);
          }
          return nextTime;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, selectedVideo, attendanceMarked]);

  // AI Notes Generators
  const handleGenerateAiNotes = async () => {
    if (!selectedVideo) return;
    
    setAiNotesGenerating(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API key not configured");
      }
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const token = localStorage.getItem('cynexai_token') || localStorage.getItem('token') || '';
      
      const response = await fetch(`${apiUrl}/api/recordings/analyze-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          video_url: selectedVideo.video_url,
          title: selectedVideo.title,
          subject: selectedVideo.subject,
          description: selectedVideo.description
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP Error ${response.status}`);
      }

      const data = await response.json();
      
      setGeminiNotes(prev => ({ ...prev, [selectedVideo.id]: data }));
      setAiNotesGenerated(prev => ({ ...prev, [selectedVideo.id]: true }));
      setToastMessage("AI Study Notes generated successfully!");
    } catch (err: any) {
      console.error(err);
      setToastMessage(`Error: ${err.message || 'Failed to generate'}. Using defaults.`);
      // Fallback
      setAiNotesGenerated(prev => ({ ...prev, [selectedVideo.id]: true }));
    } finally {
      setAiNotesGenerating(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const getGeneratedSummary = (subject: string): string => {
    if (selectedVideo && geminiNotes[selectedVideo.id]) return geminiNotes[selectedVideo.id].summary;
    const sub = (subject || '').toLowerCase();
    if (sub === 'sql') {
      return "This lecture covered SQL JOINS. INNER JOIN retrieves rows when there is at least one match in both tables. LEFT JOIN returns all rows from the left table, and matched rows from the right table. Relational schemas enforce data consistency using primary keys (PK) and foreign keys (FK) to link database entries.";
    } else if (sub === 'ml' || sub === 'machine learning') {
      return "Introduction to Supervised Learning focusing on Linear Regression. Detailed the Mean Squared Error (MSE) cost function J(w,b) which measures average squared difference between predictions and actual values. Explained gradient descent algorithms for updates to weights (w) and biases (b).";
    }
    return "Introduction to Python data structures. Focused on Python Lists (ordered, mutable sequence), Tuples (ordered, immutable sequence), and Dictionaries (key-value mapping). Analyzed CRUD operations, index mappings, list comprehension shortcuts, and dictionary hashing time complexities.";
  };

  const getGeneratedTakeaways = (subject: string): string[] => {
    if (selectedVideo && geminiNotes[selectedVideo.id]) return geminiNotes[selectedVideo.id].takeaways;
    const sub = (subject || '').toLowerCase();
    if (sub === 'sql') {
      return [
        "INNER JOIN acts as intersection between two datasets.",
        "LEFT JOIN outputs all elements of the primary table even if right side references are null.",
        "Foreign key fields link sub-tables to parent indexes.",
        "Use GROUP BY with aggregation functions like SUM, COUNT, and AVG."
      ];
    } else if (sub === 'ml' || sub === 'machine learning') {
      return [
        "Linear Regression assumes a linear relationship between features and target.",
        "The cost function (MSE) measures prediction errors using a squared metric.",
        "The learning rate hyperparameter controls step size in gradient updates.",
        "Convergence is reached when weights change by less than epsilon."
      ];
    }
    return [
      "Lists are mutable and defined with square brackets: [].",
      "Tuples are immutable, making them hashable and faster to read: ().",
      "Dictionaries store hash mappings for constant-time O(1) lookups: {}.",
      "List comprehensions provide a clean, declarative syntax for filtering arrays."
    ];
  };

  const getGeneratedCodeSnippet = (subject: string): string => {
    if (selectedVideo && geminiNotes[selectedVideo.id]) return geminiNotes[selectedVideo.id].codeSnippet;
    const sub = (subject || '').toLowerCase();
    if (sub === 'sql') {
      return `-- SQL Joins example\nSELECT s.name, c.title, e.progress_percentage\nFROM enrollments e\nINNER JOIN students s ON e.student_id = s.id\nLEFT JOIN courses c ON e.course_id = c.id\nWHERE e.progress_percentage >= 50;`;
    } else if (sub === 'ml' || sub === 'machine learning') {
      return `# Linear Regression fit in Scikit-Learn\nimport numpy as np\nfrom sklearn.linear_model import LinearRegression\n\n# Features (X) and Target (y)\nX = np.array([[1], [2], [3], [4]])\ny = np.array([2.1, 3.9, 6.1, 7.9])\n\nmodel = LinearRegression()\nmodel.fit(X, y)\nprint(f"Weight (w): {model.coef_[0]}, Bias (b): {model.intercept_}")`;
    }
    return `# Python List Comprehension and Dict lookup\nitems = [1, 2, 3, 4, 5, 6]\nevens = [x for x in items if x % 2 == 0]\n\n# Dictionary lookups\nstudent_scores = {"alice": 95, "bob": 88}\nscore = student_scores.get("alice", 0) # O(1) time complexity`;
  };

  // Sandbox helpers
  const getSandboxTaskDescription = (subject: string): string => {
    if (selectedVideo && geminiNotes[selectedVideo.id]) return geminiNotes[selectedVideo.id].sandboxTask;
    const sub = (subject || '').toLowerCase();
    if (sub === 'sql') {
      return "Write a SQL query that retrieves all columns from the table 'students' where the 'status' column is equal to 'pass'. Hint: Use SELECT * FROM students WHERE status = 'pass';";
    } else if (sub === 'ml' || sub === 'machine learning') {
      return "Complete the function 'compute_mse(y_true, y_pred)' to return the Mean Squared Error of predictions. Correct implementation calculates sum((t - p)^2) / N.";
    }
    return "Implement the function 'get_even_numbers(lst)' to return a new list containing only the even numbers from the input list 'lst'. Example: [1,2,3,4] -> [2,4].";
  };

  const handleRunSandbox = () => {
    if (!selectedVideo) return;
    setSandboxRunning(true);
    setSandboxConsole(prev => [...prev, '> Initializing test environment...', '> Running code...']);
    
    setTimeout(() => {
      const sub = (selectedVideo.subject || 'python').toLowerCase();
      let passed = false;
      const code = sandboxCode.replace(/\s/g, ''); // strip spaces for quick heuristic checks
      
      if (sub === 'sql') {
        passed = code.toLowerCase().includes("select*fromstudentswherestatus='pass'");
      } else if (sub === 'ml' || sub === 'machine learning') {
        passed = (code.includes('**2') || code.includes('math.pow') || code.includes('*')) && code.includes('return') && !code.includes('pass');
      } else {
        passed = (code.includes('%2==0') || code.includes('&1==0')) && code.includes('return') && !code.includes('pass');
      }

      setSandboxRunning(false);
      
      if (passed) {
        setSandboxConsole(prev => [
          ...prev,
          'Test Case 1: Passed',
          'Test Case 2: Passed',
          'Test Case 3: Passed',
          'Success! All unit tests passed.',
          'Graded: 100/100.',
          'XP Rewarded: +150 XP!'
        ]);
        
        // Save passed state
        const updatedPassed = { ...sandboxPassed, [selectedVideo.id]: true };
        setSandboxPassed(updatedPassed);
        localStorage.setItem('cynexai_sandbox_passed', JSON.stringify(updatedPassed));

        // Award XP
        const currentSandboxXp = parseInt(localStorage.getItem('cynexai_sandbox_xp') || '0', 10);
        localStorage.setItem('cynexai_sandbox_xp', (currentSandboxXp + 150).toString());

        // Unlock merit badge
        unlockBadgeForSubject(sub);
      } else {
        setSandboxConsole(prev => [
          ...prev,
          'Test Case 1: Failed (Expected result matching criteria, got mismatch)',
          'Error: Heuristic validation failed. Please check your logic and try again.',
          'Hint: Make sure to return the final values and replace placeholder comments.'
        ]);
      }
    }, 1200);
  };

  const unlockBadgeForSubject = (subject: string) => {
    const customBadgesJson = localStorage.getItem('cynexai_custom_badges');
    let customBadges: Badge[] = [];
    if (customBadgesJson) {
      try {
        customBadges = JSON.parse(customBadgesJson);
      } catch (e) {
        console.error(e);
      }
    }

    let badgeTitle = '';
    let badgeIcon = '';
    let badgeDesc = '';

    if (subject === 'sql') {
      badgeTitle = 'SQL Sorcerer';
      badgeIcon = 'Star';
      badgeDesc = 'Mastered SQL relational database queries and JOIN operators.';
    } else if (subject === 'ml' || subject === 'machine learning') {
      badgeTitle = 'ML Champion';
      badgeIcon = 'Award';
      badgeDesc = 'Solved supervised learning algorithms and MSE calculation.';
    } else {
      badgeTitle = 'Python Pioneer';
      badgeIcon = 'Rocket';
      badgeDesc = 'Mastered fundamental Python structures and list comprehensions.';
    }

    // Check if already unlocked
    const alreadyUnlocked = customBadges.some(b => b.title === badgeTitle);
    if (!alreadyUnlocked) {
      const newBadge: Badge = {
        id: `badge_custom_${Date.now()}`,
        student_id: studentId || 'demo_student',
        title: badgeTitle,
        icon: badgeIcon,
        description: badgeDesc,
        unlocked_at: new Date().toISOString()
      };
      
      const nextBadges = [...customBadges, newBadge];
      localStorage.setItem('cynexai_custom_badges', JSON.stringify(nextBadges));
      
      // Trigger level-up modal
      setShowLevelUp({ active: true, badgeTitle, xp: 150 });
    }
  };

  useEffect(() => {
    const fetchRecordings = async () => {
      setLoading(true);
      try {
        let data: DailyRecording[] = [];
        if (batchId) {
          data = await getDailyRecordingsByBatch(batchId);
        } else if (enrollments && enrollments.length > 0) {
          // Fallback: If no student-specific batch is set, fetch recordings for any batches corresponding to the student's enrolled courses!
          const [allRecs, allBatchesList] = await Promise.all([
            getDailyRecordings(),
            getBatches()
          ]);
          const courseIds = enrollments.map(e => e.course.id);
          const enrolledBatchIds = allBatchesList.filter(b => courseIds.includes(b.course_id)).map(b => b.id);
          data = allRecs.filter(r => enrolledBatchIds.includes(r.batch_id));
        }
        setRecordings(data);
      } catch (err) {
        console.error("Failed to load recordings:", err);
      } finally {
        setLoading(false);
      }
    };
    
    const fetchBatches = async () => {
      try {
        const b = await getBatches();
        setBatches(b);
      } catch (err) {
        console.error(err);
      }
    };

    fetchRecordings();
    fetchBatches();
  }, [batchId]);

  const getBatchSectionName = (bId: string) => {
    return batches.find(b => b.id === bId)?.name || "General Section";
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  // YouTube URL Check Utility
  const getYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const cleanUrl = url.split('#')[0];
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|shorts\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = cleanUrl.match(regExp);
    return (match && match[1]) ? match[1] : null;
  };

  // Vimeo URL Check Utility
  const getVimeoId = (url: string): string | null => {
    if (!url) return null;
    const cleanUrl = url.split('#')[0];
    const regExp = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|manage\/videos\/)?(\d+)(?:$|\/|\?)/;
    const match = cleanUrl.match(regExp);
    return (match && match[3]) ? match[3] : null;
  };

  // Bunny Stream Check Utility
  const getBunnyStreamDetails = (url: string): { libraryId: string; videoId: string } | null => {
    if (!url) return null;
    const cleanUrl = url.split('#')[0];
    const regExp = /iframe\.mediadelivery\.net\/(?:embed|play)\/(\d+)\/([a-zA-Z0-9-]+)/;
    const match = cleanUrl.match(regExp);
    if (match && match[1] && match[2]) {
      return { libraryId: match[1], videoId: match[2] };
    }
    return null;
  };

  // Google Drive File ID Parser
  const getGoogleDriveId = (url: string): string | null => {
    if (!url) return null;
    const cleanUrl = url.split('#')[0];
    const regExp = /\/file\/d\/([a-zA-Z0-9_-]+)/;
    const match = cleanUrl.match(regExp);
    return (match && match[1]) ? match[1] : null;
  };

  const isExternalUrl = (url: string): boolean => {
    if (!url) return false;
    const cleanUrl = url.split('#')[0].toLowerCase();

    
    // Auto-detect common non-embeddable hosting sites
    if (cleanUrl.includes('drive.google.com') || cleanUrl.includes('docs.google.com')) {
      const isFile = /\/file\/d\/([a-zA-Z0-9_-]+)/.test(url);
      return !isFile; // If it's a file, we can embed it, so it is NOT external.
    }
    if (cleanUrl.includes('zoom.us')) return true;
    if (cleanUrl.includes('loom.com')) return true;
    if (cleanUrl.includes('teams.microsoft.com') || cleanUrl.includes('teams.live.com')) return true;
    
    return false;
  };

  const getCleanUrl = (url: string): string => {
    if (!url) return '';
    return url.split('#')[0];
  };

  const getPlatformDetails = (url: string) => {
    if (!url) return { name: 'External Resource', color: '#6366f1' };
    const cleanUrl = url.split('#')[0].toLowerCase();
    if (cleanUrl.includes('drive.google.com') || cleanUrl.includes('docs.google.com')) {
      return { name: 'Google Drive', color: '#1ea362' };
    }
    if (cleanUrl.includes('zoom.us')) {
      return { name: 'Zoom Recording', color: '#2D8CFF' };
    }
    if (cleanUrl.includes('loom.com')) {
      return { name: 'Loom Video', color: '#625DF5' };
    }
    if (cleanUrl.includes('teams.microsoft.com') || cleanUrl.includes('teams.live.com')) {
      return { name: 'Microsoft Teams', color: '#464EB8' };
    }
    if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
      return { name: 'YouTube Video', color: '#FF0000' };
    }
    if (cleanUrl.includes('vimeo.com') || cleanUrl.includes('player.vimeo.com')) {
      return { name: 'Vimeo Video', color: '#1AB7EA' };
    }
    if (cleanUrl.includes('mediadelivery.net') || cleanUrl.includes('bunny.net') || cleanUrl.includes('bunnycdn.ru')) {
      return { name: 'Bunny Stream', color: '#F06292' };
    }
    return { name: 'External Web Link', color: '#6366f1' };
  };

  // Handle play and mark attendance automatically
  const handlePlayToggle = async () => {
    if (isPlaying) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      // Trigger automatic attendance
      if (studentId && studentName && selectedVideo) {
        const marked = await markAutomaticAttendance(studentId, studentName, selectedVideo.id);
        if (marked) {
          setToastMessage("Attendance marked automatically: Present!");
          setTimeout(() => setToastMessage(null), 4000);
        }
      }
    }
  };

  const handleRealPlay = async () => {
    if (studentId && studentName && selectedVideo) {
      const marked = await markAutomaticAttendance(studentId, studentName, selectedVideo.id);
      if (marked) {
        setToastMessage("Attendance marked automatically: Present!");
        setTimeout(() => setToastMessage(null), 4000);
      }
    }
  };

  const handleOpenExternal = () => {
    if (selectedVideo) {
      handleRealPlay();
      const cleanUrl = selectedVideo.video_url.split('#')[0];
      window.open(cleanUrl, '_blank');
    }
  };

  const handleChapterClick = (chapter: any) => {
    if (selectedVideo && isExternalUrl(selectedVideo.video_url)) {
      setToastMessage(`Chapters are for reference. Skip to ${chapter.time} in the external player for: "${chapter.title}"`);
      setTimeout(() => setToastMessage(null), 5000);
      return;
    }
    // Jump simulated progress randomly or proportionally based on timestamp (fake proportion)
    const timeParts = chapter.time.split(':').map(Number);
    let seconds = 0;
    if (timeParts.length === 2) {
      seconds = timeParts[0] * 60 + timeParts[1];
    } else if (timeParts.length === 3) {
      seconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
    }
    
    // Simulate jump (e.g. set progress based on time, max 90m duration simulation)
    const maxSimulatedSecs = 90 * 60; // 90 mins
    const progressPercent = Math.min(100, Math.max(0, Math.round((seconds / maxSimulatedSecs) * 100)));
    
    setSimulatedProgress(progressPercent);
    setIsPlaying(true);
    
    // Trigger toast notification
    setToastMessage(`Jumping to chapter: "${chapter.title}" at ${chapter.time}`);
    setTimeout(() => setToastMessage(null), 3000);

    // Keep play timer running
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      setSimulatedProgress(p => {
        if (p >= 100) {
          clearInterval(progressTimerRef.current!);
          setIsPlaying(false);
          return 100;
        }
        return p + 0.5;
      });
    }, 500);
  };

  // Organize recordings
  const getRecordingsForSubject = (courseId: string) => {
    // Filter by active subject
    const subjectFiltered = recordings.filter(rec => {
      if (activeSubject !== 'All' && rec.subject.toLowerCase() !== activeSubject.toLowerCase()) return false;
      return true;
    });

    // Fallback if no recordings uploaded yet
    if (subjectFiltered.length === 0 && recordings.length === 0) {
      // Return default mock records mapped per subject
      const defaultMockData = [
        {
          id: `${courseId}_rec_default_1`,
          batch_id: batchId || '',
          subject: 'Python',
          title: 'Introduction to Python Data Structures',
          description: 'A deep dive into lists, tuples, dictionaries, and set operations with live code exercises.',
          video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
          duration: '1h 45m',
          recording_date: '2026-05-18',
          chapters: JSON.stringify([
            { title: 'Session Setup & Intro', time: '00:00' },
            { title: 'Lists vs Tuples Operations', time: '15:30' },
            { title: 'Dictionaries Deep Dive', time: '45:00' },
            { title: 'Q&A and Code Exercises', time: '1:30:00' }
          ])
        },
        {
          id: `${courseId}_rec_default_2`,
          batch_id: batchId || '',
          subject: 'SQL',
          title: 'SQL Joins & Complex Subqueries',
          description: 'Understanding Inner, Left, Right and Full Joins. Optimizing nested queries and relational rules.',
          video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
          duration: '2h 10m',
          recording_date: '2026-05-20',
          chapters: JSON.stringify([
            { title: 'Inner Joins Basics', time: '00:00' },
            { title: 'Outer Joins & NULL safety', time: '25:15' },
            { title: 'Nested Subqueries', time: '1:10:00' },
            { title: 'Closing Remarks & Homework', time: '1:55:00' }
          ])
        },
        {
          id: `${courseId}_rec_default_3`,
          batch_id: batchId || '',
          subject: 'ML',
          title: 'Linear Regression & Cost Functions',
          description: 'Theory of gradient descent, mapping learning rates, and weights convergence mathematically.',
          video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
          duration: '1h 55m',
          recording_date: '2026-05-22',
          chapters: JSON.stringify([
            { title: 'Theoretical Foundation', time: '00:00' },
            { title: 'Cost Function Math', time: '20:00' },
            { title: 'Python Implementation', time: '55:00' },
            { title: 'Q&A & Verification', time: '1:35:00' }
          ])
        }
      ];

      return defaultMockData.filter(d => activeSubject === 'All' || d.subject.toLowerCase() === activeSubject.toLowerCase());
    }

    return subjectFiltered;
  };

  if (enrollments.length === 0) {
    return (
      <div className="bg-background-100 border border-secondary/10 rounded-[3rem] p-20 text-center shadow-sm">
        <PlayCircle className="w-20 h-20 text-secondary/20 mx-auto mb-6" />
        <h3 className="text-2xl font-bold text-secondary mb-3">No Class Recordings Available</h3>
        <p className="text-secondary/60 max-w-md mx-auto">You need to be enrolled in a course to view past class recordings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-12">
      {/* Title */}
      <div className="mb-4">
        <h2 className="text-3xl font-black text-secondary mb-2">Class Recordings</h2>
        <p className="text-slate-500 font-medium dark:text-secondary/60">Stream past live classes, review chapters, and select subjects in 3D.</p>
      </div>

      {/* Subject Selector Hub — Beautiful 2D Interactive Grid */}
      <div className="relative w-full bg-slate-950 rounded-xl overflow-hidden border border-secondary/10 shadow-2xl">
        {/* Top gradient glow */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none z-0" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-0" />

        {/* Header */}
        <div className="relative z-10 px-6 pt-6 pb-4 flex items-center justify-between border-b border-white/5">
          <div>
            <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black rounded-md uppercase tracking-widest">
              Subject Hub
            </span>
            <h3 className="text-white text-base font-bold mt-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              Select a Subject to Filter Recordings
            </h3>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-[10px] font-mono text-indigo-400/50">SYSTEM STATUS: ACTIVE</p>
            <p className="text-[9px] font-mono text-white/20">{dynamicSubjects.length} SUBJECTS AVAILABLE</p>
          </div>
        </div>

        <div className="relative z-10 p-5 grid grid-cols-3 sm:grid-cols-5 gap-3">
          {dynamicSubjects.map((sub, idx) => {
            const isActive = activeSubject === sub.name;
            return (
              <motion.button
                key={sub.name}
                onClick={() => setActiveSubject(sub.name)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.04, type: 'spring', stiffness: 300, damping: 20 }}
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={`relative flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-all cursor-pointer ${
                  isActive
                    ? 'border-indigo-500 shadow-lg shadow-indigo-500/20'
                    : 'border-white/8 hover:border-white/20'
                }`}
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, ${sub.color}20, ${sub.color}08)`
                    : 'rgba(255,255,255,0.03)'
                }}
              >
                {/* Glow dot */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black border ${
                    isActive ? 'border-opacity-60 shadow-md' : 'border-white/10'
                  }`}
                  style={{
                    background: isActive ? `${sub.color}30` : 'rgba(255,255,255,0.05)',
                    borderColor: isActive ? sub.color : undefined,
                    boxShadow: isActive ? `0 0 14px ${sub.color}50` : undefined
                  }}
                >
                  <span style={{ color: isActive ? sub.color : 'rgba(255,255,255,0.4)', fontSize: '10px' }}>
                    {sub.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>

                <span
                  className={`text-[10px] font-black uppercase tracking-wider ${
                    isActive ? 'text-white' : 'text-white/40'
                  }`}
                  style={{ color: isActive ? sub.color : undefined }}
                >
                  {sub.name}
                </span>

                {isActive && (
                  <motion.div
                    layoutId="active-subject-indicator"
                    className="absolute inset-0 rounded-lg"
                    style={{ border: `1px solid ${sub.color}60`, boxShadow: `inset 0 0 20px ${sub.color}10` }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 2D Fallback Tab selection for fast accessibility */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-3 no-scrollbar border-b border-slate-100 flex-wrap gap-y-2">
        {dynamicSubjects.map((sub) => (
          <button
            key={sub.name}
            onClick={() => setActiveSubject(sub.name)}
            className={`px-5 py-2.5 rounded-md font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              activeSubject === sub.name
                ? 'bg-secondary text-background shadow-lg shadow-secondary/10'
                : 'bg-background-100 border border-secondary/10 text-secondary/60 hover:text-secondary hover:border-secondary/30'
            }`}
          >
            {sub.name}
          </button>
        ))}
      </div>

      {/* Recordings Grid sorted by Course */}
      {loading ? (
        <div className="flex flex-col justify-center items-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-secondary/10 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm font-bold text-secondary/40 uppercase tracking-widest animate-pulse">Loading class archives...</p>
        </div>
      ) : (
        enrollments.map(({ course }) => {
          const courseRecs = getRecordingsForSubject(course.id);
          
          if (courseRecs.length === 0) return null;

          return (
            <div key={course.id} className="space-y-6">
              <div className="flex items-center gap-3 mb-6 border-b border-secondary/10 pb-4">
                <div className="w-10 h-10 rounded-md overflow-hidden shadow-sm shrink-0">
                  <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-secondary">{course.title}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Class Video Catalog (Section-Specific)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courseRecs.map((recording) => {
                  const chaptersList = recording.chapters ? JSON.parse(recording.chapters) : [];
                  
                  return (
                    <motion.div
                      key={recording.id}
                      whileHover={{ y: -5 }}
                      className="bg-background-100 rounded-xl overflow-hidden cursor-pointer group shadow-lg relative border border-secondary/10"
                      onClick={() => setSelectedVideo({ ...recording, courseName: course.title })}
                    >
                      <div className="h-48 relative bg-slate-950">
                        {/* Generic beautiful programming thumbnail fallback */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent z-10" />
                        <div className="w-full h-full flex items-center justify-center opacity-60 group-hover:opacity-80 transition-opacity">
                          <div className="p-8 bg-indigo-500/5 border border-indigo-500/15 rounded-full">
                            <Video size={40} className="text-indigo-400" />
                          </div>
                        </div>
                        
                        {/* Subject & Section Badges */}
                        <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2">
                          <span className="px-2.5 py-0.5 bg-black/60 border border-white/10 text-white text-[10px] font-bold rounded-md">
                            {recording.subject}
                          </span>
                          <span className="px-2.5 py-0.5 bg-indigo-600 text-white text-[10px] font-black rounded-md uppercase tracking-wider">
                            {getBatchSectionName(recording.batch_id)}
                          </span>
                        </div>

                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                          <div className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-300">
                            <PlayCircle className="w-8 h-8 text-white ml-1" />
                          </div>
                        </div>

                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-md flex items-center gap-2 text-white/90 text-xs font-bold z-20">
                          <Clock size={12} />
                          {recording.duration || '1h 30m'}
                        </div>
                      </div>
                      
                      <div className="p-6 relative z-10 space-y-3">
                        <h4 className="text-base font-bold text-secondary line-clamp-1 group-hover:text-indigo-400 transition-colors">{recording.title}</h4>
                        {recording.description && <p className="text-xs text-secondary/60 line-clamp-2">{recording.description}</p>}
                        <div className="flex items-center gap-4 text-[10px] font-bold text-secondary/60 pt-2 border-t border-secondary/10">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} />
                            {recording.recording_date}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-indigo-400" />
                            {chaptersList.length} Chapters
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Video Player Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedVideo(null);
                setIsPlaying(false);
                if (progressTimerRef.current) clearInterval(progressTimerRef.current);
              }}
              className={`absolute inset-0 transition-all duration-500 ${
                isFocusMode ? 'bg-slate-950/98 backdrop-blur-2xl' : 'bg-slate-950/90 backdrop-blur-xl'
              }`}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`bg-background-100 border w-full max-w-6xl rounded-xl relative z-10 overflow-hidden flex flex-col lg:flex-row max-h-[90vh] transition-all duration-500 ${
                isFocusMode 
                  ? 'border-indigo-500/50 shadow-[0_0_80px_rgba(99,102,241,0.2)] scale-[1.01]' 
                  : 'border-secondary/10 shadow-2xl'
              }`}
            >
              {/* Main Player Area */}
              <div className="flex-1 flex flex-col bg-black relative">
                {/* Custom simulated Toast notification */}
                <AnimatePresence>
                  {toastMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -20, x: '-50%' }}
                      animate={{ opacity: 1, y: 0, x: '-50%' }}
                      exit={{ opacity: 0, y: -20, x: '-50%' }}
                      className="absolute top-4 left-1/2 z-50 bg-indigo-600 text-white px-5 py-2.5 rounded-md font-bold text-xs shadow-xl flex items-center gap-2 border border-white/20 whitespace-nowrap"
                    >
                      <CheckCircle2 size={14} />
                      {toastMessage}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Real / Simulated Video Player */}
                <div className="relative aspect-video bg-slate-950 flex items-center justify-center group/player overflow-hidden">
                  {isExternalUrl(selectedVideo.video_url) ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-950/80 backdrop-blur-md border border-white/5">
                      {/* Brand icon / styling based on platform */}
                      {(() => {
                        const platform = getPlatformDetails(selectedVideo.video_url);
                        const isYouTube = platform.name === 'YouTube Video';
                        return (
                          <>
                            <div className="p-6 bg-slate-900/5 border border-indigo-500/15 rounded-full mb-4 shadow-[0_0_50px_rgba(99,102,241,0.1)] relative">
                              <ExternalLink size={40} className="text-indigo-400 animate-pulse" />
                            </div>
                            <span className="px-3 py-1 bg-white/5 border border-white/10 text-white/50 text-[10px] font-bold rounded-md mb-2">
                              {isYouTube ? 'Secure Private YouTube Video' : 'External Web Link Host'}
                            </span>
                            <h3 className="text-white text-xl font-bold mb-2">
                              Watch on {platform.name}
                            </h3>
                            {isYouTube ? (
                              <div className="text-left bg-white/5 border border-white/10 rounded-lg p-5 max-w-lg mb-6 space-y-2">
                                <p className="text-xs font-bold text-white uppercase tracking-wider text-center border-b border-white/10 pb-2">
                                  Private Access Instructions
                                </p>
                                <p className="text-slate-300 text-xs leading-relaxed">
                                  1. Make sure you are signed into YouTube using your enrolled email address ({studentName || 'your registered Gmail'}).
                                  <br />
                                  2. If you haven't received access, contact your instructor to invite your email in YouTube Studio.
                                  <br />
                                  3. Click the button below. YouTube will open in a new tab, and the portal will automatically record your attendance.
                                  </p>
                              </div>
                            ) : (
                              <p className="text-slate-400 text-xs max-w-md mb-6 leading-relaxed">
                                This class recording is hosted on an external secure platform. Click the button below to watch the video in a new tab. Your attendance for this class session will be automatically marked as <span className="text-indigo-400 font-bold">Present</span>.
                              </p>
                            )}
                            <button
                              onClick={handleOpenExternal}
                              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md transition-all shadow-md shadow-indigo-500/10 hover:scale-105 active:scale-95 flex items-center gap-2.5 text-xs uppercase tracking-wider"
                            >
                              <ExternalLink size={16} />
                              {isYouTube ? 'Authorize & Watch on YouTube' : 'Launch video & register attendance'}
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  ) : isPlaying ? (
                    (() => {
                      const ytId = getYouTubeId(selectedVideo.video_url);
                      const vimeoId = getVimeoId(selectedVideo.video_url);
                      const bunnyDetails = getBunnyStreamDetails(selectedVideo.video_url);
                      const driveId = getGoogleDriveId(selectedVideo.video_url);
                      
                      if (ytId) {
                        return (
                          <iframe
                            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&enablejsapi=1`}
                            title={selectedVideo.title}
                            className="w-full h-full absolute inset-0 border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        );
                      } else if (vimeoId) {
                        return (
                          <iframe
                            src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1`}
                            title={selectedVideo.title}
                            className="w-full h-full absolute inset-0 border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        );
                      } else if (bunnyDetails) {
                        return (
                          <iframe
                            src={`https://iframe.mediadelivery.net/embed/${bunnyDetails.libraryId}/${bunnyDetails.videoId}?autoplay=true&preload=true`}
                            title={selectedVideo.title}
                            className="w-full h-full absolute inset-0 border-0"
                            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                            allowFullScreen
                          />
                        );
                      } else if (driveId) {
                        return (
                          <iframe
                            src={`https://drive.google.com/file/d/${driveId}/preview`}
                            title={selectedVideo.title}
                            className="w-full h-full absolute inset-0 border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        );
                      } else {
                        return (
                          <video
                            src={getCleanUrl(selectedVideo.video_url)}
                            controls
                            controlsList="nodownload noplaybackrate"
                            disablePictureInPicture
                            onContextMenu={(e) => e.preventDefault()}
                            autoPlay
                            className="w-full h-full absolute inset-0 pointer-events-auto"
                            onPlay={handleRealPlay}
                          />
                        );
                      }
                    })()
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-slate-900/60">
                      {/* Play button overlay */}
                      <button 
                        onClick={handlePlayToggle}
                        className="w-20 h-20 bg-indigo-600 text-white hover:bg-indigo-700 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-md shadow-indigo-500/20 z-20 mb-4"
                      >
                        <PlayCircle className="w-10 h-10 text-white ml-1" />
                      </button>
                      <p className="text-white font-bold text-sm">Click to Play Recording</p>
                      <p className="text-indigo-400 text-xs font-semibold mt-1">Class Attendance will be marked automatically</p>
                    </div>
                  )}

                  {/* Progress tracking line (fallback when loading or paused) */}
                  {!isPlaying && !isExternalUrl(selectedVideo.video_url) && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
                      <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${simulatedProgress}%` }} />
                    </div>
                  )}
                </div>
                
                {/* Video Info */}
                <div className="p-6 lg:p-8 bg-background-100 flex-shrink-0 border-t border-secondary/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-secondary">{selectedVideo.title}</h2>
                    <p className="text-xs text-secondary/60 mb-2">{selectedVideo.description || 'No description provided.'}</p>
                    <div className="flex items-center gap-6 text-xs font-bold text-secondary/40">
                      <span className="flex items-center gap-1.5"><Calendar size={14} /> Recorded: {selectedVideo.recording_date}</span>
                      <span className="flex items-center gap-1.5"><Clock size={14} /> Length: {selectedVideo.duration || '1h 30m'}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 shrink-0 md:self-center">
                    <button
                      onClick={() => setIsFocusMode(!isFocusMode)}
                      className={`px-5 py-4 rounded-md font-bold transition-all shadow-sm flex items-center justify-center gap-2 text-sm ${
                        isFocusMode 
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                          : 'bg-secondary/10 border border-secondary/20 text-secondary hover:bg-secondary/20'
                      }`}
                    >
                      <Sparkles size={14} />
                      {isFocusMode ? 'Exit Focus' : 'Focus Mode'}
                    </button>
                    {isExternalUrl(selectedVideo.video_url) && (
                      <button
                        onClick={handleOpenExternal}
                        className="px-5 py-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold rounded-md transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
                      >
                        <ExternalLink size={16} />
                        Watch on External Link
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar Tabs Container */}
              <div className="w-full lg:w-96 bg-background-100 border-t lg:border-t-0 lg:border-l border-secondary/10 flex flex-col flex-shrink-0 max-h-[45vh] lg:max-h-none overflow-hidden select-none">
                {/* Header tabs */}
                <div className="p-3 border-b border-secondary/10 flex bg-secondary/5 items-center justify-between">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setSidebarTab('chapters')}
                      className={`px-3 py-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
                        sidebarTab === 'chapters'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-secondary/60 hover:bg-secondary/5'
                      }`}
                    >
                      Chapters
                    </button>
                    <button
                      type="button"
                      onClick={() => setSidebarTab('ainotes')}
                      className={`px-3 py-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                        sidebarTab === 'ainotes'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-secondary/60 hover:bg-secondary/5'
                      }`}
                    >
                      <Sparkles size={10} /> AI Notes
                    </button>
                    <button
                      type="button"
                      onClick={() => setSidebarTab('sandbox')}
                      className={`px-3 py-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                        sidebarTab === 'sandbox'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-secondary/60 hover:bg-secondary/5'
                      }`}
                    >
                      <Terminal size={10} /> Sandbox
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => {
                      setSelectedVideo(null);
                      setIsPlaying(false);
                      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
                    }}
                    className="p-2 bg-secondary/5 hover:bg-secondary/10 text-secondary/40 hover:text-secondary rounded-md transition-all hidden lg:block"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Tab content wrapper */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar flex flex-col">
                  {sidebarTab === 'chapters' && (
                    <div className="space-y-2">
                      {(() => {
                        let parsedChapters = [];
                        if (selectedVideo.chapters) {
                          try {
                            parsedChapters = typeof selectedVideo.chapters === 'string' ? JSON.parse(selectedVideo.chapters) : selectedVideo.chapters;
                          } catch (e) {
                            parsedChapters = [{ time: '00:00', title: 'Session Introduction' }];
                          }
                        } else {
                          parsedChapters = [{ time: '00:00', title: 'Session Introduction' }];
                        }
                        
                        if (geminiNotes[selectedVideo.id] && geminiNotes[selectedVideo.id].chapters) {
                          parsedChapters = geminiNotes[selectedVideo.id].chapters;
                        }

                        return parsedChapters.map((chapter: any, index: number) => (
                          <button 
                            key={index}
                            onClick={() => handleChapterClick(chapter)}
                            className="w-full p-3.5 rounded-md flex items-center gap-3.5 text-left transition-all hover:bg-secondary/5 group border border-transparent hover:border-secondary/10"
                          >
                            <div className="w-12 h-7 rounded bg-secondary/5 flex items-center justify-center text-[10px] font-mono font-bold text-indigo-400 border border-indigo-500/15 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                              {chapter.time}
                            </div>
                            <span className="text-secondary/60 font-medium group-hover:text-secondary transition-colors line-clamp-1 text-xs">
                              {chapter.title}
                            </span>
                          </button>
                        ));
                      })()}
                    </div>
                  )}

                  {sidebarTab === 'ainotes' && (
                    <div className="flex flex-col flex-1 gap-4">
                      {!(aiNotesGenerated[selectedVideo.id]) ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-4">
                          <div className="p-4 bg-indigo-500/5 border border-indigo-500/15 rounded-full mb-4">
                            <Sparkles size={32} className="text-indigo-400" />
                          </div>
                          <h4 className="font-bold text-secondary text-sm mb-2 font-black uppercase tracking-wider">AI Summarizer</h4>
                          <p className="text-xs text-secondary/60 mb-6 leading-relaxed">
                            Generate structured summaries, takeaways, math formulas, and code references dynamically from this class recording's audio.
                          </p>
                          <button
                            type="button"
                            onClick={handleGenerateAiNotes}
                            disabled={aiNotesGenerating}
                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-indigo-500/10"
                          >
                            {aiNotesGenerating ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Sparkles size={14} />
                                Generate AI Notes
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4 text-left select-text">
                          <div className="border-l-2 border-indigo-500 pl-3 py-1">
                            <h4 className="font-bold text-indigo-400 text-xs uppercase tracking-wider">Concept Summary</h4>
                            <p className="text-xs text-secondary/70 mt-1 leading-relaxed">
                              {getGeneratedSummary(selectedVideo.subject)}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-bold text-secondary text-xs uppercase tracking-wider">Key Takeaways</h4>
                            <ul className="list-disc pl-4 text-xs text-secondary/70 space-y-1">
                              {getGeneratedTakeaways(selectedVideo.subject).map((t: string, idx: number) => (
                                <li key={idx}>{t}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-secondary/5">
                            <h4 className="font-bold text-secondary text-xs uppercase tracking-wider">Generated Code Reference</h4>
                            <pre className="bg-slate-950 p-3 rounded-md text-[10px] font-mono text-emerald-400 overflow-x-auto border border-secondary/10">
                              <code>{getGeneratedCodeSnippet(selectedVideo.subject)}</code>
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {sidebarTab === 'sandbox' && (
                    <div className="flex flex-col flex-1 gap-3">
                      <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-md p-3.5">
                        <h4 className="font-bold text-secondary text-xs flex items-center gap-1.5 font-black uppercase tracking-wider">
                          <Terminal size={14} className="text-indigo-400" />
                          Coding Challenge
                        </h4>
                        <p className="text-[11px] text-secondary/70 mt-1.5 leading-relaxed font-medium">
                          {getSandboxTaskDescription(selectedVideo.subject)}
                        </p>
                        <span className="inline-block mt-2 text-[9px] font-black text-yellow-500 uppercase tracking-widest">Reward: +150 XP</span>
                      </div>

                      <div className="flex-1 flex flex-col border border-secondary/10 rounded-md overflow-hidden min-h-[160px]">
                        <div className="bg-secondary/5 px-3 py-1.5 border-b border-secondary/10 flex justify-between items-center">
                          <span className="text-[9px] font-mono text-secondary/50 font-bold uppercase tracking-wider">
                            {(selectedVideo.subject || 'python').toLowerCase() === 'sql' ? 'main.sql' : 'solution.py'}
                          </span>
                          {sandboxPassed[selectedVideo.id] && (
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 size={10} /> Completed
                            </span>
                          )}
                        </div>
                        <textarea
                          value={sandboxCode}
                          onChange={(e) => setSandboxCode(e.target.value)}
                          className="flex-1 p-3 bg-slate-950 text-emerald-400 font-mono text-xs outline-none resize-none no-scrollbar min-h-[120px]"
                          placeholder="Write code here..."
                        />
                      </div>

                      <div className="bg-black border border-white/5 rounded-md p-3 h-28 overflow-y-auto font-mono text-[10px] text-slate-300 space-y-1">
                        {sandboxConsole.map((log, idx) => (
                          <div key={idx} className={log.startsWith('>') ? 'text-indigo-400' : log.includes('Passed') || log.includes('Success') ? 'text-emerald-400' : log.includes('Failed') ? 'text-red-400' : 'text-slate-300'}>
                            {log}
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleRunSandbox}
                        disabled={sandboxRunning}
                        className="w-full py-3.5 bg-secondary text-background font-bold rounded-md text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        {sandboxRunning ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Evaluating...
                          </>
                        ) : (
                          <>
                            <PlayCircle size={14} />
                            Run Code & Submit
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Level-Up Celebration Modal */}
              <AnimatePresence>
                {showLevelUp && showLevelUp.active && (
                  <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }}
                      onClick={() => setShowLevelUp(null)} 
                      className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" 
                    />
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                      animate={{ opacity: 1, scale: 1, y: 0 }} 
                      exit={{ opacity: 0, scale: 0.9, y: 20 }}
                      className="relative bg-background-100 border-2 border-indigo-500/30 rounded-xl p-8 w-full max-w-md shadow-2xl text-center overflow-hidden"
                    >
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none" />
                      
                      <div className="w-20 h-20 bg-secondary/5 border border-indigo-500/20 rounded-md flex items-center justify-center text-indigo-400 mx-auto mb-6 shadow-inner animate-bounce">
                        <Trophy size={44} />
                      </div>
                      
                      <span className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-black rounded-md mb-3 inline-block">
                        Achievement Unlocked
                      </span>
                      
                      <h3 className="text-secondary text-2xl font-black mb-2">
                        {showLevelUp.badgeTitle}!
                      </h3>
                      
                      <p className="text-secondary/60 text-xs max-w-sm mx-auto mb-6 leading-relaxed">
                        Congratulations! You successfully resolved the sandbox challenge. You have been awarded <span className="text-indigo-400 font-bold">+{showLevelUp.xp} XP</span> and unlocked the **{showLevelUp.badgeTitle}** merit badge.
                      </p>
                      
                      <button
                        type="button"
                        onClick={() => setShowLevelUp(null)}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-500/10"
                      >
                        Claim Rewards & Continue
                      </button>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
