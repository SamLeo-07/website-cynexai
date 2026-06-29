import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Trophy, Brain } from 'lucide-react';
import { DailyQuiz as QuizType, QuizSubmission, getDailyQuizzes, getQuizSubmissions, createQuizSubmission } from '../lib/turso';
import { useToast } from './ToastContext';

interface DailyQuizProps {
  studentId: string;
}

interface Question {
  q: string;
  options: string[];
  answer: string;
}

export const DailyQuiz: React.FC<DailyQuizProps> = ({ studentId }) => {
  const { showToast } = useToast();
  const [quiz, setQuiz] = useState<QuizType | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submission, setSubmission] = useState<QuizSubmission | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuiz();
  }, [studentId]);

  const loadQuiz = async () => {
    setLoading(true);
    const allQuizzes = await getDailyQuizzes();
    
    // Find today's quiz or the latest one
    const latestQuiz = allQuizzes.length > 0 ? allQuizzes[0] : null;
    
    if (latestQuiz) {
      setQuiz(latestQuiz);
      try {
        const parsed = JSON.parse(latestQuiz.questions);
        setQuestions(parsed);
      } catch (e) {
        console.error("Failed to parse quiz questions", e);
      }

      // Check if already submitted
      const submissions = await getQuizSubmissions(studentId);
      const mySubmission = submissions.find(s => s.quiz_id === latestQuiz.id);
      if (mySubmission) {
        setSubmission(mySubmission);
      }
    }
    
    setLoading(false);
  };

  const handleSelectOption = (qIndex: number, option: string) => {
    if (submission) return; // Cannot change after submit
    setSelectedAnswers(prev => ({ ...prev, [qIndex]: option }));
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    
    if (Object.keys(selectedAnswers).length < questions.length) {
      showToast("Please answer all questions before submitting.", "warning");
      return;
    }

    let score = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.answer) {
        score += 1;
      }
    });

    const newSub: QuizSubmission = {
      id: crypto.randomUUID(),
      student_id: studentId,
      quiz_id: quiz.id,
      score,
      submitted_at: new Date().toISOString()
    };

    await createQuizSubmission(newSub);
    setSubmission(newSub);
    showToast(`Quiz submitted! You scored ${score}/${questions.length}`, "success");
  };

  if (loading) {
    return <div className="p-8 text-center text-white/60">Loading today's quiz...</div>;
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
        <Brain className="w-16 h-16 text-cyan-500/50 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-white mb-2">No Quiz Available Today</h3>
        <p className="text-white/60">Check back later to improve your knowledge with our daily quizzes!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-cyan-900/40 via-blue-900/20 to-purple-900/40 border border-white/10 rounded-2xl p-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <Brain className="w-6 h-6 mr-3 text-cyan-400" />
            {quiz.title}
          </h2>
          <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-white/70">
            {new Date(quiz.date).toLocaleDateString()}
          </span>
        </div>
        <p className="text-white/70">Improve your knowledge with today's quiz!</p>
      </div>

      {submission ? (
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-8 text-center">
          <Trophy className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">Quiz Completed!</h3>
          <p className="text-white/70 text-lg">
            You scored <span className="text-green-400 font-bold">{submission.score}</span> out of {questions.length}
          </p>
        </div>
      ) : null}

      <div className="space-y-6">
        {questions.map((q, qIndex) => {
          const isSubmitted = !!submission;
          const _isCorrect = selectedAnswers[qIndex] === q.answer;
          const showResult = isSubmitted;

          return (
            <div key={qIndex} className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h4 className="text-lg font-medium text-white mb-4">
                {qIndex + 1}. {q.q}
              </h4>
              <div className="space-y-3">
                {q.options.map((option, oIndex) => {
                  const isSelected = selectedAnswers[qIndex] === option;
                  const isActualAnswer = option === q.answer;
                  
                  let optionClass = "bg-white/5 border-white/10 hover:bg-white/10 text-white/80";
                  
                  if (showResult) {
                    if (isActualAnswer) {
                      optionClass = "bg-green-500/20 border-green-500/50 text-green-300";
                    } else if (isSelected && !isActualAnswer) {
                      optionClass = "bg-red-500/20 border-red-500/50 text-red-300";
                    } else {
                      optionClass = "bg-white/5 border-white/10 text-white/50 opacity-50";
                    }
                  } else if (isSelected) {
                    optionClass = "bg-cyan-500/20 border-cyan-500/50 text-cyan-300";
                  }

                  return (
                    <button
                      key={oIndex}
                      onClick={() => handleSelectOption(qIndex, option)}
                      disabled={isSubmitted}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${optionClass}`}
                    >
                      <span>{option}</span>
                      {showResult && isActualAnswer && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                      {showResult && isSelected && !isActualAnswer && <XCircle className="w-5 h-5 text-red-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {!submission && (
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-105"
          >
            Submit Quiz
          </button>
        </div>
      )}
    </div>
  );
};

export default DailyQuiz;
