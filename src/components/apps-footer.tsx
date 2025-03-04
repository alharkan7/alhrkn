import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const AppsFooter = () => {
    const currentYear = new Date().getFullYear();
    const { theme, setTheme } = useTheme();

    return (
        <footer className="py-3 text-center text-sm text-muted-foreground max-w-6xl mx-auto">
            <p className="flex flex-wrap items-center justify-center relative">
                <span className="flex-grow flex items-center justify-center">
                    &copy; {currentYear}&nbsp;
                    {/* <a
                        href="https://x.com/alhrkn"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/90"
                    >
                        alhrkn
                    </a> */}
                </span>
                <Button
                    variant="default"
                    size="icon"
                    className="size-8 absolute right-2.5 rounded-full"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </p>
        </footer>
    );
};

export default AppsFooter;
