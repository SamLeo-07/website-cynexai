import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { ArrowLeft, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import HTMLFlipBook from 'react-pageflip';

const BrochurePage = () => {
    const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });
    const bookContainerRef = useRef<HTMLDivElement>(null); // Ref to measure the container holding the book
    const flipBookRef = useRef<{ pageFlip: () => { flipNext: () => void; flipPrev: () => void } } | null>(null); // Ref for the HTMLFlipBook instance itself
    const [bookWidth, setBookWidth] = useState(500); // Default single page width
    const [bookHeight, setBookHeight] = useState(700); // Default single page height
    const [currentPage, setCurrentPage] = useState(0); // State to track current page for navigation arrows
    const [usePortrait, setUsePortrait] = useState(false); // State to track orientation

    // Define your brochure page image paths
    // IMPORTANT: Ensure these paths correctly point to images in your public/brochure_images folder
    const brochurePages = [
        '/brochure_images/page1.png', // Cover page
        '/brochure_images/page2.png',
        '/brochure_images/page3.png',
        '/brochure_images/page4.png', // Back cover
    ];

    // Function to calculate book dimensions dynamically
    const calculateBookDimensions = useCallback(() => {
        if (bookContainerRef.current) {
            const containerWidth = bookContainerRef.current.offsetWidth;
            // Account for header (pt-20) and some bottom margin (pb-10)
            const availableHeight = window.innerHeight - (bookContainerRef.current.offsetTop || 0) - 120; // Adjusted for more vertical space

            // Define an ideal aspect ratio for a single page of your PDF (width / height)
            // For A4 portrait, it's roughly 210 / 297 = 0.707
            const singlePageAspectRatio = 0.707; // Adjust this based on your actual PDF page aspect ratio

            let newSinglePageWidth;
            let newSinglePageHeight;

            if (window.innerWidth < 768) { // Mobile devices
                // On mobile, aim for a single page to fill most of the screen width
                newSinglePageWidth = containerWidth * 0.9; // 90% of container width
                newSinglePageHeight = newSinglePageWidth / singlePageAspectRatio;
                setUsePortrait(true);

                // Ensure it doesn't exceed available height on mobile
                if (newSinglePageHeight > availableHeight * 0.9) {
                    newSinglePageHeight = availableHeight * 0.9;
                    newSinglePageWidth = newSinglePageHeight * singlePageAspectRatio;
                }

            } else { // PC/Tablet
                // For PC, the HTMLFlipBook 'width' prop is for a single page.
                // The total book width (2 pages + gutter) should fit the container.
                newSinglePageWidth = (containerWidth * 0.8) / 2; // 80% of container width, divided by 2 for single page
                newSinglePageHeight = newSinglePageWidth / singlePageAspectRatio;
                setUsePortrait(false);

                // Ensure the height fits the available screen height
                if (newSinglePageHeight > availableHeight * 0.9) {
                    newSinglePageHeight = availableHeight * 0.9;
                    newSinglePageWidth = newSinglePageHeight * singlePageAspectRatio;
                }
            }

            setBookWidth(Math.max(250, Math.min(newSinglePageWidth, 600))); // Min 250px, Max 600px for a single page
            setBookHeight(Math.max(350, Math.min(newSinglePageHeight, 850))); // Min 350px, Max 850px for a single page
        }
    }, []);

    useEffect(() => {
        calculateBookDimensions(); // Calculate on initial render
        window.addEventListener('resize', calculateBookDimensions); // Recalculate on resize
        return () => {
            window.removeEventListener('resize', calculateBookDimensions); // Clean up event listener
        };
    }, [calculateBookDimensions]); // Recalculate if calculateBookDimensions callback changes

    // Navigation functions for arrows
    const goToNextPage = () => {
        if (flipBookRef.current) {
            flipBookRef.current.pageFlip().flipNext();
        }
    };

    const goToPrevPage = () => {
        if (flipBookRef.current) {
            flipBookRef.current.pageFlip().flipPrev();
        }
    };

    // Handler for page changes
    const onPage = (e: { data: number }) => {
        setCurrentPage(e.data); // e.data contains the current page index
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                staggerChildren: 0.1,
                when: "beforeChildren",
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    return (
        <div className="min-h-screen bg-transparent text-secondary pt-20 pb-10"> {/* pt-20 to account for fixed header */}
            <section className="relative py-12 md:py-16 bg-background/40 backdrop-blur-xl border-y border-secondary/10">
                <div className="container mx-auto px-4 relative z-10">
                    <Link to="/" className="text-[#41c8df] hover:text-secondary flex items-center mb-6">
                        <ArrowLeft className="w-5 h-5 mr-2" /> Back to Home
                    </Link>
                    <motion.div
                        ref={ref}
                        initial="hidden"
                        animate={inView ? "visible" : "hidden"}
                        variants={containerVariants}
                        className="text-center"
                    >
                        <motion.h1
                            variants={itemVariants}
                            className="text-4xl md:text-5xl font-display font-bold text-secondary mb-4"
                        >
                            Our Comprehensive Program Brochure
                        </motion.h1>
                        <motion.p
                            variants={itemVariants}
                            className="text-gray-400 mb-8 max-w-2xl mx-auto"
                        >
                            Explore our detailed programs, curriculum, and career opportunities in this interactive brochure.
                        </motion.p>

                        {/* FLIPBOOK CONTAINER WITH NAVIGATION */}
                        <motion.div
                            variants={itemVariants}
                            ref={bookContainerRef}
                            className="w-full flex flex-col items-center justify-center relative my-8"
                            style={{ minHeight: `${bookHeight + 80}px` }} // Ensure container is tall enough for book + controls
                        >
                            {bookWidth > 0 && bookHeight > 0 && ( // Render only when dimensions are calculated
                                <>
                                    <HTMLFlipBook
                                        width={bookWidth}
                                        height={bookHeight}
                                        showCover={true}
                                        flippingTime={800}
                                        disableFlipByClick={false}
                                        maxShadowOpacity={0.5}
                                        mobileScrollSupport={true}
                                        className="demo-book shadow-2xl" // Added shadow
                                        size="stretch"
                                        minWidth={250}
                                        maxWidth={600}
                                        minHeight={350}
                                        maxHeight={850}
                                        onFlip={onPage} // Attach page change handler
                                        ref={flipBookRef} // Attach ref to the flipbook instance
                                        style={{}}
                                        startPage={0}
                                        drawShadow={true}
                                        usePortrait={usePortrait}
                                        startZIndex={0}
                                        autoSize={true}
                                        clickEventForward={true}
                                        useMouseEvents={true}
                                        swipeDistance={30}
                                        showPageCorners={true}
                                    >
                                        {brochurePages.map((pageSrc, index) => (
                                            <div key={index} className="page bg-secondary flex items-center justify-center">
                                                <img src={pageSrc} alt={`Brochure Page ${index + 1}`} className="w-full h-full object-contain" />
                                            </div>
                                        ))}
                                    </HTMLFlipBook>

                                    {/* Navigation Arrows - Adjusted for responsiveness and style */}
                                    <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-2 sm:px-4 md:px-8">
                                        <motion.button
                                            onClick={goToPrevPage}
                                            disabled={currentPage === 0}
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            className={`p-2 sm:p-3 rounded-full bg-[#41c8df]/75 text-black shadow-lg transition-colors duration-300
                                  ${currentPage === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-yellow-600'}`}
                                        >
                                            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                                        </motion.button>

                                        <motion.button
                                            onClick={goToNextPage}
                                            disabled={currentPage === brochurePages.length - 1}
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            className={`p-2 sm:p-3 rounded-full bg-[#41c8df]/75 text-black shadow-lg transition-colors duration-300
                                  ${currentPage === brochurePages.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-yellow-600'}`}
                                        >
                                            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                                        </motion.button>
                                    </div>

                                    {/* Page Number Indicator */}
                                    <div className="mt-4 text-gray-400 text-sm">
                                        Page {currentPage + 1} of {brochurePages.length}
                                    </div>
                                </>
                            )}
                        </motion.div>
                        {/* END FLIPBOOK COMPONENT */}

                        <motion.p
                            variants={itemVariants}
                            className="text-gray-500 mt-8 text-sm"
                        >
                            (Interactive Brochure)
                        </motion.p>
                    </motion.div>
                </div>
            </section>

            {/* Optional: Add a section for downloading the PDF directly if needed */}
            <section className="py-10 bg-background/40 backdrop-blur-xl border-y border-secondary/10 text-center mt-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <h3 className="text-xl font-semibold text-secondary mb-4">Prefer a PDF?</h3>
                    <a
                        href="/cynaxai%20brouchure.pdf" // Corrected href to match your deployed filename
                        download="CynexAI_Brochure.pdf" // This is the suggested filename for the user's download
                        className="inline-flex items-center bg-[#41c8df] text-black hover:bg-secondary px-8 py-4 rounded-xl font-bold uppercase tracking-widest transition-all duration-300 shadow-[0_0_20px_rgba(65,200,223,0.3)] hover:shadow-[0_0_30px_rgba(65,200,223,0.5)]"
                    >
                        <Download className="w-5 h-5 mr-2" />
                        Download PDF
                    </a>
                </motion.div>
            </section>
        </div>
    );
};

export default BrochurePage;
