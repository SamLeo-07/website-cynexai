import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Linkedin } from 'lucide-react';
import TiltCard from './TiltCard';

// ====================================================================
// Dummy data for team members. The list is duplicated for the seamless loop effect.
// ====================================================================
const teamMembers = [
  {
    name: 'Siva Sai Datta',
    role: 'Vice President',
    bio: 'Siva Sai Datta drives operational excellence and growth as Vice President. With extensive experience in market expansion and strategic partnerships, he is instrumental in scaling CynexAI\'s reach and impact.',
    image: 'https://placehold.co/400x400/1C1C1C/white?text=Siva',
    socials: {
      linkedin: 'http://linkedin.com/in/ss-datta'
    }
  },
  {
    name: 'Durga Hari',
    role: 'General Manager',
    bio: 'Durga Hari is the driving force behind day-to-day operations. As General Manager, she ensures that all departments work seamlessly to deliver high-quality services and exceptional student experiences.',
    image: 'https://placehold.co/400x400/1C1C1C/white?text=Durga',
    socials: {
      linkedin: 'https://www.linkedin.com/company/cynexai/posts/?feedView=all'
    }
  },
  {
    name: 'Sandeep Kumar',
    role: 'HR Manager',
    bio: 'Sandeep manages all human resources functions at CynexAI. His focus is on building a supportive and dynamic workplace culture, attracting top talent, and fostering professional growth for the team.',
    image: 'https://placehold.co/400x400/1C1C1C/white?text=Sandeep',
    socials: {
      linkedin: 'https://www.linkedin.com/in/sandeep-yellanki-8b80142b6'
    }
  },
  {
    name: 'Sailaja',
    role: 'HR Recruiter',
    bio: 'Saileja is on the front lines of talent acquisition. As an HR Recruiter, she identifies and attracts brilliant minds to join the CynexAI team, playing a key role in building our innovative community.',
    image: 'https://placehold.co/400x400/1C1C1C/white?text=Saileja',
    socials: {
      linkedin: 'https://www.linkedin.com/in/sailaja-gampala-17408a345?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app'
    }
  }
];

// ====================================================================
// The main OurTeam component with rotative auto-scrolling logic and hidden scrollbar
// ====================================================================
const OurTeam = () => {
  // Hook to trigger animations when the component comes into view
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.2 });

  // Ref to the scrollable container element
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Ref to hold the interval ID for cleanup
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0 },
  };

  const startAutoScroll = () => {
    // Clear any existing interval to prevent duplicates
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const scrollWidth = container.scrollWidth;
        const currentScrollLeft = container.scrollLeft;

        // Calculate the width of one card plus the gap (space-x-8 is 2rem = 32px)
        const cardWidth = (container.children[0] as HTMLElement)?.offsetWidth + 32 || 352;

        // If we are at or past the end of the first set of cards,
        // instantly jump back to the beginning to create a seamless loop.
        // We do this by checking if the current scroll position is greater than
        // or equal to half the total scrollable width (the width of one full set of cards).
        if (currentScrollLeft >= scrollWidth / 2) {
          container.scrollLeft = 0;
        }

        // Now, perform the next smooth scroll
        const nextScrollPosition = container.scrollLeft + cardWidth;
        container.scrollTo({
          left: nextScrollPosition,
          behavior: 'smooth'
        });
      }
    }, 3000); // Scroll every 3 seconds
  };

  const stopAutoScroll = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  useEffect(() => {
    // Start the auto-scroll when the component is in view
    if (inView) {
      startAutoScroll();
    }

    // Cleanup function to clear the interval when the component unmounts or is not in view
    return () => stopAutoScroll();
  }, [inView]);

  return (
    <section
      ref={ref}
      className="bg-transparent text-secondary py-20 px-4 sm:px-6 lg:px-8 font-inter relative z-10"
    // Removed onMouseEnter/onMouseLeave from the section
    >
      {/* This style block is added to hide the scrollbar.
        - For Webkit browsers (Chrome, Safari, etc.)
        - For Firefox
        - For IE and Edge
      */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div className="container mx-auto">
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={containerVariants}
        >
          {/* Section Header */}
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-secondary">
              Meet Our <span className="text-[#41c8df]">Team</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Our team of expert instructors and mentors is dedicated to your success. Learn from the best in the industry.
            </p>
          </motion.div>

          {/* Single horizontal scroll section for all team members with hidden scrollbar */}
          <div ref={scrollContainerRef} className="flex overflow-x-auto space-x-8 pb-4 hide-scrollbar">
            {/* Render the team members twice to create the infinite loop effect */}
            {teamMembers.concat(teamMembers).map((member, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="flex-shrink-0 w-80"
                onMouseEnter={stopAutoScroll}
                onMouseLeave={startAutoScroll}
              >
                <TiltCard scale={1.05} tiltMaxAngleX={15} tiltMaxAngleY={15} className="w-full h-full cursor-grab active:cursor-grabbing group/teamcard">
                  <div className="bg-background/40 backdrop-blur-xl border border-secondary/10 rounded-2xl p-6 text-center shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all duration-500 group-hover/teamcard:border-[#41c8df]/50 group-hover/teamcard:shadow-[0_15px_40px_rgba(65,200,223,0.3)] transform-style-3d">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-32 h-32 rounded-full mx-auto mb-4 object-cover border-4 border-[#41c8df] transform transition-transform duration-500 group-hover/teamcard:translate-z-[60px]"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = 'https://placehold.co/400x400/1C1C1C/white?text=User';
                      }}
                    />
                    <h3 className="text-xl font-semibold mb-1 text-secondary transform transition-transform duration-500 group-hover/teamcard:translate-z-[40px] group-hover/teamcard:text-[#41c8df]">
                      {member.name}
                    </h3>
                    <p className="text-[#41c8df] font-medium mb-4 transform transition-transform duration-500 group-hover/teamcard:translate-z-[30px]">
                      {member.role}
                    </p>
                    <p className="text-gray-400 text-sm mb-6 transform transition-transform duration-500 group-hover/teamcard:translate-z-[20px]">
                      {member.bio}
                    </p>
                    <div className="flex justify-center space-x-4 transform transition-transform duration-500 group-hover/teamcard:translate-z-[40px]">
                      {member.socials.linkedin && (
                        <a
                          href={member.socials.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-[#41c8df] transition-colors duration-300 transform hover:scale-125 inline-block"
                          aria-label={`LinkedIn profile of ${member.name}`}
                        >
                          <Linkedin className="w-6 h-6" />
                        </a>
                      )}
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default OurTeam;
