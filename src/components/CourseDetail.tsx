import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, easeOut, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { getCourses } from '../lib/turso';
import {
  ArrowLeft,
  Clock,
  Briefcase, // Used for Placement
  Star,
  CheckCircle, // Used for Outcomes/Prerequisites list items
  Play, // Used for Watch Preview button
  Download, // Used for Download Brochure button
  Award, // Used for Skills You'll Gain heading
  BookOpen, // Used for Course Modules list items
  Target, // Used for Learning Outcomes heading
  X
} from 'lucide-react';

// ====================================================================
// This `courseData` object must be OUTSIDE the functional component.
// Its IDs (keys) must match the `id`s used in Courses.tsx.
// ====================================================================
// eslint-disable-next-line react-refresh/only-export-components
export const courseData = {
  'data-science-machine-learning': {
    title: 'Data Science & Machine Learning',
    subtitle: 'Unlock Insights from Data & Build Predictive Models',
    description: 'Master data analysis, machine learning algorithms, and AI implementation with our comprehensive Data Science course in Hyderabad. This program is designed for aspiring data scientists looking for the best AI training institute in KPHB.',
    image: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=1200',
    duration: '6 months',
    placement: '95%',
    rating: 4.9,
    level: 'Intermediate',
    modules: [
      'Python Programming Fundamentals',
      'Statistics and Probability for Data Science',
      'Data Manipulation with Pandas & NumPy',
      'Data Visualization with Matplotlib, Seaborn & Plotly',
      'Supervised Machine Learning Algorithms',
      'Unsupervised Learning and Clustering',
      'Deep Learning with TensorFlow & Keras',
      'Natural Language Processing (NLP) Basics',
      'Model Evaluation, Optimization & Deployment',
      'Capstone Project: Real-world Data Science Application'
    ],
    skills: ['Python', 'TensorFlow', 'Pandas', 'Scikit-learn', 'NumPy', 'Matplotlib', 'Jupyter', 'SQL', 'Git'],
    outcomes: [
      'Build end-to-end machine learning pipelines',
      'Implement deep learning models for various applications',
      'Create interactive data visualizations and dashboards',
      'Deploy ML models to production environments',
      'Apply AI solutions to complex business problems',
      'Interpret and communicate data-driven insights effectively'
    ],
    prerequisites: [
      'Basic programming knowledge (Python preferred)',
      'High school level mathematics (algebra, basic calculus)',
      'Familiarity with basic statistics concepts'
    ],
    career: [
      'Data Scientist',
      'Machine Learning Engineer',
      'AI/ML Engineer',
      'Data Analyst',
      'Business Intelligence Developer'
    ]
  },
  'artificial-intelligence-generative-ai': {
    title: 'Artificial Intelligence & Generative AI',
    subtitle: 'Innovate with AI-Powered Content and Intelligent Systems',
    description: 'Deep dive into advanced AI concepts with our Generative AI course in India. This online and classroom training in Hyderabad covers neural networks and cutting-edge generative models to build intelligent systems.',
    image: 'https://images.pexels.com/photos/8386434/pexels-photo-8386434.jpeg?auto=compress&cs=tinysrgb&w=1200',
    duration: '6 months',
    placement: '98%',
    rating: 4.8,
    level: 'Advanced',
    modules: [
      'Introduction to AI & Deep Learning',
      'Advanced Neural Network Architectures',
      'Generative Adversarial Networks (GANs)',
      'Variational Autoencoders (VAEs)',
      'Diffusion Models for Image & Video Generation',
      'Large Language Models (LLMs) & Transformers',
      'Prompt Engineering & Fine-tuning LLMs',
      'Ethical AI & Bias in Generative Models',
      'Deployment of Generative AI Solutions',
      'Final Project: Building a Generative AI Application'
    ],
    skills: ['Python', 'PyTorch', 'TensorFlow', 'Keras', 'Hugging Face', 'GANs', 'VAEs', 'Diffusion Models', 'NLP'],
    outcomes: [
      'Design and implement state-of-the-art AI systems',
      'Generate high-quality images, text, and other creative content',
      'Master prompt engineering for optimal AI performance',
      'Understand and mitigate ethical biases in AI models',
      'Deploy advanced AI models to production environments',
      'Contribute to innovative AI research and development'
    ],
    prerequisites: [
      'Strong Python programming skills',
      'Familiarity with basic machine learning concepts',
      'Understanding of linear algebra and calculus'
    ],
    career: [
      'AI Engineer',
      'Generative AI Specialist',
      'Machine Learning Researcher',
      'Prompt Engineer',
      'Computer Vision Engineer (Generative)'
    ]
  },
  'full-stack-java-development': {
    title: 'Full Stack Java Development',
    subtitle: 'Become a Versatile Java Developer for Web & Enterprise',
    description: 'Enroll in our Full Stack Developer course in India to build robust web applications from frontend to backend. This program in Hyderabad covers Java, Spring Boot, and modern frontend technologies to make you a job-ready developer.',
    image: '/java.png',
    duration: '6 months',
    placement: '92%',
    rating: 4.7,
    level: 'Intermediate',
    modules: [
      'Java Core & OOP',
      'Data Structures & Algorithms in Java',
      'SQL & Database Management (MySQL/PostgreSQL)',
      'Spring Framework (Core, MVC, Security)',
      'Spring Boot & Microservices',
      'RESTful API Development',
      'Frontend Development (HTML, CSS, JavaScript, React/Angular)',
      'Version Control with Git',
      'Deployment to Cloud (e.g., AWS EC2/Elastic Beanstalk)',
      'Full Stack Capstone Project'
    ],
    skills: ['Java', 'Spring Boot', 'Spring MVC', 'Hibernate', 'SQL', 'React/Angular', 'JavaScript', 'REST APIs', 'Git', 'Maven/Gradle'],
    outcomes: [
      'Develop scalable backend services with Spring Boot',
      'Build dynamic and responsive frontend user interfaces',
      'Design and manage relational databases',
      'Implement secure and robust authentication/authorization',
      'Deploy full-stack applications to cloud platforms',
      'Work effectively in Agile development environments'
    ],
    prerequisites: [
      'Basic programming knowledge (any language)',
      'Understanding of web concepts (HTTP, client-server)',
      'Eagerness to learn both frontend and backend'
    ],
    career: [
      'Full Stack Java Developer',
      'Backend Java Developer',
      'Software Engineer (Java)',
      'Spring Boot Developer',
      'Enterprise Application Developer'
    ]
  },
  'devops-cloud-technologies': {
    title: 'DevOps & Cloud Technologies',
    subtitle: 'Streamline Software Delivery with Cloud & Automation',
    description: 'Our DevOps & Cloud training helps you master cloud infrastructure, CI/CD pipelines, and deployment strategies. Learn how to become a DevOps engineer with hands-on training on AWS, Azure, and other cloud computing certification tools in Hyderabad.',
    image: 'https://images.pexels.com/photos/8386422/pexels-photo-8386422.jpeg?auto=compress&cs=tinysrgb&w=1200',
    duration: '6 months',
    placement: '96%',
    rating: 4.8,
    level: 'Intermediate',
    modules: [
      'Linux Fundamentals & Shell Scripting',
      'Introduction to Cloud Computing (AWS Focus)',
      'Infrastructure as Code (IaC) with Terraform',
      'Containerization with Docker',
      'Container Orchestration with Kubernetes',
      'CI/CD Pipelines with Jenkins/GitLab CI/GitHub Actions',
      'Monitoring and Logging (Prometheus, Grafana, ELK Stack)',
      'Networking in Cloud',
      'Security in DevOps',
      'Project: Deploying a Scalable Application'
    ],
    skills: ['AWS', 'Azure/GCP', 'Docker', 'Kubernetes', 'Jenkins', 'Terraform', 'Ansible', 'Git', 'Linux', 'Shell Scripting'],
    outcomes: [
      'Automate software build, test, and deployment processes',
      'Manage and scale cloud infrastructure efficiently',
      'Implement robust CI/CD pipelines',
      'Containerize and orchestrate applications',
      'Monitor and troubleshoot cloud-native applications',
      'Apply security best practices in a DevOps workflow'
    ],
    prerequisites: [
      'Basic understanding of IT operations',
      'Familiarity with command line interfaces',
      'Some programming experience is beneficial'
    ],
    career: [
      'DevOps Engineer',
      'Cloud Engineer',
      'Site Reliability Engineer (SRE)',
      'Cloud Architect',
      'Automation Engineer'
    ]
  },
  'python-programming': {
    title: 'Python Programming',
    subtitle: 'Master the Versatile Language for Data, Web & Automation',
    description: 'Master Python fundamentals with our dedicated Python for AI course. This program is perfect for beginners and professionals in Hyderabad looking to build a strong foundation for data analysis, web development, and automation.',
    image: 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=1200',
    duration: '6 months',
    placement: '90%',
    rating: 4.7,
    level: 'Beginner',
    modules: [
      'Python Basics & Syntax',
      'Data Types & Data Structures',
      'Control Flow & Functions',
      'Object-Oriented Programming (OOP) in Python',
      'File Handling & Error Handling',
      'Modules, Packages & Pip',
      'Introduction to Web Development with Flask/Django',
      'Data Manipulation with Pandas (Intro)',
      'Automation & Scripting',
      'Final Mini-Projects'
    ],
    skills: ['Python', 'OOP', 'Data Structures', 'Flask/Django (basics)', 'Pandas (basics)', 'API usage', 'Git'],
    outcomes: [
      'Write clean, efficient, and well-structured Python code',
      'Automate repetitive tasks with Python scripts',
      'Develop basic web applications',
      'Perform data manipulation and analysis',
      'Solve algorithmic problems using Python',
      'Build a strong foundation for advanced Python careers'
    ],
    prerequisites: [
      'No prior programming experience required',
      'Basic computer literacy'
    ],
    career: [
      'Python Developer',
      'Automation Engineer',
      'Junior Data Analyst',
      'Web Developer (Python)',
      'Software Engineer (Entry-Level)'
    ]
  },
  'software-testing-manual-automation': {
    title: 'Software Testing (Manual + Automation)',
    subtitle: 'Ensure Quality & Reliability in Software Products',
    description: 'Master software testing with our comprehensive course covering manual and automation frameworks. This training in KPHB, Hyderabad, prepares you for a successful career in quality assurance with hands-on experience.',
    image: 'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=1200',
    duration: '6 months',
    placement: '91%',
    rating: 4.5,
    level: 'Intermediate',
    modules: [
      'Software Development Life Cycle (SDLC) & STLC',
      'Manual Testing Fundamentals (Types, Techniques)',
      'Test Case Design & Execution',
      'Defect Reporting & Management (Jira)',
      'Agile Testing Principles',
      'Introduction to Automation Testing',
      'Selenium WebDriver with Java/Python',
      'TestNG/Pytest Frameworks',
      'API Testing with Postman/Rest Assured',
      'Performance Testing Basics (JMeter)'
    ],
    skills: ['Manual Testing', 'Test Case Design', 'Selenium', 'Jira', 'Agile', 'API Testing', 'Java/Python (for automation)', 'SQL'],
    outcomes: [
      'Design comprehensive test plans and strategies',
      'Execute manual tests and report defects effectively',
      'Automate web and API test cases using industry tools',
      'Participate in Agile development cycles as a QA',
      'Ensure high-quality software releases',
      'Understand different types of software testing'
    ],
    prerequisites: [
      'Basic computer knowledge and analytical skills',
      'Familiarity with web applications is a plus',
      'No prior coding experience required for manual section'
    ],
    career: [
      'QA Engineer',
      'Manual Tester',
      'Automation Test Engineer',
      'Software Test Lead',
      'Performance Tester'
    ]
  },
  'sap-data-processing': {
    title: 'SAP (Systems, Applications, and Products in Data Processing)',
    subtitle: 'Master Enterprise Resource Planning with SAP Solutions',
    description: 'Learn enterprise resource planning with our expert-led SAP training in Hyderabad. This course covers key SAP modules, business process optimization, and implementation strategies for various industries.',
    image: 'https://images.pexels.com/photos/1181316/pexels-photo-1181316.jpeg?auto=compress&cs=tinysrgb&w=1200',
    duration: '6 months',
    placement: '94%',
    rating: 4.6,
    level: 'Professional',
    modules: [
      'Introduction to SAP & ERP Concepts',
      'SAP ABAP Programming (Fundamentals)',
      'SAP Financial Accounting (FI)',
      'SAP Controlling (CO)',
      'SAP Materials Management (MM)',
      'SAP Sales and Distribution (SD)',
      'SAP HANA Overview',
      'SAP Fiori & UI5 Basics',
      'SAP Implementation Methodologies (ASAP/Activate)',
      'Case Study & Project'
    ],
    skills: ['SAP HANA', 'ABAP', 'Fiori', 'S/4HANA', 'ERP Concepts', 'SAP Modules (FI, CO, MM, SD)', 'Business Process Optimization'],
    outcomes: [
      'Navigate and operate within the SAP system',
      'Understand key SAP modules and their integration',
      'Develop custom reports and programs using ABAP',
      'Participate in SAP implementation and support projects',
      'Optimize business processes using SAP functionalities',
      'Gain expertise in a high-demand enterprise technology'
    ],
    prerequisites: [
      'Basic understanding of business processes',
      'Familiarity with IT systems is beneficial',
      'No prior SAP experience required'
    ],
    career: [
      'SAP Consultant (Functional/Technical)',
      'SAP Analyst',
      'ERP Specialist',
      'SAP Business Process Analyst',
      'SAP Basis Administrator (Entry-Level)'
    ]
  },
};
// ====================================================================

