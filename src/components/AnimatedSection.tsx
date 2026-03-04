
import { ReactNode } from 'react';
import { motion, Variants } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

type AnimationType = 'fadeSlideUp' | 'rotateIn' | 'flipX' | 'zoomIn' | 'slideFromLeft' | 'slideFromRight';

interface AnimatedSectionProps {
    children: ReactNode;
    animation?: AnimationType;
    delay?: number;
    className?: string;
    threshold?: number;
}

const variantMap: Record<AnimationType, Variants> = {
    fadeSlideUp: {
        hidden: { opacity: 0, y: 60, rotateX: 15 },
        visible: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] } },
    },
    rotateIn: {
        hidden: { opacity: 0, rotate: -8, scale: 0.92 },
        visible: { opacity: 1, rotate: 0, scale: 1, transition: { duration: 0.7, ease: 'easeOut' } },
    },
    flipX: {
        hidden: { opacity: 0, rotateY: 90, perspective: 1000 },
        visible: { opacity: 1, rotateY: 0, transition: { duration: 0.9, ease: 'easeOut' } },
    },
    zoomIn: {
        hidden: { opacity: 0, scale: 0.75, rotateX: 10 },
        visible: { opacity: 1, scale: 1, rotateX: 0, transition: { duration: 0.7, ease: [0.34, 1.56, 0.64, 1] } },
    },
    slideFromLeft: {
        hidden: { opacity: 0, x: -80, rotateY: -15 },
        visible: { opacity: 1, x: 0, rotateY: 0, transition: { duration: 0.8, ease: 'easeOut' } },
    },
    slideFromRight: {
        hidden: { opacity: 0, x: 80, rotateY: 15 },
        visible: { opacity: 1, x: 0, rotateY: 0, transition: { duration: 0.8, ease: 'easeOut' } },
    },
};

const AnimatedSection = ({
    children,
    animation = 'fadeSlideUp',
    delay = 0,
    className = '',
    threshold = 0.15,
}: AnimatedSectionProps) => {
    const [ref, inView] = useInView({ triggerOnce: true, threshold });
    const variants = variantMap[animation];

    return (
        <motion.div
            ref={ref}
            variants={variants}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            transition={{ delay }}
            className={className}
            style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
        >
            {children}
        </motion.div>
    );
};

export default AnimatedSection;
