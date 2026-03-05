import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Mock component imports to make the app runnable
import ScrollToTop from './utils/ScrollToTop';
import Header from './components/Header';
import Hero from './components/Hero';
import Courses from './components/Courses';
import Skills from './components/Skills';
import Reviews from './components/Reviews';
import OurTeam from './components/OurTeam';
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
import ThreeBackground from './components/ThreeBackground';
import AboutUs from './components/AboutUs';


const HomePage = () => (
  <>
    <Hero />
    <Courses />
    <Skills />
    <Reviews />
    <Contact />
  </>
);

function App() {
  return (
    <Router>
      <ScrollToTop />
      <ThreeBackground />
      <div className="min-h-screen relative z-10">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/course/:courseId" element={<CourseDetail />} />
          <Route path="/apply/:courseId" element={<ApplicationForm />} />
          <Route path="/webinar" element={<WebinarPortal />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/pay" element={<PaymentPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:id" element={<BlogPostDetail />} />
          <Route path="/about" element={<AboutUs />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}


export default App;
