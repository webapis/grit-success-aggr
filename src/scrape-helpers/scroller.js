

export default async function scroller(page, scrollSpeed, scrollTimes = 50) {
    page.on("console", (message) => {
      console.log("Message from Puppeteer page:", message.text());
    });
  
    await page.evaluate(async (_scrollSpeed, _scrollTimes) => {
      await new Promise((resolve, reject) => {
        var totalHeight = 0;
        var distance = 100;
        let inc = 0;
        let totalInterval = 0;
        
        var timer = setInterval(() => {
          var scrollHeight = document.body.scrollHeight;
          
          window.scrollBy(0, distance);
          totalHeight += distance;
          inc = inc + 1;
          totalInterval = totalInterval + 1;
          
          console.log("Scroll count", inc, "Total intervals", totalInterval);
          
          if (totalInterval >= _scrollTimes) {
            clearInterval(timer);
            resolve();
          }
          
          // Optional: Stop if reached bottom of page
          if (totalHeight >= scrollHeight - window.innerHeight) {
            clearInterval(timer);
            resolve();
          }
        }, _scrollSpeed);
      });
    }, scrollSpeed, scrollTimes);
  }

  //https://claude.ai/chat/e48d8dea-5a3b-424e-addd-ef88e130b713
export async function autoScroll(page, options = {}) {
  // Default configuration
  const config = {
    scrollSpeed: options.scrollSpeed || 100,
    scrollDistance: options.scrollDistance || 200,
    maxScrollAttempts: options.maxScrollAttempts || 100,
    waitForContentChange: options.waitForContentChange || 2000,
    maxWaitCycles: options.maxWaitCycles || 3,
    showMoreSelector: options.showMoreSelector || null, // CSS selector for "show more" button
    showMoreClickDelay: options.showMoreClickDelay || 1000, // Delay after clicking show more button
    maxShowMoreClicks: options.maxShowMoreClicks || 10, // Max number of times to click show more
    ...options
  };

  // Set up console logging if needed
  if (config.enableLogging) {
    page.on("console", (message) => {
      console.log("Page console:", message.text());
    });
  }

  try {
    await page.evaluate(async (scrollConfig) => {
      return new Promise((resolve, reject) => {
        let scrollAttempts = 0;
        let lastScrollHeight = 0;
        let lastContentHash = '';
        let waitCycles = 0;
        let isWaitingForContent = false;
        let showMoreClicks = 0;

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

        // Helper function to find and click "show more" button
        const tryClickShowMore = () => {
          if (!scrollConfig.showMoreSelector) {
            return false;
          }

          try {
            const showMoreButton = document.querySelector(scrollConfig.showMoreSelector);
            
            if (showMoreButton && showMoreClicks < scrollConfig.maxShowMoreClicks) {
              // Check if button is visible and clickable
              const rect = showMoreButton.getBoundingClientRect();
              const isVisible = rect.width > 0 && rect.height > 0 && 
                              rect.top >= 0 && rect.left >= 0 && 
                              rect.bottom <= window.innerHeight && 
                              rect.right <= window.innerWidth;
              
              const isClickable = !showMoreButton.disabled && 
                                showMoreButton.style.display !== 'none' &&
                                window.getComputedStyle(showMoreButton).display !== 'none' &&
                                window.getComputedStyle(showMoreButton).visibility !== 'hidden';
              
              if (isVisible && isClickable) {
                if (scrollConfig.enableLogging) {
                  console.log(`Clicking "show more" button (attempt ${showMoreClicks + 1})`);
                }
                
                // Scroll the button into view if needed
                showMoreButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Click the button
                showMoreButton.click();
                showMoreClicks++;
                
                return true;
              }
            }
          } catch (error) {
            if (scrollConfig.enableLogging) {
              console.log(`Error clicking show more button: ${error.message}`);
            }
          }
          
          return false;
        };

        const waitForNewContent = () => {
          return new Promise((resolveWait) => {
            const contentWaitStart = Date.now();
            const maxContentWaitTime = scrollConfig.waitForContentChange;
            
            const checkForChanges = () => {
              const currentScrollHeight = Math.max(
                document.body.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.clientHeight,
                document.documentElement.scrollHeight,
                document.documentElement.offsetHeight
              );
              const currentContentHash = getContentHash();
              const totalWaitTime = Date.now() - contentWaitStart;
              
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
              
              // Exit if we've waited too long
              if (totalWaitTime >= maxContentWaitTime) {
                if (scrollConfig.enableLogging) {
                  console.log(`Content wait timeout reached after ${totalWaitTime}ms`);
                }
                resolveWait(false); // Timeout reached
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
              console.log(`Scroll completed: max attempts (${scrollConfig.maxScrollAttempts}) reached`);
              resolve();
              return;
            }

            // Check if we're at the bottom
            if (isAtBottom()) {
              if (!isWaitingForContent) {
                isWaitingForContent = true;
                if (scrollConfig.enableLogging) {
                  console.log('Reached bottom, checking for show more button or waiting for new content...');
                }
                
                // Try to click "show more" button first
                const clickedShowMore = tryClickShowMore();
                
                if (clickedShowMore) {
                  // Wait a bit after clicking show more
                  await new Promise(resolve => setTimeout(resolve, scrollConfig.showMoreClickDelay));
                  isWaitingForContent = false;
                  // Continue scrolling after clicking show more
                  setTimeout(() => scroll(), scrollConfig.scrollSpeed);
                  return;
                }
                
                // If no show more button, wait for potential new content
                const hasNewContent = await waitForNewContent();
                isWaitingForContent = false;
                
                if (!hasNewContent) {
                  console.log(`Scroll completed: no new content after waiting and no more "show more" buttons`);
                  resolve();
                  return;
                }
              }
            } else {
              isWaitingForContent = false;
              waitCycles = 0;
              
              // Also check for show more buttons while scrolling (not just at bottom)
              if (scrollConfig.showMoreSelector && Math.random() < 0.1) { // Check occasionally while scrolling
                tryClickShowMore();
              }
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
    
    console.log('Auto-scroll completed successfully');
    
  } catch (error) {
    console.error('Auto-scroll failed:', error.message);
    throw error;
  }
}


export async function scrollWithShowMore(page, scrollSpeed, showMoreSelector, maxAttempts = 50) {
  page.on("console", (message) => {
    console.log("Message from Puppeteer page:", message.text());
  });

  await page.evaluate(async (_scrollSpeed, _showMoreSelector, _maxAttempts) => {
    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 100;
      let scrollCount = 0;
      let attemptCount = 0;
      let consecutiveBottomReached = 0;
      
      var timer = setInterval(async () => {
        try {
          var scrollHeight = document.body.scrollHeight;
          
          // Scroll down
          window.scrollBy(0, distance);
          totalHeight += distance;
          scrollCount++;
          attemptCount++;
          
          console.log("Scroll count:", scrollCount, "Attempt:", attemptCount);
          
          // Check if we've reached the bottom
          const isAtBottom = totalHeight >= scrollHeight - window.innerHeight;
          
          if (isAtBottom) {
            consecutiveBottomReached++;
            console.log("At bottom, looking for show more button...");
            
            // Look for show more button
            const showMoreButton = document.querySelector(_showMoreSelector);
            
            if (showMoreButton && showMoreButton.offsetParent !== null) {
              // Button exists and is visible
              console.log("Found show more button, clicking...");
              
              // Scroll button into view if needed
              showMoreButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
              
              // Small delay to ensure scroll completes
              setTimeout(() => {
                showMoreButton.click();
                console.log("Clicked show more button");
                
                // Reset counters after clicking
                consecutiveBottomReached = 0;
                totalHeight = 0; // Reset to allow for new content
                
                // Wait a bit for content to load
                setTimeout(() => {
                  console.log("Waiting for new content to load...");
                }, 1000);
              }, 500);
              
            } else {
              console.log("No show more button found or button not visible");
              
              // If no button found for several consecutive attempts, stop
              if (consecutiveBottomReached >= 5) {
                console.log("No more content to load, stopping...");
                clearInterval(timer);
                resolve();
              }
            }
          } else {
            // Reset bottom counter if we're not at bottom (new content loaded)
            consecutiveBottomReached = 0;
          }
          
          // Safety check - stop after max attempts
          if (attemptCount >= _maxAttempts) {
            console.log("Max attempts reached, stopping...");
            clearInterval(timer);
            resolve();
          }
          
        } catch (error) {
          console.error("Error during scroll/click:", error);
          clearInterval(timer);
          reject(error);
        }
        
      }, _scrollSpeed);
    });
  }, scrollSpeed, showMoreSelector, maxAttempts);
}

// Alternative version with more robust button detection and clicking
export async function scrollWithShowMoreAdvanced(
  page,
  scrollSpeed,
  showMoreSelector,
  options = {}
) {
  const {
    maxAttempts = 50,
    waitAfterClick = 2000,
    maxConsecutiveBottomReached = 5,
    buttonClickDelay = 500,
    enableScrolling = true,
    validateSelector = true,
    debug = true,
    maxClicks = Infinity, // user-defined limit
  } = options;

  let consecutiveBottomReached = 0;
  let lastHeight = 0;
  let attempts = 0;
  let clicksMade = 0;
  let reason = "Completed successfully";

  while (attempts < maxAttempts) {
    attempts++;

    if (enableScrolling) {
      lastHeight = await page.evaluate(
        async (speed) => {
          window.scrollBy(0, speed);
          return document.body.scrollHeight;
        },
        scrollSpeed
      );
    }

    // Try clicking the "Show More" button if it's available and we still have clicks left
    if (clicksMade < maxClicks) {
      const buttonExists = await page.$(showMoreSelector);
      if (buttonExists) {
        try {
          await page.click(showMoreSelector);
          clicksMade++;
          if (debug) console.log(`✅ Clicked 'Show More' (${clicksMade}/${maxClicks})`);
          await page.waitForTimeout(waitAfterClick);
          continue; // continue loop after clicking
        } catch (err) {
          reason = `⚠️ Failed to click 'Show More': ${err.message}`;
          if (debug) console.warn(reason);
          break;
        }
      } else {
        reason = "⚠️ No 'Show More' button found";
        if (debug) console.warn(reason);
        break;
      }
    }

    // Check if bottom is reached
    const newHeight = await page.evaluate(() => document.body.scrollHeight);
    if (newHeight === lastHeight) {
      consecutiveBottomReached++;
      if (consecutiveBottomReached >= maxConsecutiveBottomReached) {
        reason = "⚠️ Reached bottom of page";
        if (debug) console.log(reason);
        break;
      }
    } else {
      consecutiveBottomReached = 0;
      lastHeight = newHeight;
    }

    await page.waitForTimeout(buttonClickDelay);
  }

  // Final log result
  if (clicksMade < maxClicks) {
    if (reason === "Completed successfully") {
      reason = `⚠️ Stopped early, only clicked ${clicksMade}/${maxClicks}`;
    }
    console.warn(reason);
  } else {
    console.log(`🎯 All ${maxClicks} clicks completed successfully`);
  }

  return { clicksMade, expected: maxClicks, reason };
}



export async function autoScrollUntilCount(page, selector, targetCount, options = {}) {
  // Default configuration
  const config = {
    scrollSpeed: options.scrollSpeed || 200,//100,
    scrollDistance: options.scrollDistance || 100,//100,
    maxScrollAttempts: options.maxScrollAttempts || 500,
    timeout: options.timeout || 300000, // 2 minutes for network-heavy pages
    waitForNetworkIdle: options.waitForNetworkIdle || 10000,//2000, // Wait 2s after network idle
    waitForContentChange: options.waitForContentChange || 10000, // Wait 3s for content changes
    networkIdleTimeout: options.networkIdleTimeout || 5000, // Consider network idle after 500ms
    maxWaitCycles: options.maxWaitCycles || 5, // Max cycles to wait for new content
    enableLogging: options.enableLogging || false,
    checkInterval: options.checkInterval || 10, // Check element count every N scrolls
    ...options
  };

  // Validate inputs
  if (!selector || typeof selector !== 'string') {
    throw new Error('Selector must be a non-empty string');
  }
  if (!targetCount || targetCount <= 0) {
    throw new Error('Target count must be a positive number');
  }

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
    await page.evaluate(async (scrollConfig, elementSelector, targetElementCount) => {
      return new Promise((resolve, reject) => {
        let scrollAttempts = 0;
        let lastElementCount = 0;
        let waitCycles = 0;
        let isWaitingForContent = false;
        
        // Set up timeout
        const timeoutId = setTimeout(() => {
          reject(new Error(`Auto-scroll timeout after ${scrollConfig.timeout}ms`));
        }, scrollConfig.timeout);

        // Helper function to get current element count
        const getCurrentElementCount = () => {
          try {
            return document.querySelectorAll(elementSelector).length;
          } catch (error) {
            console.error('Error querying selector:', error);
            return 0;
          }
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
              const currentElementCount = getCurrentElementCount();
              
              // Check if element count has changed
              if (currentElementCount > lastElementCount) {
                if (scrollConfig.enableLogging) {
                  console.log(`New elements detected: ${lastElementCount} -> ${currentElementCount}`);
                }
                lastElementCount = currentElementCount;
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
            const currentElementCount = getCurrentElementCount();
            
            // Track if we've reached the target count (but don't stop yet)
            const targetReached = currentElementCount >= targetElementCount;
            
            // Check if we've exceeded max scroll attempts
            if (scrollAttempts >= scrollConfig.maxScrollAttempts) {
              clearTimeout(timeoutId);
              const targetReached = currentElementCount >= targetElementCount;
              const reason = targetReached ? 'max_attempts_target_met' : 'max_attempts_target_not_met';
              
              console.log(`Scroll completed: max attempts (${scrollConfig.maxScrollAttempts}) reached. Found ${currentElementCount}/${targetElementCount} elements. Target ${targetReached ? 'achieved' : 'not achieved'}.`);
              resolve({ 
                success: targetReached, 
                finalCount: currentElementCount, 
                targetCount: targetElementCount,
                scrollAttempts: scrollAttempts,
                reason: reason,
                targetReached: targetReached
              });
              return;
            }

            // Log progress periodically
            if (scrollConfig.enableLogging && scrollAttempts % scrollConfig.checkInterval === 0) {
              const status = targetReached ? '✓ TARGET REACHED, continuing to bottom' : 'searching';
              console.log(`Scroll progress: ${currentElementCount}/${targetElementCount} elements found (attempt ${scrollAttempts}) - ${status}`);
            }

            // Check if we're at the bottom
            if (isAtBottom()) {
              if (!isWaitingForContent) {
                isWaitingForContent = true;
                const statusMsg = targetReached 
                  ? `Reached bottom with target achieved (${currentElementCount}/${targetElementCount} elements), checking for more content...`
                  : `Reached bottom with ${currentElementCount}/${targetElementCount} elements, waiting for new content...`;
                
                if (scrollConfig.enableLogging) {
                  console.log(statusMsg);
                }
                
                // Wait for potential new content
                const hasNewContent = await waitForNewContent();
                isWaitingForContent = false;
                
                if (!hasNewContent) {
                  clearTimeout(timeoutId);
                  const successStatus = targetReached;
                  const reason = targetReached ? 'bottom_reached_target_met' : 'bottom_reached_target_not_met';
                  
                  console.log(`Scroll completed: reached bottom. Found ${currentElementCount}/${targetElementCount} elements. Target ${targetReached ? 'achieved' : 'not achieved'}.`);
                  resolve({ 
                    success: successStatus, 
                    finalCount: currentElementCount, 
                    targetCount: targetElementCount,
                    scrollAttempts: scrollAttempts,
                    reason: reason,
                    targetReached: targetReached
                  });
                  return;
                }
              }
            } else {
              isWaitingForContent = false;
              waitCycles = 0;
            }

            // Update element count tracking
            if (currentElementCount > lastElementCount) {
              lastElementCount = currentElementCount;
            }

            // Perform scroll
            window.scrollBy(0, scrollConfig.scrollDistance);
            scrollAttempts++;

            // Schedule next scroll
            setTimeout(() => scroll(), scrollConfig.scrollSpeed);
            
          } catch (error) {
            clearTimeout(timeoutId);
            reject(error);
          }
        };

        // Initialize
        lastElementCount = getCurrentElementCount();
        
        if (scrollConfig.enableLogging) {
          console.log(`Starting auto-scroll: looking for ${targetElementCount} elements with selector "${elementSelector}"`);
          console.log(`Initial count: ${lastElementCount} elements found`);
        }
        
        // Check if we already have enough elements (but still need to scroll to bottom)
        if (lastElementCount >= targetElementCount) {
          if (scrollConfig.enableLogging) {
            console.log(`Target already reached: ${lastElementCount}/${targetElementCount} elements found, but continuing to scroll to bottom...`);
          }
        }
        
        // Start scrolling
        scroll();
      });
    }, config, selector, targetCount);

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
    
    console.log('Auto-scroll with element counting completed successfully');
    
  } catch (error) {
    console.error('Auto-scroll with element counting failed:', error.message);
    throw error;
  }
}

export async function scrollWithShowMoreUntilCount(page, selector, targetCount, showMoreSelector, options = {}) {
  // Default configuration combining both functions
  const config = {
    scrollSpeed: options.scrollSpeed || 100,
    scrollDistance: options.scrollDistance || 100,
    maxScrollAttempts: options.maxScrollAttempts || 500,
    timeout: options.timeout || 120000, // 2 minutes
    waitAfterClick: options.waitAfterClick || 2000,
    buttonClickDelay: options.buttonClickDelay || 500,
    maxConsecutiveBottomReached: options.maxConsecutiveBottomReached || 5,
    maxWaitCycles: options.maxWaitCycles || 5,
    waitForContentChange: options.waitForContentChange || 3000,
    enableLogging: options.enableLogging || false,
    checkInterval: options.checkInterval || 10,
    enableScrolling: options.enableScrolling !== false, // Default to true
    prioritizeButtons: options.prioritizeButtons || true, // Prioritize clicking over scrolling
    ...options
  };

  // Validate inputs
  if (!selector || typeof selector !== 'string') {
    throw new Error('Selector must be a non-empty string');
  }
  if (!targetCount || targetCount <= 0) {
    throw new Error('Target count must be a positive number');
  }
  if (!showMoreSelector || typeof showMoreSelector !== 'string') {
    throw new Error('Show more selector must be a non-empty string');
  }

  // Set up console logging if needed
  if (config.enableLogging) {
    page.on("console", (message) => {
      console.log("Page console:", message.text());
    });
  }

  // Track network requests for better timing
  let pendingRequests = new Set();
  let lastNetworkActivity = Date.now();

  page.on('request', (request) => {
    if (['xhr', 'fetch', 'document'].includes(request.resourceType())) {
      pendingRequests.add(request.url());
      lastNetworkActivity = Date.now();
    }
  });

  page.on('response', (response) => {
    if (['xhr', 'fetch', 'document'].includes(response.request().resourceType())) {
      pendingRequests.delete(response.url());
      lastNetworkActivity = Date.now();
    }
  });

  page.on('requestfailed', (request) => {
    if (['xhr', 'fetch', 'document'].includes(request.resourceType())) {
      pendingRequests.delete(request.url());
    }
  });

  try {
    const result = await page.evaluate(async (scrollConfig, elementSelector, targetElementCount, showMoreSel) => {
      return new Promise((resolve, reject) => {
        let scrollAttempts = 0;
        let lastElementCount = 0;
        let consecutiveBottomReached = 0;
        let isWaitingForContent = false;
        let buttonClickCount = 0;
        let waitCycles = 0;
        
        // Set up timeout
        const timeoutId = setTimeout(() => {
          reject(new Error(`Combined scroll timeout after ${scrollConfig.timeout}ms`));
        }, scrollConfig.timeout);

        // Helper function to get current element count
        const getCurrentElementCount = () => {
          try {
            return document.querySelectorAll(elementSelector).length;
          } catch (error) {
            console.error('Error querying selector:', error);
            return 0;
          }
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
          return scrollTop + windowHeight >= docHeight - 50;
        };

        // Helper function to find and check show more button
        const findShowMoreButton = () => {
          const button = document.querySelector(showMoreSel);
          if (!button) return null;
          
          const isVisible = button.offsetParent !== null && 
            !button.disabled &&
            !button.classList.contains('disabled') &&
            getComputedStyle(button).display !== 'none' &&
            getComputedStyle(button).visibility !== 'hidden';
            
          return isVisible ? button : null;
        };

        // Function to click show more button
        const clickShowMoreButton = (button) => {
          return new Promise((resolveClick) => {
            buttonClickCount++;
            console.log(`Found show more button (click #${buttonClickCount}), clicking...`);
            
            // Scroll button into view
            button.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'center'
            });
            
            setTimeout(() => {
              try {
                // Try multiple click methods
                if (button.click) {
                  button.click();
                } else {
                  const clickEvent = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                  });
                  button.dispatchEvent(clickEvent);
                }
                
                console.log("Successfully clicked show more button");
                consecutiveBottomReached = 0; // Reset counter
                
                // Wait for content to load
                setTimeout(() => {
                  resolveClick(true);
                }, scrollConfig.waitAfterClick);
                
              } catch (clickError) {
                console.error("Error clicking button:", clickError);
                resolveClick(false);
              }
            }, scrollConfig.buttonClickDelay);
          });
        };

        // Function to wait for new content
        const waitForNewContent = () => {
          return new Promise((resolveWait) => {
            const startCount = getCurrentElementCount();
            const checkForChanges = () => {
              const currentCount = getCurrentElementCount();
              
              if (currentCount > startCount) {
                if (scrollConfig.enableLogging) {
                  console.log(`New elements detected: ${startCount} -> ${currentCount}`);
                }
                waitCycles = 0;
                resolveWait(true);
                return;
              }
              
              waitCycles++;
              if (waitCycles >= scrollConfig.maxWaitCycles) {
                if (scrollConfig.enableLogging) {
                  console.log(`Max wait cycles reached, no new content`);
                }
                resolveWait(false);
                return;
              }
              
              setTimeout(checkForChanges, scrollConfig.waitForContentChange / scrollConfig.maxWaitCycles);
            };
            
            checkForChanges();
          });
        };

        // Main scroll and action logic
        const performScrollCycle = async () => {
          try {
            const currentElementCount = getCurrentElementCount();
            const targetReached = currentElementCount >= targetElementCount;
            
            // Check if max attempts reached
            if (scrollAttempts >= scrollConfig.maxScrollAttempts) {
              clearTimeout(timeoutId);
              const reason = targetReached ? 'max_attempts_target_met' : 'max_attempts_target_not_met';
              console.log(`Completed: Max attempts (${scrollConfig.maxScrollAttempts}) reached. Found ${currentElementCount}/${targetElementCount} elements.`);
              
              resolve({
                success: targetReached,
                finalCount: currentElementCount,
                targetCount: targetElementCount,
                scrollAttempts: scrollAttempts,
                buttonClicks: buttonClickCount,
                reason: reason,
                targetReached: targetReached
              });
              return;
            }

            // Log progress
            if (scrollConfig.enableLogging && scrollAttempts % scrollConfig.checkInterval === 0) {
              const status = targetReached ? '✓ TARGET REACHED, continuing' : 'searching';
              console.log(`Progress: ${currentElementCount}/${targetElementCount} elements (attempt ${scrollAttempts}, ${buttonClickCount} button clicks) - ${status}`);
            }

            // Check if we're at bottom or should look for buttons
            const atBottom = isAtBottom();
            
            if (atBottom || scrollConfig.prioritizeButtons) {
              consecutiveBottomReached++;
              
              // Look for show more button first
              const showMoreButton = findShowMoreButton();
              
              if (showMoreButton) {
                isWaitingForContent = true;
                const clickSuccess = await clickShowMoreButton(showMoreButton);
                isWaitingForContent = false;
                
                if (clickSuccess) {
                  // Update element count after click
                  const newCount = getCurrentElementCount();
                  if (newCount > lastElementCount) {
                    lastElementCount = newCount;
                    consecutiveBottomReached = 0;
                  }
                  
                  // Check if target reached after button click
                  if (newCount >= targetElementCount) {
                    clearTimeout(timeoutId);
                    console.log(`Target reached after button click: ${newCount}/${targetElementCount} elements`);
                    resolve({
                      success: true,
                      finalCount: newCount,
                      targetCount: targetElementCount,
                      scrollAttempts: scrollAttempts,
                      buttonClicks: buttonClickCount,
                      reason: 'target_reached_via_button',
                      targetReached: true
                    });
                    return;
                  }
                }
              } else if (atBottom) {
                // No button found and at bottom
                if (consecutiveBottomReached >= scrollConfig.maxConsecutiveBottomReached) {
                  // Wait for potential new content one last time
                  const hasNewContent = await waitForNewContent();
                  
                  if (!hasNewContent) {
                    clearTimeout(timeoutId);
                    const finalCount = getCurrentElementCount();
                    const success = finalCount >= targetElementCount;
                    const reason = success ? 'bottom_reached_target_met' : 'bottom_reached_target_not_met';
                    
                    console.log(`Completed: Reached bottom. Found ${finalCount}/${targetElementCount} elements. Target ${success ? 'achieved' : 'not achieved'}.`);
                    resolve({
                      success: success,
                      finalCount: finalCount,
                      targetCount: targetElementCount,
                      scrollAttempts: scrollAttempts,
                      buttonClicks: buttonClickCount,
                      reason: reason,
                      targetReached: success
                    });
                    return;
                  }
                }
              }
            } else {
              consecutiveBottomReached = 0;
            }

            // Update tracking
            if (currentElementCount > lastElementCount) {
              lastElementCount = currentElementCount;
            }

            // Perform scroll if enabled and not waiting
            if (scrollConfig.enableScrolling && !isWaitingForContent) {
              window.scrollBy(0, scrollConfig.scrollDistance);
            }
            
            scrollAttempts++;

            // Schedule next cycle
            setTimeout(() => performScrollCycle(), scrollConfig.scrollSpeed);
            
          } catch (error) {
            clearTimeout(timeoutId);
            reject(error);
          }
        };

        // Initialize
        lastElementCount = getCurrentElementCount();
        
        if (scrollConfig.enableLogging) {
          console.log(`Starting combined scroll: looking for ${targetElementCount} elements with selector "${elementSelector}"`);
          console.log(`Show more button selector: "${showMoreSel}"`);
          console.log(`Initial count: ${lastElementCount} elements found`);
        }
        
        // Check if target already reached
        if (lastElementCount >= targetElementCount) {
          if (scrollConfig.enableLogging) {
            console.log(`Target already reached: ${lastElementCount}/${targetElementCount} elements found!`);
          }
          clearTimeout(timeoutId);
          resolve({
            success: true,
            finalCount: lastElementCount,
            targetCount: targetElementCount,
            scrollAttempts: 0,
            buttonClicks: 0,
            reason: 'target_already_met',
            targetReached: true
          });
          return;
        }
        
        // Start the process
        performScrollCycle();
      });
    }, config, selector, targetCount, showMoreSelector);

    // Wait for any remaining network requests
    if (pendingRequests.size > 0) {
      if (config.enableLogging) {
        console.log('Waiting for final network requests...');
      }
      
      await new Promise((resolve) => {
        const checkNetworkIdle = () => {
          if (pendingRequests.size === 0) {
            resolve();
          } else {
            setTimeout(checkNetworkIdle, 100);
          }
        };
        setTimeout(checkNetworkIdle, 1000);
      });
    }
    
    console.log('Combined scroll with show more completed successfully');
    console.log(`Final result: ${result.success ? 'SUCCESS' : 'INCOMPLETE'} - Found ${result.finalCount}/${result.targetCount} elements with ${result.buttonClicks} button clicks`);
    
    return result;
    
  } catch (error) {
    console.error('Combined scroll with show more failed:', error.message);
    throw error;
  }
}