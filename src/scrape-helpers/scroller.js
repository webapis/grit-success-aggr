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

  
export async function autoScroll(page, options = {}) {
  // Default configuration
  const config = {
    scrollSpeed: options.scrollSpeed || 100,
    scrollDistance: options.scrollDistance || 100,
    maxScrollAttempts: options.maxScrollAttempts || 50,
    timeout: options.timeout || 30000, // 30 seconds
    waitForContent: options.waitForContent || 1000, // Wait 1s for new content
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
        let unchangedScrollCount = 0;
        const maxUnchangedScrolls = 3; // Stop after 3 attempts with no height change
        
        // Set up timeout
        const timeoutId = setTimeout(() => {
          reject(new Error(`Auto-scroll timeout after ${scrollConfig.timeout}ms`));
        }, scrollConfig.timeout);

        const scroll = () => {
          const currentScrollHeight = document.body.scrollHeight;
          const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const windowHeight = window.innerHeight;
          
          // Check if we've reached the bottom
          if (currentScrollTop + windowHeight >= currentScrollHeight - 10) {
            // We're at the bottom, but let's wait a bit for potential new content
            if (currentScrollHeight === lastScrollHeight) {
              unchangedScrollCount++;
              if (unchangedScrollCount >= maxUnchangedScrolls) {
                clearTimeout(timeoutId);
                console.log(`Scroll completed: reached bottom after ${scrollAttempts} scrolls`);
                resolve();
                return;
              }
            } else {
              unchangedScrollCount = 0;
            }
          }

          // Check if we've exceeded max scroll attempts
          if (scrollAttempts >= scrollConfig.maxScrollAttempts) {
            clearTimeout(timeoutId);
            console.log(`Scroll completed: max attempts (${scrollConfig.maxScrollAttempts}) reached`);
            resolve();
            return;
          }

          // Perform scroll
          window.scrollBy(0, scrollConfig.scrollDistance);
          lastScrollHeight = currentScrollHeight;
          scrollAttempts++;

          if (scrollConfig.enableLogging) {
            console.log(`Scroll attempt ${scrollAttempts}: height=${currentScrollHeight}, position=${currentScrollTop}`);
          }

          // Schedule next scroll
          setTimeout(scroll, scrollConfig.scrollSpeed);
        };

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

// Usage examples:
/*
// Basic usage
await autoScroll(page, { scrollSpeed: 200 });

// Advanced usage with custom options
await autoScroll(page, {
  scrollSpeed: 150,
  scrollDistance: 200,
  maxScrollAttempts: 100,
  timeout: 60000,
  enableLogging: true
});
*/
//https://claude.ai/chat/0b4bcff3-a737-49c7-a36c-5505ad587a14
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
export async function scrollWithShowMoreAdvanced(page, scrollSpeed, showMoreSelector, options = {}) {
  const {
    maxAttempts = 50,
    waitAfterClick = 2000,
    maxConsecutiveBottomReached = 5,
    buttonClickDelay = 500,
    enableScrolling = true // New option to control scrolling behavior
  } = options;

  page.on("console", (message) => {
    console.log("Message from Puppeteer page:", message.text());
  });

  await page.evaluate(async (_scrollSpeed, _showMoreSelector, _options) => {
    const {
      _maxAttempts,
      _waitAfterClick,
      _maxConsecutiveBottomReached,
      _buttonClickDelay,
      _enableScrolling
    } = _options;

    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 100;
      let scrollCount = 0;
      let attemptCount = 0;
      let consecutiveBottomReached = 0;
      let isWaitingForContent = false;
      let buttonClickCount = 0;
      
      var timer = setInterval(async () => {
        try {
          // Skip scrolling if we're waiting for content to load
          if (isWaitingForContent) {
            console.log("Waiting for content to load, skipping cycle...");
            return;
          }

          var scrollHeight = document.body.scrollHeight;
          let isAtBottom = false;
          
          if (_enableScrolling) {
            // Scroll down only if scrolling is enabled
            window.scrollBy(0, distance);
            totalHeight += distance;
            scrollCount++;
            console.log(`Scroll: ${scrollCount}, Attempt: ${attemptCount}, Height: ${totalHeight}/${scrollHeight}`);
            
            // Check if we've reached the bottom
            isAtBottom = (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 100;
          } else {
            // If scrolling is disabled, we're always "at bottom" to trigger button search
            isAtBottom = true;
            console.log(`No-scroll mode: Attempt ${attemptCount}, looking for button...`);
          }
          
          attemptCount++;
          
          if (isAtBottom) {
            consecutiveBottomReached++;
            console.log(`${_enableScrolling ? `At bottom (${consecutiveBottomReached}/${_maxConsecutiveBottomReached})` : `Attempt ${consecutiveBottomReached}/${_maxConsecutiveBottomReached}`}, looking for show more button...`);
            
            // Look for show more button
            let showMoreButton = document.querySelector(_showMoreSelector);
            
            // Additional checks for button visibility and interactability
            const isButtonVisible = showMoreButton && 
              showMoreButton.offsetParent !== null && 
              !showMoreButton.disabled &&
              !showMoreButton.classList.contains('disabled') &&
              getComputedStyle(showMoreButton).display !== 'none';
            
            if (isButtonVisible) {
              buttonClickCount++;
              console.log(`Found visible show more button (click #${buttonClickCount}), preparing to click...`);
              
              // Scroll button into view (works in both modes)
              showMoreButton.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'center'
              });
              
              // Set waiting flag
              isWaitingForContent = true;
              
              // Click after delay
              setTimeout(() => {
                try {
                  // Try multiple click methods
                  if (showMoreButton.click) {
                    showMoreButton.click();
                  } else {
                    // Fallback: dispatch click event
                    const clickEvent = new MouseEvent('click', {
                      view: window,
                      bubbles: true,
                      cancelable: true
                    });
                    showMoreButton.dispatchEvent(clickEvent);
                  }
                  
                  console.log("Clicked show more button successfully");
                  
                  // Reset counters after successful click
                  consecutiveBottomReached = 0;
                  
                  // Wait for content to load
                  setTimeout(() => {
                    isWaitingForContent = false;
                    console.log("Ready to continue...");
                  }, _waitAfterClick);
                  
                } catch (clickError) {
                  console.error("Error clicking button:", clickError);
                  isWaitingForContent = false;
                }
              }, _buttonClickDelay);
              
            } else {
              console.log("No visible show more button found");
              
              // If no button found for several consecutive attempts, stop
              if (consecutiveBottomReached >= _maxConsecutiveBottomReached) {
                console.log(`${_enableScrolling ? 'No more content to load' : 'No show more button found after max attempts'}, stopping...`);
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
          console.error("Error during scroll/click operation:", error);
          clearInterval(timer);
          reject(error);
        }
        
      }, _enableScrolling ? _scrollSpeed : _scrollSpeed * 2); // Slower interval when not scrolling
    });
  }, scrollSpeed, showMoreSelector, {
    _maxAttempts: maxAttempts,
    _waitAfterClick: waitAfterClick,
    _maxConsecutiveBottomReached: maxConsecutiveBottomReached,
    _buttonClickDelay: buttonClickDelay,
    _enableScrolling: enableScrolling
  });
}

