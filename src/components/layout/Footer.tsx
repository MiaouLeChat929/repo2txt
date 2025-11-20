export function Footer() {
    return (
      <footer className="border-t bg-muted/50 py-6">
        <div className="container flex flex-col items-center justify-center gap-4 px-4 md:px-8 md:flex-row md:justify-between">
          <p className="text-center text-sm text-muted-foreground md:text-left">
            Built by{" "}
            <a
              href="https://github.com/abinthomasonline"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              abinthomasonline
            </a>
            .
          </p>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
             <a href="mailto:abinthomasonline@gmail.com" className="hover:underline">
               Report an Issue
             </a>
          </div>
        </div>
      </footer>
    )
  }
