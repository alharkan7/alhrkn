const AppsFooter = () => {
    const currentYear = new Date().getFullYear();
    return (
        <footer className="py-3 text-center text-sm text-muted-foreground">
            <p className="flex flex-wrap items-center justify-center">
                &copy; {currentYear}&nbsp; 
                <a 
                    href="https://x.com/alhrkn" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary hover:text-primary/90"
                >
                    alhrkn
                </a>.
                {" "}
                All rights reserved.
                {/* {" | "}
                <a href="mailto:alharkan7@gmail.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/90">&nbsp;Report a Bug</a> */}
            </p>
        </footer>
    )
};

export default AppsFooter;
