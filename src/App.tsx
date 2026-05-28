import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

// Mock component imports to make the app runnable
import ScrollToTop from './utils/ScrollToTop';
import Header from './components/Header';
import Hero from './components/Hero';
import Courses from './components/Courses';
import CoursesLanding from './components/CoursesLanding';
import Skills from './components/Skills';
import Reviews from './components/Reviews';
import Contact from './components/Contact';
import Footer from './components/Footer';
import CourseDetail from './components/CourseDetail';
import ApplicationForm from './components/ApplicationForm';
import WebinarPortal from './components/WebinarPortal';
import GalleryPage from './components/GalleryPage';
import AdminPanel from './components/AdminPanel';
import PaymentPage from './components/PaymentPage';
import BlogPage from './components/BlogPage';
import BlogPostDetail from './components/BlogPostDetail';
import AboutUs from './components/AboutUs';
import StudentLogin from './components/StudentLogin';
import StudentPortal from './components/StudentPortal';
import { CertificatePortal } from './components/CertificatePortal';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import BrochurePage from './components/BrochurePage';
import FAQ from './components/FAQ';
import { ToastProvider } from './components/ToastContext';
import IntroExplorerCard from './components/IntroExplorerCard';

const HomePage = () => (
  <>
    <IntroExplorerCard />
    <Hero />
    <Courses />
    <Skills />
    <Reviews />
    <Contact />
    <FAQ />
  </>
);

function AppContent() {
  const location = useLocation();
  const hideHeaderFooter = ['/portal', '/login', '/admin'].some(path => 
    location.pathname === path || location.pathname.startsWith(path + '/')
  );

  return (
    <div className="min-h-screen relative z-10">
      {!hideHeaderFooter && <Header />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses" element={<CoursesLanding />} />
        <Route path="/course/:courseId" element={<CourseDetail />} />
        <Route path="/apply/:courseId" element={<ApplicationForm />} />
        <Route path="/webinar" element={<WebinarPortal />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/pay" element={<PaymentPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:id" element={<BlogPostDetail />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/login" element={<StudentLogin />} />
        <Route path="/portal" element={<StudentPortal />} />
        <Route path="/portal/certificate" element={<CertificatePortal />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/brochure" element={<BrochurePage />} />
      </Routes>
      {!hideHeaderFooter && <Footer />}
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <Router>
        <ScrollToTop />
        <AppContent />
      </Router>
    </ToastProvider>
  );
}


export default App;
