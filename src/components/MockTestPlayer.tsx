import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, CameraOff, AlertTriangle, CheckCircle2, Trophy, Clock,
  ChevronLeft, ChevronRight, Shield, ShieldAlert, Eye,
  BookOpen, BarChart3, AlertCircle, XCircle, CheckSquare,
  ChevronDown, ChevronUp, Brain
} from 'lucide-react';
import {
  getMockTests, getQuestions, createTestResult, getTestResults,
  MockTest, Question, TestResult
} from '../lib/turso';
import Editor from '@monaco-editor/react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProctoringLog {
  timestamp: string;
  type: 'head_moved' | 'tab_switch' | 'camera_denied' | 'mobile_detected' | 'multiple_faces' | 'fullscreen_exit' | 'shortcut_blocked' | 'devtools_detected';
  detail: string;
}

// ─── Utility ──────────────────────────────────────────────────────────────────
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// ─── Warning Overlay Component ────────────────────────────────────────────────
const WarningOverlay: React.FC<{
  warningCount: number;
  reason: string;
  onDismiss: () => void;
}> = ({ warningCount, reason, onDismiss }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
  >
    <motion.div
      initial={{ scale: 0.8, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.8, y: 20 }}
      className="bg-[#0f1623] border-2 border-red-500/60 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl shadow-red-500/20 text-center"
    >
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/30 animate-pulse">
        <ShieldAlert size={40} className="text-red-400" />
      </div>
      <h2 className="text-2xl font-black text-red-400 mb-2">
        ⚠ Warning {warningCount} of 3
      </h2>
      <p className="text-gray-300 text-sm mb-4 leading-relaxed">{reason}</p>
      <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
        {warningCount < 3 ? (
          <p className="text-xs text-red-300 font-medium">
            You have <span className="font-black text-red-400">{3 - warningCount}</span> warning(s) remaining. A 4th violation will <span className="font-black">automatically submit</span> your test.
          </p>
        ) : (
          <p className="text-xs text-red-400 font-black">
            This is your FINAL warning. The next violation will auto-submit your test.
          </p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl transition-colors"
      >
        I Understand — Continue Test
      </button>
    </motion.div>
  </motion.div>
);

// ─── Terminated Overlay ───────────────────────────────────────────────────────
const TerminatedOverlay: React.FC<{
  reason: string;
  onViewResults: () => void;
}> = ({ reason, onViewResults }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md">
    <div className="bg-[#0f1623] border-2 border-red-500 rounded-2xl p-10 max-w-md w-full mx-4 shadow-2xl text-center">
      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center border-2 border-red-500/40">
        <XCircle size={52} className="text-red-500" />
      </div>
      <h2 className="text-3xl font-black text-red-500 mb-3">Test Terminated</h2>
      <p className="text-gray-400 text-sm mb-2 leading-relaxed">{reason}</p>
      <p className="text-gray-500 text-xs mb-8">Your result has been recorded and submitted for admin review.</p>
      <button
        onClick={onViewResults}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-colors"
      >
        View My Results
      </button>
    </div>
  </div>
);

// ─── Camera Preview ────────────────────────────────────────────────────────────
const CameraPreview: React.FC<{
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  cameraActive: boolean;
  headMoving: boolean;
  faceDetected: boolean;
}> = ({ videoRef, stream, cameraActive, headMoving, faceDetected }) => {
  useEffect(() => {
    if (cameraActive && stream && videoRef.current) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn("Auto-play prevented", e));
      }
    }
  }, [cameraActive, stream, videoRef]);

  return (
    <div className={`relative w-28 h-20 sm:w-36 sm:h-24 md:w-44 md:h-32 rounded-xl overflow-hidden border-2 transition-all duration-300 shadow-lg ${
      !cameraActive
        ? 'border-gray-700'
        : headMoving
        ? 'border-red-500 shadow-red-500/40 shadow-lg'
        : faceDetected
        ? 'border-emerald-400/60 shadow-emerald-400/20'
        : 'border-yellow-500/60 shadow-yellow-500/20'
    }`}>
      {cameraActive ? (
      <>
        {/* Live video feed — mirrored so student sees their own face naturally */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={(e) => (e.currentTarget as HTMLVideoElement).play()}
          className="w-full h-full object-cover scale-x-[-1]"
          style={{ background: '#000' }}
        />

        {/* Alert overlay when head is moving / suspicious */}
        {headMoving && (
          <div className="absolute inset-0 bg-red-500/25 flex flex-col items-center justify-center gap-1">
            <AlertTriangle size={20} className="text-red-400 animate-pulse" />
            <span className="text-[9px] text-red-300 font-black uppercase tracking-wider">Head Movement!</span>
          </div>
        )}

        {/* Face absent warning */}
        {!faceDetected && !headMoving && (
          <div className="absolute inset-0 bg-yellow-500/20 flex flex-col items-center justify-center gap-1">
            <Eye size={20} className="text-yellow-400 animate-pulse" />
            <span className="text-[9px] text-yellow-300 font-black uppercase tracking-wider">Face Not Found</span>
          </div>
        )}

        {/* Status bar at bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${
              headMoving ? 'bg-red-500 animate-pulse'
              : faceDetected ? 'bg-emerald-400'
              : 'bg-yellow-500 animate-pulse'
            }`} />
            <span className={`text-[8px] font-black uppercase ${
              headMoving ? 'text-red-400'
              : faceDetected ? 'text-emerald-400'
              : 'text-yellow-400'
            }`}>
              {headMoving ? 'ALERT' : faceDetected ? 'LIVE' : 'LOOK AT SCREEN'}
            </span>
          </div>
          <span className="text-[8px] text-gray-500 font-bold">PROCTORED</span>
        </div>
      </>
    ) : (
      <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center">
        <CameraOff size={24} className="text-gray-600" />
      </div>
    )}
  </div>
  );
};

// ─── Props (supports both route-based and inline/embedded usage) ───────────────
interface MockTestPlayerProps {
  inlineTestId?: string;   // When embedded as overlay inside StudentMockTests
  onComplete?: () => void; // Called after test submission when embedded
}

// ─── Main Component ────────────────────────────────────────────────────────────
const MockTestPlayer: React.FC<MockTestPlayerProps> = ({ inlineTestId, onComplete }) => {
  const params = useParams<{ testId: string }>();
  const testId = inlineTestId || params.testId;

  // ─ Data State ─
  const [test, setTest] = useState<MockTest | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─ Test-taking State ─
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [codingAnswers, setCodingAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [testStarted, setTestStarted] = useState(false);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [startTime, setStartTime] = useState<number>(0);

  // ─ Proctoring State ─
  const [warnings, setWarnings] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningReason, setWarningReason] = useState('');
  const [terminated, setTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');
  const [proctoringLogs, setProctoringLogs] = useState<ProctoringLog[]>([]);
  const [confidenceRatings, setConfidenceRatings] = useState<Record<string, 'confident' | 'unsure' | 'guess'>>({});
  const [openExplanations, setOpenExplanations] = useState<Set<string>>(new Set());

  // ─ Camera State ─
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [cameraPermissionChecked, setCameraPermissionChecked] = useState(false);
  const [headMoving, setHeadMoving] = useState(false);
  const [faceDetected, setFaceDetected] = useState(true); // Assume face present at start

  // ─ ML Model State ─
  const [modelLoading, setModelLoading] = useState(false);
  const mlModelRef = useRef<any>(null);
  const faceModelRef = useRef<any>(null);

  // ─ Refs ─
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevFrameDataRef = useRef<ImageData | null>(null);
  const motionDetectionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const headMovingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const faceAbsentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef(warnings);
  const terminatedRef = useRef(terminated);
  const testSubmittedRef = useRef(testSubmitted);

  warningRef.current = warnings;
  terminatedRef.current = terminated;
  testSubmittedRef.current = testSubmitted;

  const studentName = localStorage.getItem('cynexai_student_name') || 'Student';
  const studentId = localStorage.getItem('cynexai_student_id') || 'demo-student-id';

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const addProctoringLog = (type: ProctoringLog['type'], detail: string) => {
    setProctoringLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      type,
      detail
    }]);
  };

  const handleSubmit = async (force: boolean = false, status: TestResult['status'] = 'completed') => {
    if (!force) {
      if (!window.confirm('Are you sure you want to submit your test?')) return;
    }

    if (testSubmittedRef.current) return;
    testSubmittedRef.current = true;
    setTestSubmitted(true);
    // stopCamera is defined later, but since this is called later, it's fine
    // However, it's better to inline the stream stopping or rely on the cleanup
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setCameraActive(false);

    const timeTaken = Math.round((Date.now() - startTime) / 1000);
    let correctCount = 0;
    questions.forEach(q => {
      if (q.type === 'mcq' || q.type === 'true-false') {
        const sel = selectedAnswers[q.id];
        if (sel !== undefined && q.correctAnswer !== undefined && sel === q.correctAnswer) {
          correctCount++;
        }
      } else if (q.type === 'short-answer') {
        const textAns = codingAnswers[q.id]?.trim().toLowerCase();
        const correctText = q.correctAnswerText?.trim().toLowerCase();
        if (textAns && correctText && textAns === correctText) {
          correctCount++;
        }
      }
    });

    const percentage = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

    const result: TestResult = {
      id: `res_${Date.now()}`,
      studentId,
      studentName,
      testId: test!.id,
      testTitle: test!.title,
      score: correctCount,
      totalQuestions: questions.length,
      percentage,
      date: new Date().toISOString(),
      warnings: warningRef.current,
      timeTaken,
      status: status || (terminatedRef.current ? 'terminated_cheating' : 'completed'),
      proctoringLogs: JSON.stringify(proctoringLogs),
      confidenceRatings: JSON.stringify(confidenceRatings),
      studentAnswers: JSON.stringify({ selectedAnswers, codingAnswers })
    };

    try {
      await createTestResult(result);
    } catch (e) {
      console.error('Failed to save result:', e);
    }

    setTestResult(result);
  };

  const issueWarning = useCallback((reason: string, _type: ProctoringLog['type']) => {
    if (testSubmittedRef.current || terminatedRef.current || showWarning) return;

    const newWarningCount = warningRef.current + 1;

    if (newWarningCount >= 4) {
      // Auto-terminate
      setTerminated(true);
      const msg = 'Test auto-submitted: You received 4 proctoring violations.';
      setTerminationReason(msg);
      handleSubmit(true, 'terminated_cheating');
      return;
    }

    setWarnings(newWarningCount);
    setWarningReason(reason);
    setShowWarning(true);
  }, [showWarning]);

  useEffect(() => {
    const load = async () => {
      if (!testId) { setError('Invalid test ID'); setLoading(false); return; }
      try {
        const attempts = await getTestResults();
        const attempt = attempts.find(r => 
          (studentId && r.studentId === studentId && r.testId === testId) ||
          (r.studentName === studentName && r.testId === testId)
        );
        if (attempt) {
          if (attempt.studentAnswers) {
            try {
              const parsedAnswers = JSON.parse(attempt.studentAnswers);
              if (parsedAnswers.selectedAnswers) {
                setSelectedAnswers(parsedAnswers.selectedAnswers);
              }
              if (parsedAnswers.codingAnswers) {
                setCodingAnswers(parsedAnswers.codingAnswers);
              }
            } catch (e) {
              console.error("Failed to parse student answers:", e);
            }
          }
          if (attempt.confidenceRatings) {
            try {
              setConfidenceRatings(JSON.parse(attempt.confidenceRatings));
            } catch {}
          }
          if (attempt.proctoringLogs) {
            try {
              setProctoringLogs(JSON.parse(attempt.proctoringLogs));
            } catch {}
          }
          if (attempt.warnings !== undefined) {
            setWarnings(attempt.warnings);
          }
          setTestResult(attempt);
          setTestSubmitted(true);
          setTestStarted(true);

          const allTests = await getMockTests();
          let activeTestObject = allTests.find(t => t.id === testId);
          if (!activeTestObject && testId.includes('_test_')) {
            activeTestObject = {
              id: testId,
              title: testId.includes('_test_1') ? 'Foundation Assessment'
                : testId.includes('_test_2') ? 'Mid-term Technical Evaluation'
                : 'Final Certification Mock',
              description: 'Proctored assessment',
              duration: testId.includes('_test_1') ? 45 : testId.includes('_test_2') ? 90 : 120,
              category: testId.includes('_test_1') ? 'Beginner' : testId.includes('_test_2') ? 'Intermediate' : 'Advanced',
              totalQuestions: 5,
              isActive: true,
              createdAt: new Date().toISOString()
            };
          }
          setTest(activeTestObject || null);

          let qs: Question[] = [];
          if (testId.includes('_test_')) {
            qs = generateDemoQuestions(testId);
          } else {
            qs = await getQuestions(testId, true);
          }
          if (qs.length === 0 && activeTestObject) {
            qs = generateFallbackQuestionsForTest(activeTestObject);
          }
          setQuestions(qs);
          setLoading(false);
          return;
        }

        const allTests = await getMockTests();
        let activeTestObject: MockTest | null = null;
        const found = allTests.find(t => t.id === testId);
        if (!found) {
          // Maybe it's a demo test id like "data-science-machine-learning_test_1"
          if (testId.includes('_test_')) {
            const mockTest: MockTest = {
              id: testId,
              title: testId.includes('_test_1') ? 'Foundation Assessment'
                : testId.includes('_test_2') ? 'Mid-term Technical Evaluation'
                : 'Final Certification Mock',
              description: 'Proctored assessment',
              duration: testId.includes('_test_1') ? 45 : testId.includes('_test_2') ? 90 : 120,
              category: testId.includes('_test_1') ? 'Beginner' : testId.includes('_test_2') ? 'Intermediate' : 'Advanced',
              totalQuestions: 5,
              isActive: true,
              createdAt: new Date().toISOString()
            };
            activeTestObject = mockTest;
            setTest(mockTest);
            setTimeLeft(mockTest.duration * 60);
          } else {
            setError('Test not found');
            setLoading(false);
            return;
          }
        } else {
          activeTestObject = found;
          setTest(found);
          setTimeLeft(found.duration * 60);
        }

        // Load questions - pass includeUnapproved=true so all admin-created questions load
        let qs: Question[] = [];
        if (testId.includes('_test_')) {
          qs = generateDemoQuestions(testId);
        } else {
          qs = await getQuestions(testId, true); // includeUnapproved=true for student player
        }

        if (qs.length === 0) {
          console.warn("Deepmind: No questions in database for test. Generating corporate fallback questions.");
          qs = generateFallbackQuestionsForTest(activeTestObject);
        }
        setQuestions(qs);
      } catch (e: any) {
        console.error('Test loading error:', e);
        setError(`Failed to load test data: ${e?.message || String(e)}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [testId]);

  // ─── Camera Setup ──────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setCameraGranted(true);
    } catch (err) {
      setCameraGranted(false);
      setCameraActive(false);
      addProctoringLog('camera_denied', 'Camera access was denied by the user.');
      issueWarning('Camera access is required for proctoring. Please enable camera and restart.', 'camera_denied');
    }
    setCameraPermissionChecked(true);
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Ensure video element gets the stream when the Active Test view mounts
  useEffect(() => {
    if (testStarted && !testSubmitted && cameraActive && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(e => console.warn("Auto-play prevented", e));
      }
    }
  }, [testStarted, testSubmitted, cameraActive]);

  // ─── Head/Motion Detection ─────────────────────────────────────────────────
  const detectMotion = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || video.readyState < 2) return;

    // 1. Run basic pixel motion detection (Head Movement)
    canvas.width = 80;
    canvas.height = 60;
    ctx.drawImage(video, 0, 0, 80, 60);

    const currentFrame = ctx.getImageData(0, 0, 80, 60);

    if (prevFrameDataRef.current) {
      const prev = prevFrameDataRef.current.data;
      const curr = currentFrame.data;
      let diffCount = 0;

      for (let i = 0; i < curr.length; i += 4) {
        const dr = Math.abs(curr[i] - prev[i]);
        const dg = Math.abs(curr[i + 1] - prev[i + 1]);
        const db = Math.abs(curr[i + 2] - prev[i + 2]);
        if (dr + dg + db > 45) diffCount++;
      }

      const totalPixels = 80 * 60;
      const motionRatio = diffCount / totalPixels;

      if (motionRatio > 0.08) {
        if (!headMovingTimerRef.current) {
          setHeadMoving(true);
          headMovingTimerRef.current = setTimeout(() => {
            setHeadMoving(false);
            headMovingTimerRef.current = null;
          }, 2000);

          if (motionRatio > 0.15) {
            addProctoringLog('head_moved', `Head movement detected (motion: ${(motionRatio * 100).toFixed(1)}%)`);
            issueWarning(
              'Suspicious head movement was detected by the proctoring system. Please look directly at the screen during the test.',
              'head_moved'
            );
          }
        }
      }
    }

    prevFrameDataRef.current = currentFrame;

    // 2. Run Object Detection (Mobile Phone)
    if (mlModelRef.current) {
      try {
        const predictions = await mlModelRef.current.detect(video);
        const cellPhone = predictions.find((p: any) => p.class === 'cell phone' && p.score > 0.55);
        if (cellPhone) {
          addProctoringLog('mobile_detected', `Mobile phone detected (confidence: ${(cellPhone.score * 100).toFixed(1)}%)`);
          issueWarning(
            'A mobile phone device was detected in your camera view. Use of mobile phones is strictly prohibited.',
            'mobile_detected'
          );
        }
      } catch (err) {
        console.error('Error running object detection:', err);
      }
    }

    // 3. Run Face Detection — handles head turn left/right/up/down/absent
    if (faceModelRef.current) {
      try {
        const predictions = await faceModelRef.current.estimateFaces(video, false);

        if (predictions.length === 0) {
          // No face detected — could be looking away (left/right/up)
          setFaceDetected(false);
          if (!faceAbsentTimerRef.current) {
            faceAbsentTimerRef.current = setTimeout(() => {
              faceAbsentTimerRef.current = null;
              // Still no face after 2.5s — issue a warning
              if (!testSubmittedRef.current && !terminatedRef.current) {
                addProctoringLog('head_moved', 'Face not detected — student may have looked away or turned head.');
                issueWarning(
                  'Your face is not visible in the camera. Please look directly at the screen. Turning away or looking to the side is not permitted.',
                  'head_moved'
                );
              }
            }, 2500);
          }
        } else {
          // Face is detected — clear absence timer
          setFaceDetected(true);
          if (faceAbsentTimerRef.current) {
            clearTimeout(faceAbsentTimerRef.current);
            faceAbsentTimerRef.current = null;
          }

          if (predictions.length > 1) {
            addProctoringLog('multiple_faces', `${predictions.length} faces detected on camera.`);
            issueWarning(
              'Multiple people detected in webcam view. Only the registered student is permitted in the testing area.',
              'multiple_faces' as any
            );
          } else if (predictions.length === 1) {
            // Check head pose using eye-nose symmetry
            const keypoints = predictions[0].landmarks;
            if (keypoints && keypoints.length >= 3) {
              const rightEye = keypoints[0];
              const leftEye  = keypoints[1];
              const nose     = keypoints[2];

              const distLeft  = Math.abs(nose[0] - leftEye[0]);
              const distRight = Math.abs(nose[0] - rightEye[0]);

              if (distLeft > 0 && distRight > 0) {
                const ratio = Math.max(distLeft, distRight) / Math.min(distLeft, distRight);
                // ratio > 1.9 means the nose is very asymmetrically close to one eye — head is turned
                if (ratio > 1.9) {
                  if (!headMovingTimerRef.current) {
                    setHeadMoving(true);
                    headMovingTimerRef.current = setTimeout(() => {
                      setHeadMoving(false);
                      headMovingTimerRef.current = null;
                    }, 2000);

                    addProctoringLog('head_moved', `Head turned to side (eye asymmetry ratio: ${ratio.toFixed(2)})`);
                    issueWarning(
                      'Please look directly at the screen. Turning your head to the side is not permitted during the exam.',
                      'head_moved'
                    );
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Error running face detection:', err);
      }
    } else {
      // BlazeFace not loaded — use pixel darkness heuristic to guess face presence
      // If the center region of the frame is very dark (no face), flag it
      const centerCtx = canvasRef.current.getContext('2d');
      if (centerCtx) {
        const centerData = centerCtx.getImageData(20, 10, 40, 40);
        let totalBrightness = 0;
        for (let i = 0; i < centerData.data.length; i += 4) {
          totalBrightness += (centerData.data[i] + centerData.data[i+1] + centerData.data[i+2]) / 3;
        }
        const avgBrightness = totalBrightness / (centerData.data.length / 4);
        if (avgBrightness < 15) {
          setFaceDetected(false);
        } else {
          setFaceDetected(true);
        }
      }
    }
  }, [issueWarning]);

  // ─── Tab Visibility & Browser Lockdown & DevTools Detection ────────────────
  useEffect(() => {
    if (!testStarted || testSubmittedRef.current || terminatedRef.current) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        addProctoringLog('tab_switch', 'Student switched away from the test tab.');
        issueWarning(
          'Tab switching is not allowed during the proctored exam. You navigated away from the test window.',
          'tab_switch'
        );
      }
    };

    const handleBlur = () => {
      if (!document.hidden) {
        addProctoringLog('tab_switch', 'Browser window lost focus (possible screen share or other app).');
        issueWarning(
          'The test window lost focus. Keep the test tab active and in focus at all times.',
          'tab_switch'
        );
      }
    };

    const handleFullscreenChange = () => {
      const isFullscreen = !!(document.fullscreenElement || 
                               (document as any).webkitFullscreenElement || 
                               (document as any).mozFullScreenElement || 
                               (document as any).msFullscreenElement);
      if (!isFullscreen && !testSubmittedRef.current && !terminatedRef.current) {
        addProctoringLog('fullscreen_exit', 'Student exited fullscreen mode.');
        issueWarning(
          'Fullscreen mode is required for this exam. Exiting fullscreen is a proctoring violation.',
          'fullscreen_exit'
        );
      }
    };

    const preventDefault = (e: Event) => {
      e.preventDefault();
      addProctoringLog('shortcut_blocked', `Unauthorized interaction blocked: ${e.type}`);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isDevTools = 
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c' || e.key === 'J' || e.key === 'j')) ||
        (e.ctrlKey && (e.key === 'U' || e.key === 'u')) ||
        (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'i'));
      
      const isClipboard = 
        (e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C' || e.key === 'v' || e.key === 'V' || e.key === 'x' || e.key === 'X');

      if (isDevTools || isClipboard) {
        e.preventDefault();
        addProctoringLog('shortcut_blocked', `Key shortcut blocked: ${e.key}`);
        issueWarning(
          `Keyboard shortcut (${e.key}) is disabled during the exam for security reasons.`,
          'shortcut_blocked'
        );
      }
    };

    const handleResize = () => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      if (widthDiff > 160 || heightDiff > 160) {
        addProctoringLog('devtools_detected', 'Possible DevTools window opened.');
        issueWarning(
          'Developer Console (DevTools) detection is active. Opening inspector is prohibited.',
          'devtools_detected'
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    document.addEventListener('contextmenu', preventDefault);
    document.addEventListener('copy', preventDefault);
    document.addEventListener('cut', preventDefault);
    document.addEventListener('paste', preventDefault);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('copy', preventDefault);
      document.removeEventListener('cut', preventDefault);
      document.removeEventListener('paste', preventDefault);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [testStarted, issueWarning]);

  // ─── Start motion detection loop ───────────────────────────────────────────
  useEffect(() => {
    if (testStarted && cameraActive && !testSubmitted && !terminated) {
      motionDetectionTimerRef.current = setInterval(detectMotion, 1500);
    }
    return () => {
      if (motionDetectionTimerRef.current) clearInterval(motionDetectionTimerRef.current);
    };
  }, [testStarted, cameraActive, testSubmitted, terminated, detectMotion]);

  // ─── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!testStarted || testSubmitted || terminated || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmit(true, 'timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [testStarted, testSubmitted, terminated]);

  const handleStartTest = async () => {
    setModelLoading(true);
    try {
      // Lazy load tfjs, COCO-SSD and BlazeFace to prevent initial render crashes
      const tf = await import('@tensorflow/tfjs');
      const cocoSsd = await import('@tensorflow-models/coco-ssd');
      const blazeface = await import('@tensorflow-models/blazeface');
      await tf.ready();
      mlModelRef.current = await cocoSsd.load();
      faceModelRef.current = await blazeface.load();
    } catch (e) {
      console.error("Failed to load ML model", e);
      // Fallback: we still allow test to start if model fails, just without phone detection
    } finally {
      setModelLoading(false);
    }

    await startCamera();

    // Enforce fullscreen mode on start
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen();
      }
    } catch (err) {
      console.warn("Deepmind: Fullscreen request failed on start", err);
    }

    setTestStarted(true);
    setStartTime(Date.now());
  };

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopCamera();
      if (motionDetectionTimerRef.current) clearInterval(motionDetectionTimerRef.current);
      if (headMovingTimerRef.current) clearTimeout(headMovingTimerRef.current);
      if (faceAbsentTimerRef.current) clearTimeout(faceAbsentTimerRef.current);
    };
  }, []);

  // ─── Render: Loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#080d14] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#41c8df]/20 border-t-[#41c8df] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm font-bold uppercase tracking-widest animate-pulse">Loading Test...</p>
        </div>
      </div>
    );
  }

  // ─── Render: Error ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-[#080d14] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-black text-red-400 mb-2">Error Loading Test</h2>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <button onClick={() => onComplete ? onComplete() : window.close()} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl">
            Close Tab
          </button>
        </div>
      </div>
    );
  }

  // ─── Render: Pre-Test Setup ───────────────────────────────────────────────
  if (!testStarted) {
    return (
      <div className="min-h-[100dvh] bg-[#080d14] flex justify-center p-4 py-8 overflow-y-auto">
        <div className="w-full max-w-xl my-auto pb-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-600/20 flex items-center justify-center border border-indigo-600/30">
              <Shield size={32} className="text-indigo-400" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">{test?.title}</h1>
            <p className="text-gray-400 text-sm">{test?.description}</p>
          </div>

          {/* Test Info */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { icon: Clock, label: 'Duration', value: `${test?.duration} min` },
              { icon: BookOpen, label: 'Questions', value: String(questions.length) },
              { icon: BarChart3, label: 'Passing', value: '70%' }
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <Icon size={20} className="text-[#41c8df] mx-auto mb-2" />
                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">{label}</div>
                <div className="text-lg font-black text-white">{value}</div>
              </div>
            ))}
          </div>

          {/* Proctoring Rules */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert size={18} className="text-red-400" />
              <span className="text-sm font-black text-red-400 uppercase tracking-wider">Proctoring Rules</span>
            </div>
            <ul className="space-y-2 text-xs text-gray-400">
              {[
                'Camera access is required throughout the test.',
                'Do NOT switch tabs or leave this window.',
                'Do NOT move your head or look away from the screen excessively.',
                'Do NOT use or hold a mobile phone. AI Object Detection is active.',
                'Each violation issues a warning. After 3 warnings, the next violation auto-submits your test.',
                'Your webcam feed is monitored for suspicious activity.',
                'Results include the number of proctoring violations.'
              ].map((rule, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-red-500 font-black shrink-0">•</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Camera Preview */}
          {!cameraPermissionChecked ? (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 text-center">
              <Camera size={24} className="text-gray-500 mx-auto mb-2" />
              <p className="text-gray-500 text-xs">Camera will be requested when you start.</p>
            </div>
          ) : cameraGranted ? (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
              <Camera size={20} className="text-emerald-400 shrink-0" />
              <p className="text-emerald-300 text-sm font-medium">Camera ready — proctoring active.</p>
            </div>
          ) : (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
              <CameraOff size={20} className="text-red-400 shrink-0" />
              <p className="text-red-300 text-sm font-medium">Camera denied. Enable camera and try again.</p>
            </div>
          )}

          <button
            onClick={handleStartTest}
            disabled={modelLoading}
            className={`w-full py-4 text-white font-black rounded-2xl text-lg transition-all shadow-lg flex items-center justify-center gap-3 ${
              modelLoading ? 'bg-indigo-600/50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
            }`}
          >
            {modelLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Initializing AI Proctoring...
              </>
            ) : (
              <>
                <Shield size={22} />
                Start Proctored Test
              </>
            )}
          </button>
          <p className="text-center text-xs text-gray-600 mt-3">By starting, you agree to the proctoring terms above.</p>
        </div>

        {/* Hidden canvas for motion detection */}
        <canvas ref={canvasRef} className="hidden" width={80} height={60} />
      </div>
    );
  }

  // ─── Render: Result Summary ───────────────────────────────────────────────
  if (testSubmitted && testResult) {
    const passed = testResult.percentage >= 70;
    const proctoringStatus = testResult.status === 'terminated_cheating'
      ? 'Terminated (Cheating)'
      : testResult.status === 'timeout'
      ? 'Timed Out'
      : 'Completed';

    // Calculate calibration quadrants
    const masteryCount = questions.filter(q => {
      let isCorrect = false;
      if (q.type === 'mcq' || q.type === 'true-false') {
        const sel = selectedAnswers[q.id];
        isCorrect = (sel !== undefined && q.correctAnswer !== undefined && sel === q.correctAnswer);
      } else if (q.type === 'short-answer') {
        const textAns = codingAnswers[q.id]?.trim().toLowerCase();
        const correctText = q.correctAnswerText?.trim().toLowerCase();
        isCorrect = (!!textAns && !!correctText && textAns === correctText);
      }
      return isCorrect && confidenceRatings[q.id] === 'confident';
    }).length;

    const luckyCount = questions.filter(q => {
      let isCorrect = false;
      if (q.type === 'mcq' || q.type === 'true-false') {
        const sel = selectedAnswers[q.id];
        isCorrect = (sel !== undefined && q.correctAnswer !== undefined && sel === q.correctAnswer);
      } else if (q.type === 'short-answer') {
        const textAns = codingAnswers[q.id]?.trim().toLowerCase();
        const correctText = q.correctAnswerText?.trim().toLowerCase();
        isCorrect = (!!textAns && !!correctText && textAns === correctText);
      }
      return isCorrect && (confidenceRatings[q.id] === 'unsure' || confidenceRatings[q.id] === 'guess');
    }).length;

    const misconceptionCount = questions.filter(q => {
      let isCorrect = false;
      if (q.type === 'mcq' || q.type === 'true-false') {
        const sel = selectedAnswers[q.id];
        isCorrect = (sel !== undefined && q.correctAnswer !== undefined && sel === q.correctAnswer);
      } else if (q.type === 'short-answer') {
        const textAns = codingAnswers[q.id]?.trim().toLowerCase();
        const correctText = q.correctAnswerText?.trim().toLowerCase();
        isCorrect = (!!textAns && !!correctText && textAns === correctText);
      }
      return !isCorrect && confidenceRatings[q.id] === 'confident';
    }).length;

    const gapCount = questions.filter(q => {
      let isCorrect = false;
      if (q.type === 'mcq' || q.type === 'true-false') {
        const sel = selectedAnswers[q.id];
        isCorrect = (sel !== undefined && q.correctAnswer !== undefined && sel === q.correctAnswer);
      } else if (q.type === 'short-answer') {
        const textAns = codingAnswers[q.id]?.trim().toLowerCase();
        const correctText = q.correctAnswerText?.trim().toLowerCase();
        isCorrect = (!!textAns && !!correctText && textAns === correctText);
      }
      return !isCorrect && (confidenceRatings[q.id] === 'unsure' || confidenceRatings[q.id] === 'guess');
    }).length;

    const toggleExplanation = (qid: string) => {
      setOpenExplanations(prev => {
        const next = new Set(prev);
        if (next.has(qid)) next.delete(qid);
        else next.add(qid);
        return next;
      });
    };

    return (
      <div className="min-h-screen bg-[#080d14] flex flex-col items-center justify-start p-4 md:p-8">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT PANEL: Results Summary & Analytics */}
          <div className="lg:col-span-5 space-y-6 bg-white/5 border border-white/10 rounded-[2rem] p-6 md:p-8 shadow-2xl">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center border-2 ${
              passed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
            }`}>
              {passed ? (
                <Trophy size={36} className="text-emerald-400 animate-bounce" />
              ) : (
                <AlertTriangle size={36} className="text-red-400" />
              )}
            </div>

            <div className="text-center">
              <h1 className="text-2xl font-black text-white mb-1">
                {passed ? '🎉 Test Passed!' : 'Better Luck Next Time'}
              </h1>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">{testResult.testTitle}</p>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3.5 text-center">
                <div className={`text-3xl font-black mb-1 ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
                  {testResult.percentage}%
                </div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Score</div>
              </div>
              <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3.5 text-center">
                <div className="text-3xl font-black mb-1 text-white">
                  {testResult.score}/{testResult.totalQuestions}
                </div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Correct</div>
              </div>
              <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3.5 text-center">
                <div className="text-3xl font-black mb-1 text-blue-400">
                  {Math.floor((testResult.timeTaken || 0) / 60)}m {(testResult.timeTaken || 0) % 60}s
                </div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Time Taken</div>
              </div>
              <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3.5 text-center">
                <div className={`text-3xl font-black mb-1 ${testResult.warnings && testResult.warnings > 0 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                  {testResult.warnings || 0}
                </div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Warnings</div>
              </div>
            </div>

            {/* Knowledge Calibration Matrix */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#41c8df] flex items-center gap-1.5">
                <Brain size={14} /> Knowledge Calibration
              </h3>
              <p className="text-[10px] text-gray-500 leading-normal">
                Analyzes your confidence accuracy to map your conceptual calibration model.
              </p>
              
              <div className="grid grid-cols-2 gap-3 mt-2">
                {/* Concept Mastery */}
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-xl">
                  <div className="text-lg font-black text-emerald-400">{masteryCount}</div>
                  <div className="text-[9px] font-bold text-gray-300">🎯 Concept Mastery</div>
                  <div className="text-[8px] text-gray-500 mt-0.5">Confident & Correct</div>
                </div>
                {/* Lucky Guess */}
                <div className="bg-blue-500/5 border border-blue-500/20 p-3 rounded-xl">
                  <div className="text-lg font-black text-blue-400">{luckyCount}</div>
                  <div className="text-[9px] font-bold text-gray-300">🎲 Lucky Guesses</div>
                  <div className="text-[8px] text-gray-500 mt-0.5">Guess/Unsure & Correct</div>
                </div>
                {/* Misconceptions */}
                <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-xl">
                  <div className="text-lg font-black text-red-400">{misconceptionCount}</div>
                  <div className="text-[9px] font-bold text-gray-300">⚠️ Misconceptions</div>
                  <div className="text-[8px] text-gray-500 mt-0.5">Confident & Incorrect</div>
                </div>
                {/* Knowledge Gaps */}
                <div className="bg-orange-500/5 border border-orange-500/20 p-3 rounded-xl">
                  <div className="text-lg font-black text-orange-400">{gapCount}</div>
                  <div className="text-[9px] font-bold text-gray-300">🤔 Knowledge Gaps</div>
                  <div className="text-[8px] text-gray-500 mt-0.5">Guess/Unsure & Incorrect</div>
                </div>
              </div>
            </div>

            {/* Proctoring Status Info */}
            <div className={`p-4 rounded-xl border ${
              testResult.status === 'terminated_cheating'
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-emerald-500/10 border-emerald-500/30'
            }`}>
              <div className="flex items-center gap-2">
                {testResult.status === 'terminated_cheating'
                  ? <XCircle size={16} className="text-red-400" />
                  : <CheckCircle2 size={16} className="text-emerald-400" />
                }
                <span className={`text-xs font-bold ${
                  testResult.status === 'terminated_cheating' ? 'text-red-300' : 'text-emerald-300'
                }`}>
                  Proctoring: {proctoringStatus}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Timeline audit report has been submitted to the admin console for integrity review.
              </p>
            </div>

            <button
              onClick={() => onComplete ? onComplete() : window.close()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-colors cursor-pointer text-sm"
            >
              {onComplete ? 'Back to Portal' : 'Close Tab'}
            </button>
          </div>

          {/* RIGHT PANEL: Interactive Question Review & Explanations */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 shadow-2xl">
              <h2 className="text-lg font-black text-white mb-2 flex items-center gap-2">
                <BookOpen className="text-[#41c8df]" size={20} /> Question-by-Question Review
              </h2>
              <p className="text-xs text-gray-400 leading-normal mb-6">
                Examine your answers alongside correct solutions, confidence ratings, and detailed explanations.
              </p>

              <div className="space-y-4 max-h-[650px] overflow-y-auto pr-2 scrollbar-thin">
                {questions.map((q, idx) => {
                  const selAnswer = selectedAnswers[q.id];
                  const codeAns = codingAnswers[q.id];
                  const confidence = confidenceRatings[q.id] || 'unsure';
                  
                  let isCorrect = false;
                  if (q.type === 'mcq' || q.type === 'true-false') {
                    isCorrect = (selAnswer !== undefined && q.correctAnswer !== undefined && selAnswer === q.correctAnswer);
                  } else if (q.type === 'short-answer') {
                    isCorrect = (!!codeAns && q.correctAnswerText !== undefined && codeAns.trim().toLowerCase() === q.correctAnswerText.trim().toLowerCase());
                  }

                  const showExp = openExplanations.has(q.id);

                  return (
                    <div key={q.id} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4.5 space-y-3">
                      
                      {/* Badge Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black bg-white/5 px-2 py-0.5 rounded text-gray-400">
                            Q. {idx + 1}
                          </span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            isCorrect ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                          <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">
                            {q.type}
                          </span>
                        </div>

                        {/* Confidence indicator badge */}
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-bold text-gray-500">Confidence:</span>
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                            confidence === 'confident' ? 'bg-emerald-500/10 text-emerald-400' :
                            confidence === 'unsure' ? 'bg-yellow-500/10 text-yellow-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>
                            {confidence}
                          </span>
                        </div>
                      </div>

                      {/* Question Text */}
                      <p className="text-sm font-bold text-slate-200 leading-relaxed">
                        {q.text}
                      </p>

                      {/* Question Choices */}
                      {q.type === 'mcq' && q.options && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1.5">
                          {q.options.map((opt, oi) => {
                            const isSelected = selAnswer === oi;
                            const isRightChoice = q.correctAnswer === oi;

                            let borderStyle = 'border-slate-800 bg-slate-950/20';
                            let textStyle = 'text-slate-400';
                            if (isRightChoice) {
                              borderStyle = 'border-emerald-500/30 bg-emerald-500/10';
                              textStyle = 'text-emerald-300 font-bold';
                            } else if (isSelected) {
                              borderStyle = 'border-red-500/30 bg-red-500/10';
                              textStyle = 'text-red-300';
                            }

                            return (
                              <div key={oi} className={`flex items-center gap-2 p-2.5 border rounded-xl ${borderStyle}`}>
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                  isRightChoice ? 'bg-emerald-500 text-black' : isSelected ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-500'
                                }`}>
                                  {String.fromCharCode(65 + oi)}
                                </span>
                                <span className={`text-xs ${textStyle} break-words`}>{opt}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* True/False Choices */}
                      {q.type === 'true-false' && (
                        <div className="grid grid-cols-2 gap-2 pt-1.5">
                          {['True', 'False'].map((opt, oi) => {
                            const isSelected = selAnswer === oi;
                            const isRightChoice = q.correctAnswer === oi;

                            let borderStyle = 'border-slate-800 bg-slate-950/20';
                            let textStyle = 'text-slate-400';
                            if (isRightChoice) {
                              borderStyle = 'border-emerald-500/30 bg-emerald-500/10';
                              textStyle = 'text-emerald-300 font-bold';
                            } else if (isSelected) {
                              borderStyle = 'border-red-500/30 bg-red-500/10';
                              textStyle = 'text-red-300';
                            }

                            return (
                              <div key={oi} className={`flex items-center gap-2 p-2.5 border rounded-xl ${borderStyle}`}>
                                <span className={`text-xs ${textStyle}`}>{opt}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Code / Text answers */}
                      {q.type === 'short-answer' && (
                        <div className="text-xs space-y-1.5 bg-slate-950/40 p-3 rounded-xl border border-white/5">
                          <div>
                            <span className="text-gray-500 font-bold">Your Answer:</span>{' '}
                            <span className={isCorrect ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                              {codeAns || '—'}
                            </span>
                          </div>
                          {!isCorrect && (
                            <div>
                              <span className="text-emerald-400 font-bold">Correct Answer:</span>{' '}
                              <span className="text-emerald-300 font-bold">
                                {q.correctAnswerText}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Coding questions */}
                      {q.type === 'coding' && (
                        <div className="text-xs space-y-2.5 bg-slate-950/40 p-4 rounded-xl border border-white/5 font-mono">
                          <div>
                            <span className="text-gray-500 font-bold block mb-1">Your Code Solution:</span>
                            <pre className="p-3 bg-black/60 rounded border border-white/5 text-gray-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
                              {codeAns || '// No answer submitted'}
                            </pre>
                          </div>
                          {q.boilerplate && (
                            <div>
                              <span className="text-gray-500 font-bold block mb-1">Initial Boilerplate:</span>
                              <pre className="p-3 bg-black/20 rounded border border-white/5 text-gray-500 max-h-24 overflow-y-auto whitespace-pre-wrap text-[10px]">
                                {q.boilerplate}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Toggle Explanation Button */}
                      {q.explanation && (
                        <button
                          type="button"
                          onClick={() => toggleExplanation(q.id)}
                          className="flex items-center gap-1 text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest pt-2 focus:outline-none"
                        >
                          {showExp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          {showExp ? 'Hide Explanation' : 'View Explanation'}
                        </button>
                      )}

                      {/* Explanation Drawer */}
                      {showExp && q.explanation && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="bg-indigo-500/5 border border-indigo-500/10 p-3.5 rounded-xl text-xs text-indigo-300 leading-relaxed font-medium mt-2 whitespace-pre-line"
                        >
                          <span className="font-bold block text-white text-[10px] uppercase tracking-wider mb-1">Concept Explanation</span>
                          {q.explanation}
                        </motion.div>
                      )}

                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    );
  }

  // ─── Render: Active Test ──────────────────────────────────────────────────
  const currentQ = questions[currentIdx];
  const answeredCount = Object.keys(selectedAnswers).length + Object.keys(codingAnswers).length;
  const isLastQuestion = currentIdx === questions.length - 1;
  const timerUrgent = timeLeft <= 300; // Last 5 minutes

  return (
    <div className="min-h-screen bg-[#080d14] text-white flex flex-col select-none" style={{ userSelect: 'none' }}>
      {/* ─ Header Bar ─ */}
      <div className="sticky top-0 z-50 bg-[#0d1521]/95 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Test info */}
          <div className="flex items-center gap-3 min-w-0">
            <Shield size={18} className="text-indigo-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-black text-white truncate">{test?.title}</div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{studentName}</div>
            </div>
          </div>

          {/* Center: Timer */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
            timerUrgent
              ? 'bg-red-500/20 border-red-500/40 animate-pulse'
              : 'bg-white/5 border-white/10'
          }`}>
            <Clock size={16} className={timerUrgent ? 'text-red-400' : 'text-[#41c8df]'} />
            <span className={`text-xl font-black tabular-nums ${timerUrgent ? 'text-red-400' : 'text-white'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>

          {/* Right: Proctoring status + Camera */}
          <div className="flex items-center gap-3">
            {/* Warnings indicator */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${
              warnings >= 3
                ? 'bg-red-500/20 border-red-500/40 text-red-400'
                : warnings > 0
                ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              <ShieldAlert size={12} />
              {warnings}/3
            </div>

            {/* Camera Preview */}
            <CameraPreview
              videoRef={videoRef}
              stream={streamRef.current}
              cameraActive={cameraActive}
              headMoving={headMoving}
              faceDetected={faceDetected}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full gap-4 p-4 lg:p-6">
        {/* ─ Left: Question Panel ─ */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Question */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Question {currentIdx + 1} of {questions.length}
                </span>
                {currentQ && (
                  <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md ${
                    currentQ.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-400'
                      : currentQ.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}>
                    {currentQ.difficulty}
                  </span>
                )}
              </div>
              <button
                onClick={() => setMarkedForReview(prev => {
                  const next = new Set(prev);
                  if (next.has(currentQ.id)) next.delete(currentQ.id);
                  else next.add(currentQ.id);
                  return next;
                })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors border ${
                  markedForReview.has(currentQ?.id)
                    ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-yellow-400'
                }`}
              >
                <Eye size={12} />
                {markedForReview.has(currentQ?.id) ? 'Marked' : 'Mark for Review'}
              </button>
            </div>

            <p className="text-lg font-bold text-white leading-relaxed mb-6">
              {currentQ?.text}
            </p>

            {currentQ?.type === 'coding' ? (
              <div className="h-[400px] w-full rounded-xl overflow-hidden border border-white/10">
                <Editor
                  height="100%"
                  defaultLanguage="javascript"
                  theme="vs-dark"
                  value={codingAnswers[currentQ.id] || currentQ.boilerplate || ''}
                  onChange={(value) => setCodingAnswers(prev => ({ ...prev, [currentQ.id]: value || '' }))}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: 'on',
                    padding: { top: 16 }
                  }}
                />
              </div>
            ) : currentQ?.type === 'short-answer' ? (
              <div className="w-full">
                <input
                  type="text"
                  placeholder="Enter your answer here..."
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 focus:border-[#41c8df] rounded-xl outline-none text-white font-medium"
                  value={codingAnswers[currentQ.id] || ''}
                  onChange={(e) => setCodingAnswers(prev => ({ ...prev, [currentQ.id]: e.target.value }))}
                />
              </div>
            ) : currentQ?.type === 'true-false' ? (
              <div className="space-y-3">
                {['True', 'False'].map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => setSelectedAnswers(prev => ({ ...prev, [currentQ.id]: oi }))}
                    className={`w-full text-left px-5 py-4 rounded-xl border transition-all text-sm font-medium flex items-start gap-3 ${
                      selectedAnswers[currentQ.id] === oi
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30 hover:bg-white/8'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full border text-xs font-black flex items-center justify-center shrink-0 ${
                      selectedAnswers[currentQ.id] === oi
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'border-gray-600 text-gray-500'
                    }`}>
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span className="break-words">{opt}</span>
                  </button>
                ))}
              </div>
            ) : (
              currentQ?.options && (
                <div className="space-y-3">
                  {currentQ.options.map((opt, oi) => (
                    <button
                      key={oi}
                      onClick={() => setSelectedAnswers(prev => ({ ...prev, [currentQ.id]: oi }))}
                      className={`w-full text-left px-5 py-4 rounded-xl border transition-all text-sm font-medium flex items-start gap-3 ${
                        selectedAnswers[currentQ.id] === oi
                          ? 'bg-indigo-600/20 border-indigo-500 text-white'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30 hover:bg-white/8'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full border text-xs font-black flex items-center justify-center shrink-0 ${
                        selectedAnswers[currentQ.id] === oi
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'border-gray-600 text-gray-500'
                      }`}>
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span className="break-words">{opt}</span>
                    </button>
                  ))}
                </div>
              )
            )}

            {/* Confidence Level Selector */}
            {(selectedAnswers[currentQ.id] !== undefined || codingAnswers[currentQ.id] !== undefined) && (
              <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-xl space-y-2.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#41c8df]">
                  Rate your confidence in this answer:
                </label>
                <div className="flex gap-2">
                  {[
                    { val: 'confident', label: '🎯 Confident', color: 'hover:border-emerald-500 hover:text-emerald-400', activeColor: 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold shadow-md shadow-emerald-500/10' },
                    { val: 'unsure', label: '🤔 Unsure', color: 'hover:border-yellow-500 hover:text-yellow-400', activeColor: 'bg-yellow-500/20 border-yellow-500 text-yellow-400 font-bold shadow-md shadow-yellow-500/10' },
                    { val: 'guess', label: '🎲 Guess / Unknown', color: 'hover:border-red-500 hover:text-red-400', activeColor: 'bg-red-500/20 border-red-500 text-red-400 font-bold shadow-md shadow-red-500/10' }
                  ].map((btn) => (
                    <button
                      key={btn.val}
                      type="button"
                      onClick={() => setConfidenceRatings(prev => ({ ...prev, [currentQ.id]: btn.val as any }))}
                      className={`flex-1 py-2 text-xs font-bold border rounded-lg transition-all cursor-pointer ${
                        confidenceRatings[currentQ.id] === btn.val
                          ? btn.activeColor
                          : `bg-slate-900/40 border-white/5 text-gray-400 ${btn.color}`
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all"
            >
              <ChevronLeft size={18} /> Previous
            </button>

            <div className="text-xs text-gray-500 font-bold">
              {answeredCount}/{questions.length} answered
            </div>

            {isLastQuestion ? (
              <button
                onClick={() => handleSubmit(false)}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl transition-all shadow-lg shadow-emerald-600/30"
              >
                <CheckSquare size={18} /> Submit Test
              </button>
            ) : (
              <button
                onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all"
              >
                Next <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>

        {/* ─ Right: Question Map ─ */}
        <div className="w-full lg:w-52 shrink-0">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 lg:sticky lg:top-20">
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Question Map</div>
            <div className="grid grid-cols-8 md:grid-cols-12 lg:grid-cols-5 gap-1.5 mb-4">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(i)}
                  className={`w-8 h-8 text-xs font-black rounded-lg transition-all ${
                    i === currentIdx
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                      : markedForReview.has(q.id)
                      ? 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/50'
                      : selectedAnswers[q.id] !== undefined
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-white/5 text-gray-500 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="space-y-1.5 text-[10px] text-gray-500 border-t border-white/10 pt-3">
              {[
                { color: 'bg-indigo-600', label: 'Current' },
                { color: 'bg-emerald-500/20 border border-emerald-500/30', label: 'Answered' },
                { color: 'bg-yellow-500/30 border border-yellow-500/50', label: 'For Review' },
                { color: 'bg-white/5 border border-white/10', label: 'Unanswered' }
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${color}`} />
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <button
              onClick={() => handleSubmit(false)}
              className="w-full mt-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 font-black text-xs rounded-xl border border-emerald-500/30 transition-all"
            >
              Submit Test
            </button>
          </div>
        </div>
      </div>

      {/* Hidden canvas for motion detection */}
      <canvas ref={canvasRef} className="hidden" width={80} height={60} />

      {/* ─ Warning Overlay ─ */}
      <AnimatePresence>
        {showWarning && !terminated && (
          <WarningOverlay
            warningCount={warnings}
            reason={warningReason}
            onDismiss={() => setShowWarning(false)}
          />
        )}
      </AnimatePresence>

      {/* ─ Termination Overlay ─ */}
      {terminated && testSubmitted && testResult && (
        <TerminatedOverlay
          reason={terminationReason}
          onViewResults={() => onComplete ? onComplete() : window.close()}
        />
      )}
    </div>
  );
};

// ─── Demo Question Generator ────────────────────────────────────────────────
function generateDemoQuestions(testId: string): Question[] {
  const isFoundation = testId.includes('_test_1');
  const isMidterm = testId.includes('_test_2');

  let list: Omit<Question, 'isApproved'>[] = [];

  if (isFoundation) {
    list = [
      { id: `${testId}_q1`, testId, text: 'Which of the following is used to manage packages in Python?', options: ['pip', 'npm', 'gradle', 'maven'], correctAnswer: 0, difficulty: 'easy', type: 'mcq', explanation: 'pip is the package installer for Python.' },
      { id: `${testId}_q2`, testId, text: 'What is the correct way to import pandas under the alias pd?', options: ['import pandas as pd', 'import pd from pandas', 'library(pandas) as pd', 'import pandas pd'], correctAnswer: 0, difficulty: 'easy', type: 'mcq', explanation: 'Standard alias: import pandas as pd.' },
      { id: `${testId}_q3`, testId, text: 'Which statistical metric represents the middle value in a sorted data set?', options: ['Mean', 'Median', 'Mode', 'Variance'], correctAnswer: 1, difficulty: 'easy', type: 'mcq', explanation: 'Median is the middle value.' },
      { id: `${testId}_q4`, testId, text: 'In Supervised ML, what do we need to train a model?', options: ['Only input data', 'Only labels', 'Both inputs and labels', 'No data'], correctAnswer: 2, difficulty: 'easy', type: 'mcq', explanation: 'Supervised learning needs labeled data.' },
      { id: `${testId}_q5`, testId, text: 'Which library is primarily used for statistical data visualization?', options: ['numpy', 'scikit-learn', 'seaborn', 'tensorflow'], correctAnswer: 2, difficulty: 'easy', type: 'mcq', explanation: 'Seaborn is built for statistical plots.' }
    ];
  } else if (isMidterm) {
    list = [
      { id: `${testId}_q1`, testId, text: 'What does bias-variance tradeoff refer to?', options: ['Balance of underfitting/overfitting', 'Speed vs accuracy', 'Storage vs compute', 'Feature selection'], correctAnswer: 0, difficulty: 'medium', type: 'mcq', explanation: 'Bias-variance tradeoff balances underfitting and overfitting.' },
      { id: `${testId}_q2`, testId, text: 'Which is a classification algorithm?', options: ['Linear Regression', 'Logistic Regression', 'K-Means', 'PCA'], correctAnswer: 1, difficulty: 'medium', type: 'mcq', explanation: 'Logistic Regression classifies binary outcomes.' },
      { id: `${testId}_q3`, testId, text: 'What is train_test_split used for?', options: ['Split data for training and testing', 'Clean missing values', 'Normalize features', 'Evaluate metrics'], correctAnswer: 0, difficulty: 'easy', type: 'mcq', explanation: 'train_test_split splits the dataset.' },
      { id: `${testId}_q4`, testId, text: 'TP/(TP+FP) calculates which metric?', options: ['Recall', 'Precision', 'F1-Score', 'Accuracy'], correctAnswer: 1, difficulty: 'medium', type: 'mcq', explanation: 'Precision = TP/(TP+FP).' },
      { id: `${testId}_q5`, testId, text: 'What is the topmost node of a Decision Tree?', options: ['Leaf Node', 'Branch Node', 'Root Node', 'Child Node'], correctAnswer: 2, difficulty: 'easy', type: 'mcq', explanation: 'The Root Node is at the top.' }
    ];
  } else {
    list = [
      { id: `${testId}_q1`, testId, text: 'What is the vanishing gradient problem?', options: ['Gradients too large', 'Gradients become tiny, early layers slow', 'Zero initialization', 'Negative activations'], correctAnswer: 1, difficulty: 'hard', type: 'mcq', explanation: 'Vanishing gradient: backprop gradients shrink exponentially.' },
      { id: `${testId}_q2`, testId, text: 'Best architecture for sequence data?', options: ['CNN', 'RNN', 'Feedforward NN', 'GAN'], correctAnswer: 1, difficulty: 'medium', type: 'mcq', explanation: 'RNNs are designed for sequential data.' },
      { id: `${testId}_q3`, testId, text: 'Purpose of TF-IDF?', options: ['Translate text', 'Measure word importance in a corpus', 'Correct spelling', 'Tag POS'], correctAnswer: 1, difficulty: 'medium', type: 'mcq', explanation: 'TF-IDF measures word importance.' },
      { id: `${testId}_q4`, testId, text: 'What does ROC AUC represent?', options: ['Area under ROC curve = classification quality', 'Convergence rate', 'Regression accuracy', 'Clustering index'], correctAnswer: 0, difficulty: 'hard', type: 'mcq', explanation: 'ROC AUC measures classification quality.' },
      { id: `${testId}_q5`, testId, text: 'Which technique prevents overfitting by dropping neurons?', options: ['Batch Norm', 'Gradient Descent', 'Dropout', 'L1 Regularization'], correctAnswer: 2, difficulty: 'medium', type: 'mcq', explanation: 'Dropout randomly deactivates neurons.' }
    ];
  }
  return list.map(q => ({ ...q, isApproved: true })) as Question[];
}

// ─── Fallback Question Generator ────────────────────────────────────────────
function generateFallbackQuestionsForTest(test: MockTest | null): Question[] {
  const title = test?.title?.toLowerCase() || '';
  const testId = test?.id || 'fallback';
  const isSpanish = test?.language === 'Spanish';
  
  let list: Omit<Question, 'isApproved'>[] = [];
  
  if (title.includes('python') || title.includes('programming')) {
    if (isSpanish) {
      list = [
        { id: `${testId}_f1`, testId, text: '¿Cuál de los siguientes se utiliza para administrar paquetes en Python?', options: ['pip', 'npm', 'gradle', 'maven'], correctAnswer: 0, difficulty: 'easy', type: 'mcq', explanation: 'pip es el instalador de paquetes para Python.' },
        { id: `${testId}_f2`, testId, text: '¿Cuál es la forma correcta de importar pandas con el alias pd?', options: ['import pandas as pd', 'import pd from pandas', 'library(pandas) as pd', 'import pandas pd'], correctAnswer: 0, difficulty: 'easy', type: 'mcq', explanation: 'El alias estándar es import pandas as pd.' },
        { id: `${testId}_f3`, testId, text: '¿Qué palabra clave se utiliza para definir una función en Python?', options: ['func', 'def', 'function', 'define'], correctAnswer: 1, difficulty: 'easy', type: 'mcq', explanation: 'Se usa def para definir una función.' },
        { id: `${testId}_f4`, testId, text: '¿Cuál es la salida de print(type([])) en Python?', options: ["<class 'list'>", "<class 'tuple'>", "<class 'dict'>", "<class 'set'>"], correctAnswer: 0, difficulty: 'easy', type: 'mcq', explanation: '[] es una lista.' },
        { id: `${testId}_f5`, testId, text: '¿Cómo se inserta un elemento al final de una lista en Python?', options: ['push()', 'insert()', 'add()', 'append()'], correctAnswer: 3, difficulty: 'easy', type: 'mcq', explanation: 'append() agrega un elemento al final.' }
      ];
    } else {
      list = [
        { id: `${testId}_f1`, testId, text: 'Which of the following is used to manage packages in Python?', options: ['pip', 'npm', 'gradle', 'maven'], correctAnswer: 0, difficulty: 'easy', type: 'mcq', explanation: 'pip is the package installer for Python.' },
        { id: `${testId}_f2`, testId, text: 'What is the correct way to import pandas under the alias pd?', options: ['import pandas as pd', 'import pd from pandas', 'library(pandas) as pd', 'import pandas pd'], correctAnswer: 0, difficulty: 'easy', type: 'mcq', explanation: 'Standard alias: import pandas as pd.' },
        { id: `${testId}_f3`, testId, text: 'Which keyword is used to define a function in Python?', options: ['func', 'def', 'function', 'define'], correctAnswer: 1, difficulty: 'easy', type: 'mcq', explanation: 'Use def to define a function.' },
        { id: `${testId}_f4`, testId, text: 'What is the output of print(type([])) in Python?', options: ["<class 'list'>", "<class 'tuple'>", "<class 'dict'>", "<class 'set'>"], correctAnswer: 0, difficulty: 'easy', type: 'mcq', explanation: '[] is a list.' },
        { id: `${testId}_f5`, testId, text: 'How do you insert an element at the end of a list in Python?', options: ['push()', 'insert()', 'add()', 'append()'], correctAnswer: 3, difficulty: 'easy', type: 'mcq', explanation: 'append() adds an item to the end of a list.' }
      ];
    }
  } else if (title.includes('react') || title.includes('web') || title.includes('frontend')) {
    if (isSpanish) {
      list = [
        { id: `${testId}_f1`, testId, text: '¿Cuál es el propósito principal de las claves (keys) de React en las listas?', options: ['Para rastrear cambios', 'Para aplicar estilos CSS', 'Para ejecutar la recolección de basura', 'Para cifrar elementos'], correctAnswer: 0, difficulty: 'medium', type: 'mcq', explanation: 'Las claves ayudan a React a identificar qué elementos han cambiado.' },
        { id: `${testId}_f2`, testId, text: '¿Qué hook se utiliza para realizar efectos secundarios en componentes funcionales?', options: ['useState', 'useContext', 'useEffect', 'useReducer'], correctAnswer: 2, difficulty: 'easy', type: 'mcq', explanation: 'useEffect maneja efectos secundarios.' },
        { id: `${testId}_f3`, testId, text: '¿Qué es el DOM virtual en React?', options: ['Una referencia directa al navegador', 'Una copia ligera del DOM real en memoria', 'Una base de datos externa', 'Una herramienta de compilador'], correctAnswer: 1, difficulty: 'medium', type: 'mcq', explanation: 'El DOM virtual es una copia ligera del DOM real.' },
        { id: `${testId}_f4`, testId, text: '¿Cómo se pasan los datos de un componente padre a un componente hijo?', options: ['State', 'Props', 'Context', 'Redux'], correctAnswer: 1, difficulty: 'easy', type: 'mcq', explanation: 'Las props pasan datos hacia abajo.' },
        { id: `${testId}_f5`, testId, text: '¿Cuál de los siguientes se utiliza para administrar el estado global en React?', options: ['Props', 'useState', 'useRef', 'Redux / Context API'], correctAnswer: 3, difficulty: 'medium', type: 'mcq', explanation: 'Redux y Context API administran el estado global.' }
      ];
    } else {
      list = [
        { id: `${testId}_f1`, testId, text: 'What is the main purpose of key props in React lists?', options: ['To track changes', 'To apply CSS styles', 'To run garbage collection', 'To encrypt items'], correctAnswer: 0, difficulty: 'medium', type: 'mcq', explanation: 'Keys help React identify which items have changed.' },
        { id: `${testId}_f2`, testId, text: 'Which hook is used to perform side effects in functional components?', options: ['useState', 'useContext', 'useEffect', 'useReducer'], correctAnswer: 2, difficulty: 'easy', type: 'mcq', explanation: 'useEffect handles side effects.' },
        { id: `${testId}_f3`, testId, text: 'What is the virtual DOM in React?', options: ['A direct reference to browser window', 'A lightweight memory representation of the real DOM', 'An external database', 'A compiler tool'], correctAnswer: 1, difficulty: 'medium', type: 'mcq', explanation: 'Virtual DOM is a lightweight copy of the real DOM.' },
        { id: `${testId}_f4`, testId, text: 'How do you pass data from a parent component to a child component?', options: ['State', 'Props', 'Context', 'Redux'], correctAnswer: 1, difficulty: 'easy', type: 'mcq', explanation: 'Props pass data down.' },
        { id: `${testId}_f5`, testId, text: 'Which of the following is used to manage global state in React?', options: ['Props', 'useState', 'useRef', 'Redux / Context API'], correctAnswer: 3, difficulty: 'medium', type: 'mcq', explanation: 'Redux and Context API manage global state.' }
      ];
    }
  } else {
    if (isSpanish) {
      list = [
        { id: `${testId}_f1`, testId, text: '¿Qué significa CPU?', options: ['Unidad Central de Procesamiento', 'Unidad Personal de Computadora', 'Utilidad del Procesador Central', 'Unidad de Potencia de Control'], correctAnswer: 0, difficulty: 'easy', type: 'mcq', explanation: 'CPU es la Unidad Central de Procesamiento.' },
        { id: `${testId}_f2`, testId, text: '¿Cuál de los siguientes es una memoria no volátil?', options: ['RAM', 'ROM', 'Caché L1', 'Caché L2'], correctAnswer: 1, difficulty: 'medium', type: 'mcq', explanation: 'ROM es memoria no volátil.' },
        { id: `${testId}_f3`, testId, text: '¿Cuál es el propósito principal de un sistema operativo?', options: ['Ejecutar aplicaciones web', 'Administrar recursos de hardware y aplicaciones de software', 'Compilar código', 'Alojar servidores web'], correctAnswer: 1, difficulty: 'easy', type: 'mcq', explanation: 'Un sistema operativo administra hardware y software.' },
        { id: `${testId}_f4`, testId, text: 'En sistemas de bases de datos, ¿qué significa SQL?', options: ['Structured Query Language', 'Simple Queue List', 'System Query Log', 'Standard Quality Logic'], correctAnswer: 0, difficulty: 'easy', type: 'mcq', explanation: 'SQL significa Structured Query Language.' },
        { id: `${testId}_f5`, testId, text: '¿Qué protocolo se utiliza para asegurar la transferencia de datos en la web?', options: ['HTTP', 'FTP', 'HTTPS', 'SMTP'], correctAnswer: 2, difficulty: 'easy', type: 'mcq', explanation: 'HTTPS proporciona transferencias seguras.' }
      ];
    } else {
      list = [
        { id: `${testId}_f1`, testId, text: 'What does CPU stand for?', options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Processor Utility', 'Control Power Unit'], correctAnswer: 0, difficulty: 'easy', type: 'mcq', explanation: 'CPU is the Central Processing Unit.' },
        { id: `${testId}_f2`, testId, text: 'Which of the following is a non-volatile memory?', options: ['RAM', 'ROM', 'L1 Cache', 'L2 Cache'], correctAnswer: 1, difficulty: 'medium', type: 'mcq', explanation: 'ROM is non-volatile memory.' },
        { id: `${testId}_f3`, testId, text: 'What is the primary purpose of an Operating System?', options: ['To run web applications', 'To manage hardware resources and software applications', 'To compile code', 'To host web servers'], correctAnswer: 1, difficulty: 'easy', type: 'mcq', explanation: 'An OS manages hardware and software.' },
        { id: `${testId}_f4`, testId, text: 'In database systems, what does SQL stand for?', options: ['Structured Query Language', 'Simple Queue List', 'System Query Log', 'Standard Quality Logic'], correctAnswer: 0, difficulty: 'easy', type: 'mcq', explanation: 'SQL stands for Structured Query Language.' },
        { id: `${testId}_f5`, testId, text: 'Which protocol is used to secure data transfer over the web?', options: ['HTTP', 'FTP', 'HTTPS', 'SMTP'], correctAnswer: 2, difficulty: 'easy', type: 'mcq', explanation: 'HTTPS provides secure transfers.' }
      ];
    }
  }
  return list.map(q => ({ ...q, isApproved: true })) as Question[];
}

export default MockTestPlayer;
