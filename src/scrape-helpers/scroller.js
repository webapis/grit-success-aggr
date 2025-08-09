export async function autoScroll(page, options = {}) {
  // Default configuration
  const config = {
    scrollSpeed: options.scrollSpeed || 100,
    scrollDistance: options.scrollDistance || 100,
    maxScrollAttempts: options.maxScrollAttempts || 200,
    timeout: options.timeout || 60000, // 60 seconds for network-heavy pages
    waitForNetworkIdle: options.waitForNetworkIdle || 2000, // Wait 2s after network idle
    waitForContentChange: options.waitForContentChange || 3000, // Wait 3s for content changes
    networkIdleTimeout: options.networkIdleTimeout || 500, // Consider network idle after 500ms
    maxWaitCycles: options.maxWaitCycles || 5, // Max cycles to wait for new content
    ...options
  };

  // Set up console logging if needed
  if (config.enableLogging) {
    page.on("console", (message) => {
      console.log("Page console:", message.text());
    });
  }

  // Track network requests
  let pendingRequests = new Set();
  let lastNetworkActivity = Date.now();

  // Monitor network requests
  page.on('request', (request) => {
    // Only track XHR, fetch, and document requests that might load content
    if (['xhr', 'fetch', 'document'].includes(request.resourceType())) {
      pendingRequests.add(request.url());
      lastNetworkActivity = Date.now();
      if (config.enableLogging) {
        console.log(`Network request started: ${request.url()}`);
      }
    }
  });

  page.on('response', (response) => {
    if (['xhr', 'fetch', 'document'].includes(response.request().resourceType())) {
      pendingRequests.delete(response.url());
      lastNetworkActivity = Date.now();
      if (config.enableLogging) {
        console.log(`Network request completed: ${response.url()}`);
      }
    }
  });

  page.on('requestfailed', (request) => {
    if (['xhr', 'fetch', 'document'].includes(request.resourceType())) {
      pendingRequests.delete(request.url());
      if (config.enableLogging) {
        console.log(`Network request failed: ${request.url()}`);
      }
    }
  });

  try {
    await page.evaluate(async (scrollConfig) => {
      return new Promise((resolve, reject) => {
        let scrollAttempts = 0;
        let lastScrollHeight = 0;
        let lastContentHash = '';
        let waitCycles = 0;
        let isWaitingForContent = false;
        
        // Set up timeout
        const timeoutId = setTimeout(() => {
          reject(new Error(`Auto-scroll timeout after ${scrollConfig.timeout}ms`));
        }, scrollConfig.timeout);

        // Helper function to generate a simple hash of visible content
        const getContentHash = () => {
          const content = document.body.innerText || document.body.textContent || '';
          return content.length + '_' + content.slice(0, 100) + '_' + content.slice(-100);
        };

        // Helper function to check if we're at the bottom
        const isAtBottom = () => {
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const windowHeight = window.innerHeight;
          const docHeight = Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.clientHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
          );
          return scrollTop + windowHeight >= docHeight - 50; // 50px buffer
        };

        const waitForNewContent = () => {
          return new Promise((resolveWait) => {
            const checkForChanges = () => {
              const currentScrollHeight = Math.max(
                document.body.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.clientHeight,
                document.documentElement.scrollHeight,
                document.documentElement.offsetHeight
              );
              const currentContentHash = getContentHash();
              
              // Check if content has changed
              if (currentScrollHeight > lastScrollHeight || currentContentHash !== lastContentHash) {
                if (scrollConfig.enableLogging) {
                  console.log(`New content detected: height ${lastScrollHeight} -> ${currentScrollHeight}`);
                }
                lastScrollHeight = currentScrollHeight;
                lastContentHash = currentContentHash;
                waitCycles = 0;
                resolveWait(true); // Content changed
                return;
              }
              
              waitCycles++;
              if (waitCycles >= scrollConfig.maxWaitCycles) {
                if (scrollConfig.enableLogging) {
                  console.log(`Max wait cycles reached (${scrollConfig.maxWaitCycles})`);
                }
                resolveWait(false); // No new content
                return;
              }
              
              // Continue waiting
              setTimeout(checkForChanges, scrollConfig.waitForContentChange / scrollConfig.maxWaitCycles);
            };
            
            checkForChanges();
          });
        };

        const scroll = async () => {
          try {
            const currentScrollHeight = Math.max(
              document.body.scrollHeight,
              document.body.offsetHeight,
              document.documentElement.clientHeight,
              document.documentElement.scrollHeight,
              document.documentElement.offsetHeight
            );
            
            // Check if we've exceeded max scroll attempts
            if (scrollAttempts >= scrollConfig.maxScrollAttempts) {
              clearTimeout(timeoutId);
              console.log(`Scroll completed: max attempts (${scrollConfig.maxScrollAttempts}) reached`);
              resolve();
              return;
            }

            // Check if we're at the bottom
            if (isAtBottom()) {
              if (!isWaitingForContent) {
                isWaitingForContent = true;
                if (scrollConfig.enableLogging) {
                  console.log('Reached bottom, waiting for new content...');
                }
                
                // Wait for potential new content
                const hasNewContent = await waitForNewContent();
                isWaitingForContent = false;
                
                if (!hasNewContent) {
                  clearTimeout(timeoutId);
                  console.log(`Scroll completed: no new content after waiting`);
                  resolve();
                  return;
                }
              }
            } else {
              isWaitingForContent = false;
              waitCycles = 0;
            }

            // Perform scroll
            window.scrollBy(0, scrollConfig.scrollDistance);
            scrollAttempts++;

            if (scrollConfig.enableLogging) {
              console.log(`Scroll attempt ${scrollAttempts}: height=${currentScrollHeight}`);
            }

            // Schedule next scroll
            setTimeout(() => scroll(), scrollConfig.scrollSpeed);
            
          } catch (error) {
            clearTimeout(timeoutId);
            reject(error);
          }
        };

        // Initialize
        lastScrollHeight = Math.max(
          document.body.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.clientHeight,
          document.documentElement.scrollHeight,
          document.documentElement.offsetHeight
        );
        lastContentHash = getContentHash();
        
        // Start scrolling
        scroll();
      });
    }, config);

    // Wait for any remaining network requests to complete
    if (pendingRequests.size > 0 || (Date.now() - lastNetworkActivity) < config.networkIdleTimeout) {
      if (config.enableLogging) {
        console.log('Waiting for network requests to complete...');
      }
      
      await new Promise((resolve) => {
        const checkNetworkIdle = () => {
          const timeSinceLastActivity = Date.now() - lastNetworkActivity;
          
          if (pendingRequests.size === 0 && timeSinceLastActivity >= config.networkIdleTimeout) {
            resolve();
          } else {
            setTimeout(checkNetworkIdle, 100);
          }
        };
        
        setTimeout(checkNetworkIdle, config.waitForNetworkIdle);
      });
    }
    
    console.log('Auto-scroll completed successfully');
    
  } catch (error) {
    console.error('Auto-scroll failed:', error.message);
    throw error;
  }
}

// Usage examples:
/*
// Basic usage for dynamic content
await autoScroll(page, { 
  scrollSpeed: 200,
  waitForNetworkIdle: 2000,
  enableLogging: true 
});

// For heavy AJAX applications
await autoScroll(page, {
  scrollSpeed: 300,
  waitForNetworkIdle: 3000,
  waitForContentChange: 4000,
  maxWaitCycles: 8,
  timeout: 120000, // 2 minutes
  enableLogging: true
});

// For infinite scroll with lazy loading
await autoScroll(page, {
  scrollSpeed: 500,
  scrollDistance: 300,
  waitForNetworkIdle: 1500,
  maxScrollAttempts: 500,
  enableLogging: true
});
*/