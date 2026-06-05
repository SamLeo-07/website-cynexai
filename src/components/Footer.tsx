import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Mail,
  Phone,
  MapPin,
  ArrowUp
} from 'lucide-react';

// Custom X (Twitter) Icon
const XIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const Footer = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (href: string, e: React.MouseEvent) => {
    if (href.includes('#')) {
      e.preventDefault();
      const [path, hash] = href.split('#');
      const targetPath = path === '' ? '/' : path;
      const targetId = hash;

      if (location.pathname === targetPath) {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        navigate(targetPath, { state: { scrollToId: targetId } });
      }
    } else if (href === '/') {
      if (location.pathname === '/') {
        e.preventDefault();
        scrollToTop();
      }
    }
  };

  const footerLinks = {
    courses: [
      { name: 'Data Science & Machine Learning', href: '/course/data-science-machine-learning' }, // Corrected ID
      { name: 'Artificial Intelligence & Generative AI', href: '/course/artificial-intelligence-generative-ai' }, // Corrected ID
      { name: 'Full Stack Java Development', href: '/course/full-stack-java-development' }, // Corrected ID
      { name: 'DevOps & Cloud Technologies', href: '/course/devops-cloud-technologies' }, // Corrected ID
      { name: 'Python Programming', href: '/course/python-programming' }, // Corrected ID
      { name: 'Software Testing (Manual + Automation)', href: '/course/software-testing-manual-automation' }, // Corrected ID
      { name: 'SAP (Data Processing)', href: '/course/sap-data-processing' }, // Corrected ID
    ],
    company: [
      { name: 'About Us', href: '/about' },
      { name: 'Contact', href: '/#contact' },
      { name: 'Blog', href: '/blog' },
    ],
  };

  const socialLinks = [
    { icon: Facebook, href: 'https://www.facebook.com/profile.php?id=61577768308585', hoverColor: 'hover:text-[#1877F2]' },
    { icon: XIcon, href: 'https://x.com/CynexAi?t=5k9RLyNOu_3lxItwPwoeNA&s=08', hoverColor: 'hover:text-[#41c8df]' },
    { icon: Instagram, href: 'https://www.instagram.com/cynexai.in?igsh=MWk5YWhlOHN5a2lqdw==', hoverColor: 'hover:text-[#41c8df]' },
    { icon: Linkedin, href: 'https://www.linkedin.com/company/cynexai/posts/?feedView=all', hoverColor: 'hover:text-[#41c8df]' },
    { icon: Youtube, href: 'https://www.youtube.com/@CynexAI', hoverColor: 'hover:text-[#41c8df]' },
  ];

  return (
    <footer className="relative bg-white border-t border-slate-200 text-slate-800 overflow-hidden shadow-[0_-10px_30px_rgba(0,0,0,0.03)] transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Main Footer Content */}
        <div className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="lg:col-span-2">
              <Link
                to="/"
                onClick={(e) => handleNavClick('/', e)}
                className="flex items-center space-x-3 mb-6 group transition-all duration-300 hover:scale-105 active:scale-95"
              >
                <div className="relative inline-block">
                  <img
                    src="/CynexAI Logo new (1).png"
                    alt="CynexAI"
                    className="h-10 w-auto object-contain"
                  />
                </div>
              </Link>

              <p className="text-slate-600 mb-6 leading-relaxed text-sm">
                Transforming careers through cutting-edge technology education.
                Join thousands of students who have successfully transitioned into
                high-paying tech roles with our industry-aligned programs.
              </p>

              {/* Social Media Icons (Moved Here) */}
              <div className="flex items-center space-x-4 mb-6"> {/* Added mb-6 for spacing below icons */}
                {socialLinks.map((social, index) => {
                  const IconComponent = social.icon;
                  const isLinkedin = IconComponent === Linkedin;
                  const isFacebook = IconComponent === Facebook;
                  return (
                    <motion.a
                      key={index}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.2, y: -2 }}
                      className={`transition-colors duration-200 ${isLinkedin
                        ? 'text-[#0077b5] hover:text-[#00a0dc]'
                        : isFacebook
                          ? 'text-[#1877F2] hover:text-[#3b5998]'
                          : `text-slate-400 hover:text-[#0891b2]`
                        }`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </motion.a>
                  );
                })}
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-slate-600 text-sm">
                  <Phone className="w-4 h-4 mr-3 text-[#0891b2]" />
                  <span>+91 9966639869</span>
                </div>
                <div className="flex items-center text-slate-600 text-sm">
                  <Mail className="w-4 h-4 mr-3 text-[#0891b2]" />
                  <span>contact@Cynexai.in</span>
                </div>
                <a
                  href="https://maps.app.goo.gl/cMq38RHfxHpgEDKn9"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start text-slate-600 hover:text-[#0891b2] transition-colors text-sm"
                >
                  <MapPin className="w-4 h-4 mr-3 mt-1 text-[#0891b2] flex-shrink-0" />
                  <span>
                    MIG-215, Rd Number 1, KPHB Phase I,
                    Kukatpally, Hyderabad, Telangana 500072
                  </span>
                </a>
              </div>
            </div>

            {/* Courses */}
            <div>
              <h3 className="text-slate-900 font-semibold mb-6 text-base">Popular Courses</h3>
              <ul className="space-y-3">
                {footerLinks.courses.map((link, index) => (
                  <li key={index}>
                    <Link
                      to={link.href}
                      className="text-slate-600 hover:text-[#0891b2] transition-colors duration-200 text-sm font-medium"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-slate-900 font-semibold mb-6 text-base">Company</h3>
              <ul className="space-y-3">
                {footerLinks.company.map((link, index) => (
                  <li key={index}>
                    <Link
                      to={link.href}
                      onClick={(e) => handleNavClick(link.href, e)}
                      className="text-slate-600 hover:text-[#0891b2] transition-colors duration-200 text-sm font-medium"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* Newsletter Section */}
        <div className="py-8 border-t border-slate-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-slate-900 font-semibold mb-2 text-base">Stay Updated</h3>
              <p className="text-slate-600 text-sm">
                Get the latest updates on new courses and tech trends
              </p>
            </div>
            <div className="flex w-full md:w-auto flex-nowrap">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 min-w-0 px-4 py-3 bg-slate-50 border border-slate-200 rounded-l-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0891b2] focus:ring-2 focus:ring-[#0891b2]/20 transition-all text-sm"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-[#41c8df] text-black hover:bg-[#0891b2] hover:text-white rounded-r-lg font-medium transition-all duration-300 flex-shrink-0 text-sm"
              >
                Subscribe
              </motion.button>
            </div>
          </div>
        </div>

        {/* Bottom Footer (Social icons removed from here) */}
        <div className="py-6 border-t border-slate-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-slate-500 text-sm text-center md:text-left flex flex-col sm:flex-row items-center gap-2 sm:gap-0 justify-center md:justify-start">
              <span>© 2025 CynexAI. All rights reserved.</span>
              <span className="hidden sm:inline mx-2">|</span>
              <Link to="/privacy" className="text-slate-500 hover:text-[#0891b2] hover:underline transition-colors duration-200">Privacy Policy</Link>
              <span className="mx-2">|</span>
              <Link to="/terms" className="text-slate-500 hover:text-[#0891b2] hover:underline transition-colors duration-200">Terms of Service</Link>
            </div>
            {/* Social media icons are no longer rendered here */}
          </div>
        </div>
      </div>

      {/* Scroll to Top Button */}
      <motion.button
        onClick={scrollToTop}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-4 right-4 z-50 bg-[#41c8df] text-black p-3 rounded-full shadow-lg hover:bg-[#0891b2] hover:text-white transition-colors duration-300"
      >
        <ArrowUp className="w-5 h-5" />
      </motion.button>
    </footer>
  );
};

export default Footer;