const CourseDetail = () => {
  const { courseId } = useParams();
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });


  // The static data is the default; DB data overrides specific fields
  type CourseDetailType = typeof courseData[keyof typeof courseData] & {
    subtitle?: string; placement?: string; id?: string; curriculum?: any;
  };
  const staticCourse = courseData[courseId as keyof typeof courseData];
  const [course, setCourse] = useState<CourseDetailType | null>(staticCourse ?? null);
  const [isDbLoading, setIsDbLoading] = useState(true);

  // Fetch DB override on mount
  useEffect(() => {
    if (!courseId) {
      setIsDbLoading(false);
      return;
    }
    const fetchDbCourse = async () => {
      try {
        const all = await getCourses(false);
        const dbCourse = all.find(c => c.id === courseId);
        if (!dbCourse) {
          setIsDbLoading(false);
          return;
        }

        const safeArr = (v?: string, fallback: string[] = []): string[] => {
          if (!v) return fallback;
          try { return JSON.parse(v); } catch { return fallback; }
        };
        const safeCurriculum = (v?: string): any => {
          if (!v) return null;
          try { return JSON.parse(v); } catch { return null; }
        };

        setCourse(prev => {
          if (!prev) {
            return {
              id: dbCourse.id,
              title: dbCourse.title,
              subtitle: dbCourse.subtitle || '',
              description: dbCourse.description,
              image: dbCourse.image,
              duration: dbCourse.duration,
              placement: dbCourse.placement || '',
              rating: dbCourse.rating,
              level: dbCourse.level,
              skills: safeArr(dbCourse.skills),
              modules: safeArr(dbCourse.modules),
              outcomes: safeArr(dbCourse.outcomes),
              prerequisites: safeArr(dbCourse.prerequisites),
              career: safeArr(dbCourse.career),
              curriculum: safeCurriculum(dbCourse.curriculum),
            };
          }
          return {
            ...prev,
            title: dbCourse.title || prev.title,
            subtitle: dbCourse.subtitle || prev.subtitle,
            description: dbCourse.description || prev.description,
            image: dbCourse.image || prev.image,
            duration: dbCourse.duration || prev.duration,
            placement: dbCourse.placement || prev.placement,
            rating: dbCourse.rating ?? prev.rating,
            level: dbCourse.level || prev.level,
            skills: safeArr(dbCourse.skills, prev.skills),
            modules: safeArr(dbCourse.modules, prev.modules),
            outcomes: safeArr(dbCourse.outcomes, prev.outcomes),
            prerequisites: safeArr(dbCourse.prerequisites, prev.prerequisites),
            career: safeArr(dbCourse.career, prev.career),
            curriculum: safeCurriculum(dbCourse.curriculum) || prev.curriculum,
          };
        });
      } catch (e) {
        console.warn('CourseDetail: Could not fetch DB override, using static data.', e);
      } finally {
        setIsDbLoading(false);
      }
    };
    fetchDbCourse();
  }, [courseId]);



  if (isDbLoading) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center py-20 px-4 sm:px-6 lg:px-8 text-secondary">
        <div className="w-12 h-12 border-4 border-[#41c8df] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center py-20 px-4 sm:px-6 lg:px-8 text-secondary">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="text-4xl font-display font-bold text-[#41c8df] mb-4">Course Not Found</h2>
          <p className="text-lg text-gray-300">The course you are looking for does not exist or has been removed.</p>
          <Link to="/" className="mt-8 inline-block bg-[#41c8df] text-black py-3 px-6 rounded-lg font-medium hover:bg-secondary transition-colors duration-300">
            Go Back Home
          </Link>
        </motion.div>
      </div>
    );
  }

  // Define variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: easeOut, // Use the imported easeOut variable
      },
    },
  };

  return (
    <div className="min-h-screen pt-20 bg-transparent text-secondary"> {/* Overall background and default text color */}
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={course.image}
            alt={course.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-background/80"></div> {/* Solid black overlay */}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            ref={ref} // Assign ref here to enable inView animation for the whole content
            variants={containerVariants}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
          >
            <motion.div variants={itemVariants} className="mb-6">
              <Link
                to="/"
                className="inline-flex items-center text-[#41c8df] hover:text-secondary transition-colors" // Gold link
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Courses
              </Link>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <motion.div variants={itemVariants} className="mb-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border
                    ${course.level === 'Beginner' ? 'bg-[#41c8df]/20 text-[#41c8df] border-[#41c8df]/30' : // Gold for Beginner
                      course.level === 'Intermediate' ? 'bg-[#41c8df]/20 text-[#41c8df] border-[#41c8df]/30' : // Gold for Intermediate
                        course.level === 'Advanced' ? 'bg-[#41c8df]/20 text-[#41c8df] border-[#41c8df]/30' : // Gold for Advanced
                          'bg-[#41c8df]/20 text-[#41c8df] border-[#41c8df]/30' // Default to gold
                    }`}>
                    {course.level}
                  </span>
                </motion.div>

                <motion.h1
                  variants={itemVariants}
                  className="text-4xl md:text-5xl font-display font-bold text-secondary mb-4" // Main title remains white for contrast
                >
                  {course.title}
                </motion.h1>

                <motion.p
                  variants={itemVariants}
                  className="text-slate-600 mb-6 font-medium"
                >
                  {course.subtitle}
                </motion.p>

                <motion.p
                  variants={itemVariants}
                  className="text-slate-700 mb-8 leading-relaxed font-medium"
                >
                  {course.description}
                </motion.p>

                <motion.div
                  variants={itemVariants}
                  className="flex flex-wrap items-center gap-6 mb-8 font-medium"
                >
                  <div className="flex items-center text-slate-700">
                    <Clock className="w-5 h-5 mr-2 text-[#0891b2]" />
                    {course.duration}
                  </div>
                  <div className="flex items-center text-slate-700">
                    <Briefcase className="w-5 h-5 mr-2 text-[#0891b2]" />
                    Job/Internship Placement: {course.placement}
                  </div>
                  <div className="flex items-center text-slate-700">
                    <Star className="w-5 h-5 mr-2 text-amber-500 fill-amber-500" />
                    {course.rating} rating
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
                  <Link
                    to={`/apply/${courseId}`}
                    className="bg-[#41c8df] text-black hover:bg-secondary px-8 py-4 rounded-lg font-semibold text-center transition-all duration-300 shadow-[0_0_20px_rgba(65,200,223,0.3)] hover:shadow-[0_0_30px_rgba(65,200,223,0.5)]" // Gold background, black text
                  >
                    Enroll Now
                  </Link>
                  <button className="border border-[#41c8df]/50 text-[#41c8df] px-8 py-4 rounded-lg font-semibold hover:bg-secondary/5 transition-all duration-300 flex items-center justify-center"> {/* Gold border, gold text */}
                    <Play className="w-5 h-5 mr-2" />
                    Watch Preview
                  </button>
                </motion.div>
              </div>

              {/* Course Info Card */}
              <motion.div
                variants={itemVariants}
                className="bg-white/95 backdrop-blur-xl rounded-2xl p-8 border border-slate-200 shadow-xl"
              >
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-slate-900 mb-2">
                    Start Your Journey Today!
                  </div>
                  <div className="text-slate-600 text-lg">
                    Invest in your future with our industry-leading program.
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Duration</span>
                    <span className="text-slate-900 font-semibold">{course.duration}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Level</span>
                    <span className="text-slate-900 font-semibold">{course.level}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Job/Internship Placement</span>
                    <span className="text-slate-900 font-semibold">{course.placement}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Certificate</span>
                    <span className="text-slate-900 font-semibold">Yes</span>
                  </div>
                </div>

                <Link
                  to={`/apply/${courseId}`}
                  className="w-full bg-[#41c8df] text-black hover:bg-secondary py-4 px-6 rounded-lg font-semibold text-center block transition-all duration-300 shadow-[0_0_20px_rgba(65,200,223,0.3)] hover:shadow-[0_0_30px_rgba(65,200,223,0.5)]" // Gold background, black text
                >
                  Enroll Now
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* What You'll Learn Section */}
      <section className="py-20 bg-transparent"> {/* Section background changed to white */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
          >
            <motion.h2
              variants={itemVariants}
              className="text-3xl md:text-4xl font-display font-bold text-center mb-16 text-secondary" // Heading text to black
            >
              <span className="text-[#41c8df]"> {/* Highlighted text to gold */}
                What You'll Learn
              </span>
            </motion.h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Learning Outcomes */}
              <motion.div variants={itemVariants}>
                <h3 className="text-2xl font-semibold text-secondary mb-6 flex items-center"> {/* Heading text to black */}
                  <Target className="w-6 h-6 mr-3 text-[#41c8df]" /> {/* Gold icon */}
                  Learning Outcomes
                </h3>
                <div className="space-y-4">
                  {course.outcomes.map((outcome, index) => (
                    <div key={index} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-[#0891b2] mr-3 mt-1 flex-shrink-0" />
                      <span className="text-slate-700 font-medium">{outcome}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Skills You'll Gain */}
              <motion.div variants={itemVariants}>
                <h3 className="text-2xl font-semibold text-secondary mb-6 flex items-center"> {/* Heading text to black */}
                  <Award className="w-6 h-6 mr-3 text-[#41c8df]" /> {/* Gold icon */}
                  Skills You'll Gain
                </h3>
                <div className="flex flex-wrap gap-3">
                  {course.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-[#41c8df]/10 text-[#41c8df] rounded-lg border border-[#41c8df]/30 font-medium whitespace-nowrap" // Gold tint background, gold border, black text
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Course Modules */}
      <section className="py-20 bg-background/20 backdrop-blur-md border-y border-secondary/5 relative z-10"> {/* Changed background to a light gray */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
          >
            <motion.h2
              variants={itemVariants}
              className="text-3xl md:text-4xl font-display font-bold text-center mb-16 text-secondary" // Heading text to black
            >
              <span className="text-[#41c8df]"> {/* Highlighted text to gold */}
                Course Curriculum
              </span>
            </motion.h2>

            <motion.div variants={itemVariants} className="max-w-5xl mx-auto">
              {course.curriculum && course.curriculum.days?.length > 0 ? (
                <div className="space-y-12">
                  {/* Daily Schedule */}
                  <div>
                    <h3 className="text-2xl font-semibold text-secondary mb-6 flex items-center">
                      <Clock className="w-6 h-6 mr-3 text-[#41c8df]" /> Daily Breakdown
                    </h3>
                    <div className="space-y-4">
                      {course.curriculum.days.map((day: any, index: number) => (
                        <div key={index} className="bg-white/95 backdrop-blur-xl rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6">
                          <div className="flex flex-col items-center justify-center bg-[#41c8df]/10 p-4 rounded-lg md:w-32 shrink-0">
                            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Day</span>
                            <span className="text-4xl font-black text-[#41c8df]">{day.dayNumber}</span>
                          </div>
                          <div className="flex-1 space-y-3">
                            <h4 className="text-xl font-bold text-slate-900">{day.concept}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <span className="block text-xs font-bold text-slate-400 mb-1">MATERIAL</span>
                                <span className="text-sm text-slate-700 font-medium">{day.material || 'N/A'}</span>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <span className="block text-xs font-bold text-slate-400 mb-1">ASSIGNMENT</span>
                                <span className="text-sm text-slate-700 font-medium">{day.assignment || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Weekly Tests */}
                    {course.curriculum.weeklyTests?.length > 0 && (
                      <div className="bg-white/95 backdrop-blur-xl rounded-xl p-6 border border-slate-200 shadow-sm">
                        <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <Target className="w-5 h-5 text-[#41c8df]" /> Weekly Assessments
                        </h4>
                        <ul className="space-y-2">
                          {course.curriculum.weeklyTests.map((test: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                              <CheckCircle className="w-4 h-4 text-[#0891b2] mt-0.5" /> {test}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Pro Tips */}
                    {course.curriculum.tips?.length > 0 && (
                      <div className="bg-white/95 backdrop-blur-xl rounded-xl p-6 border border-slate-200 shadow-sm">
                        <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <Star className="w-5 h-5 text-amber-500" /> Pro Tips
                        </h4>
                        <ul className="space-y-2">
                          {course.curriculum.tips.map((tip: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                              <Award className="w-4 h-4 text-amber-500 mt-0.5" /> {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {course.modules.map((moduleItem, index) => (
                    <div
                      key={index}
                      className="bg-secondary/5 backdrop-blur-sm rounded-lg p-6 border border-secondary/10 hover:border-[#41c8df]/50 transition-all duration-300"
                    >
                      <div className="flex items-center">
                        <div className="flex items-center justify-center w-10 h-10 bg-[#41c8df] rounded-full text-secondary font-bold mr-4">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-secondary mb-1">{moduleItem}</h4>
                          <p className="text-slate-500 text-sm font-medium">Module {index + 1}</p>
                        </div>
                        <BookOpen className="w-5 h-5 text-[#41c8df]" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Prerequisites & Career Paths */}
      <section className="py-20 bg-transparent text-secondary relative z-10"> {/* Section background changed to white */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Prerequisites */}
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              className="bg-secondary/5 backdrop-blur-sm rounded-2xl p-8 border border-secondary/10 shadow-[0_0_30px_rgba(0,0,0,0.3)]" // Light gray background, light gray border
            >
              <h3 className="text-2xl font-semibold text-secondary mb-6">Prerequisites</h3> {/* Black text */}
              <div className="space-y-4">
                {course.prerequisites.map((prereq, index) => (
                  <div key={index} className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-[#0891b2] mr-3 mt-1 flex-shrink-0" />
                    <span className="text-slate-700 font-medium">{prereq}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Career Paths */}
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              className="bg-secondary/5 backdrop-blur-sm rounded-2xl p-8 border border-secondary/10 shadow-[0_0_30px_rgba(0,0,0,0.3)]" // Light gray background, light gray border
            >
              <h3 className="text-2xl font-semibold text-secondary mb-6">Potential Career Paths:</h3> {/* Black text */}
              <div className="space-y-3">
                {course.career.map((role, index) => (
                  <div
                    key={index}
                    className="px-4 py-3 bg-[#41c8df]/10 rounded-lg border border-[#41c8df]/20" // Gold tint background, gold border
                  >
                    <span className="text-secondary font-medium">{role}</span> {/* Black text */}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-background/40 backdrop-blur-xl border-t border-secondary/10 relative z-10"> {/* Dark gradient */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
          >
            <motion.h2
              variants={itemVariants}
              className="text-3xl md:text-4xl font-display font-bold text-secondary mb-6" // Title remains white
            >
              Ready to Transform Your Career?
            </motion.h2>
            <motion.p
              variants={itemVariants}
              className="text-slate-600 mb-8 font-medium"
            >
              Join thousands of successful graduates and take the first step towards your dream tech career.
            </motion.p>
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link
                to={`/apply/${courseId}`}
                className="bg-[#41c8df] text-black hover:bg-secondary px-8 py-4 rounded-lg font-semibold transition-all duration-300 shadow-[0_0_20px_rgba(65,200,223,0.3)] hover:shadow-[0_0_30px_rgba(65,200,223,0.5)]"
              >
                Enroll Now
              </Link>
              {/* UPDATED BROCHURE LINK */}
              <Link
                to="/brochure" // <<<--- THIS IS THE NEW INTERNAL ROUTE
                className="border border-[#41c8df]/50 text-[#41c8df] px-8 py-4 rounded-lg font-semibold hover:bg-secondary/5 transition-all duration-300 flex items-center justify-center"
              >
                <Download className="w-5 h-5 mr-2" />
                View Brochure
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>


    </div>
  );
}; // Corrected closing brace for the component

export default CourseDetail;
