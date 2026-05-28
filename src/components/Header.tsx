import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown, Facebook, Twitter, Instagram, Linkedin, Youtube } from 'lucide-react';

const courseCategories = [
  { name: 'AI & Data Science', desc: 'Machine Learning, GenAI & Analytics' },
  { name: 'Development', desc: 'Full Stack Java, Python & Web Development' },
  { name: 'DevOps & Cloud', desc: 'AWS, CI/CD & Cloud Infrastructures' },
  { name: 'Testing & SAP', desc: 'Manual/Automation Testing & SAP Solutions' },
  { name: 'Browse All Courses', desc: 'Explore all CynexAI training courses', isAll: true }
];

const navItems = [
  { name: 'Home', href: '/' },
  { name: 'Courses', href: '/courses' },
  { name: 'Contact', href: '#contact' },
  { name: 'Blog', href: '/blog' },
  { name: 'About Us', href: '/about' },
];

const aboutSubItems = [
  { name: 'About Us', href: '/about', desc: 'Learn more about our mission & values' },
  { name: 'Skills', href: '#skills', desc: 'Core competencies & training areas' },
  { name: 'Reviews', href: '#reviews', desc: 'Student success stories & placements' },
  { name: 'Gallery', href: '/gallery', desc: 'Our campus & classroom memories' }
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isCoursesHovered, setIsCoursesHovered] = useState(false);
  const [mobileCoursesOpen, setMobileCoursesOpen] = useState(false);
  const [isAboutHovered, setIsAboutHovered] = useState(false);
  const [mobileAboutOpen, setMobileAboutOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Listen for scrollToId in location state (e.g., from Footer links or other pages)
  useEffect(() => {
    const state = location.state as { scrollToId?: string } | null;
    if (location.pathname === '/' && state?.scrollToId) {
      const targetId = state.scrollToId;
      console.log(`[Header] Navigation state detected. Attempting to scroll to: ${targetId}`);
      
      const timer = setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
          // Clean up state
          navigate('/', { replace: true, state: {} });
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [location, navigate]);

  const handleNavClick = (href: string, e: React.MouseEvent) => {
    e.preventDefault(); // Always prevent default, we're handling navigation
    setIsOpen(false); // Close mobile menu on click
    console.log(`[Header] Link clicked: ${href}`);
    console.log(`[Header] Current path: ${location.pathname}, Current hash: ${location.hash}`);

    if (href.startsWith('/')) { // It's a regular path like '/', '/gallery', or '/about'
      navigate(href);
      console.log(`[Header] Navigating to path: ${href}`);
    } else if (href.startsWith('#')) { // It's a hash link like '#courses'
      const targetId = href.substring(1);

      if (location.pathname === '/') {
        // If we are already on the home page, just scroll to the element
        console.log(`[Header] On home page. Attempting to scroll to ID: ${targetId}`);
        const element = document.getElementById(targetId);

        if (element) {
          console.log(`[Header] FOUND element with ID: ${targetId}. Scheduling scroll.`);
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth' });
            console.log(`[Header] Scrolled to element with ID: ${targetId} (after timeout).`);
          }, 300); // 300ms delay to allow menu animation to complete
        } else {
          console.warn(`[Header] Element with ID '${targetId}' NOT FOUND on the current (Home) page.`);
        }
      } else {
        // If we are on a different page, navigate to home and pass state to scroll there
        console.log(`[Header] Not on home page. Navigating to / with state: { scrollToId: '${targetId}' }`);
        navigate('/', { state: { scrollToId: targetId } });
      }
    }
  };


  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      // Ultra-premium glassmorphism matching standard professional IT training institutes
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 border-b border-secondary/10 bg-background/95 backdrop-blur-md shadow-lg py-0`}
    >
      {/* Top Contact Ribbon */}
      <div className="bg-slate-900 dark:bg-[#070b13] text-white py-2 px-4 flex flex-wrap justify-center items-center gap-x-4 gap-y-1.5 font-bold text-xs border-b border-secondary/10 select-none">
        <span className="text-[11px] font-black uppercase tracking-wider text-white">Enquire Now:</span>
        <div className="flex flex-wrap gap-2 justify-center items-center">
          <a href="https://maps.app.goo.gl/cMq38RHfxHpgEDKn9" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 bg-black border border-white rounded-full px-3 py-1 text-[11px] font-semibold text-white hover:border-black hover:bg-white hover:text-black transition-all">
            <span>📍</span>
            <span>KPHB, Hyderabad</span>
          </a>
          <a href="tel:+919966639869" className="flex items-center gap-1 bg-black border border-white rounded-full px-3 py-1 text-[11px] font-semibold text-white hover:border-black hover:bg-white hover:text-black transition-all">
            <span className="text-[#ec4899] font-bold">📞</span>
            <span>+91 9966639869</span>
          </a>
          <a href="mailto:contact@Cynexai.in" className="flex items-center gap-1 bg-black border border-white rounded-full px-3 py-1 text-[11px] font-semibold text-white hover:border-black hover:bg-white hover:text-black transition-all">
            <span>📧</span>
            <span>contact@Cynexai.in</span>
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* HEADER CONTAINER: Fixed height back to original compact size */}
        <div className="flex justify-between items-center h-12 lg:h-16"> {/* Ultra compact height */}
          {/* Logo */}
          <Link
            to="/"
            onClick={() => {
              setIsOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center h-full"
          >
            <img
              src="/CynexAI Logo new (1).png"
              alt="CynexAI Logo"
              className="h-10 w-auto lg:h-12 dark:brightness-0 dark:invert"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navItems.map(({ name, href }) => {
              const isActive =
                href === '/'
                  ? location.pathname === '/' && location.hash === ''
                  : href.startsWith('#')
                    ? location.pathname === '/' && location.hash === href
                    : location.pathname === href;

              if (name === 'Courses') {
                return (
                  <div
                    key={name}
                    className="relative py-2"
                    onMouseEnter={() => setIsCoursesHovered(true)}
                    onMouseLeave={() => setIsCoursesHovered(false)}
                  >
                    <button
                      onClick={(e) => handleNavClick(href, e)}
                      className={`relative font-bold tracking-wide transition-all duration-300 px-6 py-2.5 rounded-full text-sm uppercase flex items-center gap-1.5
                        ${isActive
                          ? 'bg-[#41c8df] text-black shadow-sm'
                          : 'text-secondary/80 hover:text-[#41c8df] hover:bg-secondary/5'
                        }`}
                    >
                      {name}
                      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isCoursesHovered ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isCoursesHovered && (
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 15 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 rounded-2xl bg-background-100/95 backdrop-blur-xl border border-secondary/10 shadow-2xl p-2 z-50 text-secondary"
                        >
                          <div className="flex flex-col gap-1">
                            {courseCategories.map((cat) => (
                              <button
                                key={cat.name}
                                onClick={() => {
                                  setIsCoursesHovered(false);
                                  if (cat.isAll) {
                                    navigate('/courses', { state: { category: 'All' } });
                                  } else {
                                    navigate('/courses', { state: { category: cat.name } });
                                  }
                                }}
                                className="flex flex-col items-start text-left px-4 py-2.5 rounded-xl hover:bg-[#41c8df]/25 hover:text-[#41c8df] transition-all duration-200 group"
                              >
                                <span className="font-bold text-sm tracking-wide text-secondary group-hover:text-[#41c8df]">
                                  {cat.name}
                                </span>
                                <span className="text-[11px] text-slate-500 dark:text-gray-400 font-medium group-hover:text-secondary mt-0.5">
                                  {cat.desc}
                                </span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              if (name === 'About Us') {
                return (
                  <div
                    key={name}
                    className="relative py-2"
                    onMouseEnter={() => setIsAboutHovered(true)}
                    onMouseLeave={() => setIsAboutHovered(false)}
                  >
                    <button
                      onClick={(e) => handleNavClick(href, e)}
                      className={`relative font-bold tracking-wide transition-all duration-300 px-6 py-2.5 rounded-full text-sm uppercase flex items-center gap-1.5
                        ${isActive
                          ? 'bg-[#41c8df] text-black shadow-sm'
                          : 'text-secondary/80 hover:text-[#41c8df] hover:bg-secondary/5'
                        }`}
                    >
                      {name}
                      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isAboutHovered ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isAboutHovered && (
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 15 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 rounded-2xl bg-background-100/95 backdrop-blur-xl border border-secondary/10 shadow-2xl p-2 z-50 text-secondary"
                        >
                          <div className="flex flex-col gap-1">
                            {aboutSubItems.map((sub) => (
                              <button
                                key={sub.name}
                                onClick={(e) => {
                                  setIsAboutHovered(false);
                                  handleNavClick(sub.href, e);
                                }}
                                className="flex flex-col items-start text-left px-4 py-2.5 rounded-xl hover:bg-[#41c8df]/25 hover:text-[#41c8df] transition-all duration-200 group"
                              >
                                <span className="font-bold text-sm tracking-wide text-secondary group-hover:text-[#41c8df]">
                                  {sub.name}
                                </span>
                                <span className="text-[11px] text-slate-500 dark:text-gray-400 font-medium group-hover:text-secondary mt-0.5">
                                  {sub.desc}
                                </span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              return (
                <a
                  key={name}
                  href={href}
                  onClick={(e) => handleNavClick(href, e)}
                  className={`relative font-bold tracking-wide transition-all duration-300 px-6 py-2.5 rounded-full text-sm uppercase
                    ${isActive
                      ? 'bg-[#41c8df] text-black shadow-sm'
                      : 'text-secondary hover:text-[#41c8df] hover:bg-secondary/5'
                    }`}
                >
                  {name}
                </a>
              );
            })}

          </nav>

          {/* Social Icons (Desktop) */}
          <div className="hidden lg:flex items-center space-x-4 ml-8 border-l border-secondary/20 pl-8">
            <a href="https://www.facebook.com/profile.php?id=61577768308585" target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-[#41c8df] transition-colors" aria-label="Facebook"><Facebook size={20} /></a>
            <a href="https://x.com/CynexAi?t=5k9RLyNOu_3lxItwPwoeNA&s=08" target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-[#41c8df] transition-colors" aria-label="Twitter"><Twitter size={20} /></a>
            <a href="https://www.instagram.com/cynexai.in?igsh=MWk5YWhlOHN5a2lqdw==" target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-[#41c8df] transition-colors" aria-label="Instagram"><Instagram size={20} /></a>
            <a href="https://www.linkedin.com/company/cynexai/posts/?feedView=all" target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-[#41c8df] transition-colors" aria-label="LinkedIn"><Linkedin size={20} /></a>
            <a href="https://www.youtube.com/@CynexAI" target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-[#41c8df] transition-colors" aria-label="YouTube"><Youtube size={20} /></a>
          </div>

          {/* Enroll Now Button (Desktop) */}
          <div className="hidden lg:flex items-center ml-6">
            <Link
              to="/courses"
              className="bg-[#41c8df] text-black hover:bg-[#0891b2] hover:text-white px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-md"
            >
              Enroll Now
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setIsOpen((o) => !o)}
            className="lg:hidden p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#41c8df] text-secondary hover:bg-secondary/5 transition-colors"
            aria-label="Toggle navigation"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="lg:hidden overflow-hidden bg-background-100/95 backdrop-blur-xl rounded-lg mt-2 shadow-2xl border border-secondary/10"
            >
              <div className="px-4 py-4 space-y-3">
                {navItems.map(({ name, href }) => {
                  const isActive =
                    href === '/'
                      ? location.pathname === '/' && location.hash === ''
                      : href.startsWith('#')
                        ? location.pathname === '/' && location.hash === href
                        : location.pathname === href;

                  if (name === 'Courses') {
                    return (
                      <div key={name} className="flex flex-col">
                        <button
                          onClick={() => setMobileCoursesOpen(!mobileCoursesOpen)}
                          className="flex items-center justify-between w-full py-3 px-6 rounded-xl text-lg font-bold transition-all duration-300 text-secondary hover:bg-secondary/5"
                        >
                          <span>{name}</span>
                          <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${mobileCoursesOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {mobileCoursesOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="pl-6 space-y-1 overflow-hidden"
                            >
                              {courseCategories.map((cat) => (
                                <button
                                  key={cat.name}
                                  onClick={() => {
                                    setIsOpen(false);
                                    setMobileCoursesOpen(false);
                                    if (cat.isAll) {
                                      navigate('/courses', { state: { category: 'All' } });
                                    } else {
                                      navigate('/courses', { state: { category: cat.name } });
                                    }
                                  }}
                                  className="block w-full text-left py-2.5 px-4 rounded-lg text-sm font-bold text-secondary/80 hover:bg-secondary/5 hover:text-[#41c8df] transition-colors"
                                >
                                  {cat.name}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  if (name === 'About Us') {
                    return (
                      <div key={name} className="flex flex-col">
                        <button
                          onClick={() => setMobileAboutOpen(!mobileAboutOpen)}
                          className="flex items-center justify-between w-full py-3 px-6 rounded-xl text-lg font-bold transition-all duration-300 text-secondary hover:bg-secondary/5"
                        >
                          <span>{name}</span>
                          <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${mobileAboutOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {mobileAboutOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="pl-6 space-y-1 overflow-hidden"
                            >
                              {aboutSubItems.map((sub) => (
                                <button
                                  key={sub.name}
                                  onClick={(e) => {
                                    setIsOpen(false);
                                    setMobileAboutOpen(false);
                                    handleNavClick(sub.href, e);
                                  }}
                                  className="block w-full text-left py-2.5 px-4 rounded-lg text-sm font-bold text-secondary/80 hover:bg-secondary/5 hover:text-[#41c8df] transition-colors"
                                >
                                  {sub.name}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  return (
                    <a
                      key={name}
                      href={href}
                      onClick={(e) => handleNavClick(href, e)}
                      className={`block py-3 px-6 rounded-xl text-lg font-bold transition-all duration-300
                        ${isActive
                          ? 'bg-[#41c8df] text-black shadow-sm'
                          : 'text-secondary hover:bg-secondary/5'
                        }`}
                    >
                      {name}
                    </a>
                  );
                })}


                {/* Mobile Enroll Button */}
                <div className="pt-4 px-2">
                  <Link
                    to="/courses"
                    onClick={() => setIsOpen(false)}
                    className="w-full bg-[#41c8df] text-black hover:bg-[#0891b2] hover:text-white py-3.5 rounded-xl font-bold text-center block transition-all duration-300 shadow-md uppercase tracking-wider text-sm"
                  >
                    Enroll Now
                  </Link>
                </div>

                {/* Mobile Social Icons */}
                <div className="flex items-center justify-center space-x-6 pt-6 pb-2 border-t border-secondary/10">
                  <a href="https://www.facebook.com/profile.php?id=61577768308585" target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-[#41c8df] transition-colors" aria-label="Facebook"><Facebook size={24} /></a>
                  <a href="https://x.com/CynexAi?t=5k9RLyNOu_3lxItwPwoeNA&s=08" target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-[#41c8df] transition-colors" aria-label="Twitter"><Twitter size={24} /></a>
                  <a href="https://www.instagram.com/cynexai.in?igsh=MWk5YWhlOHN5a2lqdw==" target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-[#41c8df] transition-colors" aria-label="Instagram"><Instagram size={24} /></a>
                  <a href="https://www.linkedin.com/company/cynexai/posts/?feedView=all" target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-[#41c8df] transition-colors" aria-label="LinkedIn"><Linkedin size={24} /></a>
                  <a href="https://www.youtube.com/@CynexAI" target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-[#41c8df] transition-colors" aria-label="YouTube"><Youtube size={24} /></a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
