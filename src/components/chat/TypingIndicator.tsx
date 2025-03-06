import { motion } from 'framer-motion';

export function TypingIndicator() {
    const dots = [0, 1, 2];
    
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex justify-start"
        >
            <div className="bg-accent text-accent-foreground rounded-2xl px-4 py-2 rounded-bl-none">
                <div className="flex items-center gap-1">
                    {dots.map((dot) => (
                        <motion.div
                            key={dot}
                            className="w-1.5 h-1.5 bg-current rounded-full"
                            animate={{
                                y: ["0%", "-50%", "0%"]
                            }}
                            transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                repeatType: "reverse",
                                delay: dot * 0.15,
                                ease: "easeInOut"
                            }}
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
