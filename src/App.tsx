
import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// Mock component imports to make the app runnable
import ScrollToTop from './utils/ScrollToTop';
import Header from './components/Header';
import Hero from './components/Hero';
import Courses from './components/Courses';
import Skills from './components/Skills';
import Reviews from './components/Reviews';
import { initTursoDB } from './lib/turso';

import Contact from './components/Contact';
import Footer from './components/Footer';
import CourseDetail from './components/CourseDetail';
import ApplicationForm from './components/ApplicationForm';
import WebinarPortal from './components/WebinarPortal';
import GalleryPage from './components/GalleryPage';
import PaymentPage from './components/PaymentPage';
import BrochurePage from './components/BrochurePage';
import AboutUs from './components/AboutUs';
import BlogPage from './components/BlogPage';
import BlogPostDetail from './components/BlogPostDetail';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';

const AdminRoute = () => {
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('cynexai_admin_auth') === 'true');
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = (password: string) => {
    const correctPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';
    if (password === correctPassword) {
      localStorage.setItem('cynexai_admin_auth', 'true');
      setIsAdmin(true);
      setLoginError(null);
    } else {
      setLoginError('Invalid security credentials. Access denied.');
    }
  };

  if (!isAdmin) {
    return <AdminLogin onLogin={handleLogin} error={loginError} />;
  }
  return <AdminPanel />;
};

import PromotionalPopup from './components/PromotionalPopup';

const HomePage = () => (
  <>
    <PromotionalPopup />
    <Hero />
    <Courses />
    <Skills />
    <Reviews />
    <Contact />
  </>
);

import ThreeBackground from './components/ThreeBackground';
import PageTransitionWrapper from './components/PageTransitionWrapper';

// Inner component to access router hooks like useLocation
const AppContent = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen relative z-10 flex flex-col"> {/* Ensure content is above background and footer stays at bottom */}
      <Header />
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageTransitionWrapper><HomePage /></PageTransitionWrapper>} />
            <Route path="/about" element={<PageTransitionWrapper><AboutUs /></PageTransitionWrapper>} />
            <Route path="/blog" element={<PageTransitionWrapper><BlogPage /></PageTransitionWrapper>} />
            <Route path="/blog/:id" element={<PageTransitionWrapper><BlogPostDetail /></PageTransitionWrapper>} />
            <Route path="/course/:courseId" element={<PageTransitionWrapper><CourseDetail /></PageTransitionWrapper>} />
            <Route path="/apply/:courseId" element={<PageTransitionWrapper><ApplicationForm /></PageTransitionWrapper>} />
            <Route path="/webinar" element={<PageTransitionWrapper><WebinarPortal /></PageTransitionWrapper>} />
            <Route path="/gallery" element={<PageTransitionWrapper><GalleryPage /></PageTransitionWrapper>} />
            <Route path="/pay" element={<PageTransitionWrapper><PaymentPage /></PageTransitionWrapper>} />
            <Route path="/brochure" element={<PageTransitionWrapper><BrochurePage /></PageTransitionWrapper>} />
            <Route path="/admin" element={<PageTransitionWrapper><AdminRoute /></PageTransitionWrapper>} />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
};

function App() {
  useEffect(() => {
    initTursoDB();
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <ThreeBackground />
      <AppContent />
    </Router>
  );
}


export default App;
