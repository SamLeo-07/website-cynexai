import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface TiltCardProps {
    children: React.ReactNode;
    className?: string;
    glareEnable?: boolean;
    tiltMaxAngleX?: number;
    tiltMaxAngleY?: number;
    scale?: number;
}

const TiltCard: React.FC<TiltCardProps> = ({
    children,
    className = "",
    glareEnable = true,
    tiltMaxAngleX = 10,
    tiltMaxAngleY = 10,
    scale = 1.02,
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
    const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [tiltMaxAngleX, -tiltMaxAngleX]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-tiltMaxAngleY, tiltMaxAngleY]);

    const glareX = useTransform(mouseXSpring, [-0.5, 0.5], [0, 100]);
    const glareY = useTransform(mouseYSpring, [-0.5, 0.5], [0, 100]);

    useEffect(() => {
        if (!isHovered) {
            x.set(0);
            y.set(0);
        }
    }, [isHovered, x, y]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;

        const rect = ref.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;

        x.set(xPct);
        y.set(yPct);
    };

    return (
        <motion.div
            ref={ref}
            className={`relative [transform-style:preserve-3d] ${className}`}
            style={{
                rotateX,
                rotateY,
                transformPerspective: 1200, // Deeper perspective!
            }}
            whileHover={{ scale }}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* The actual content wrapper */}
            <div className="w-full h-full relative [transform-style:preserve-3d]">
                {/* 
                     We map through children and if they explicitly want to pop, 
                     they can use the `translateZ` utility in their own classNames. 
                     Here we just pass them through but ensure the wrapper preserves 3d.
                */}
                {children}
            </div>

            {/* Optional Glare Effect */}
            {glareEnable && isHovered && (
                <motion.div
                    className="absolute inset-0 pointer-events-none rounded-xl mix-blend-overlay opacity-60 overflow-hidden"
                    style={{
                        background: `radial-gradient(circle at ${glareX.get()}% ${glareY.get()}%, rgba(255,255,255,0.4) 0%, transparent 60%)`,
                        transform: "translateZ(1px)", // Stay slightly above content
                    }}
                />
            )}
        </motion.div>
    );
};

export default TiltCard;
