import { test, expect } from '@playwright/test';

test.describe('Comprehensive UI Analysis', () => {
  const resolutions = [
    { width: 1920, height: 1080, name: '1920x1080' },
    { width: 1366, height: 768, name: '1366x768' },
    { width: 1280, height: 720, name: '1280x720' }
  ];

  for (const resolution of resolutions) {
    test(`UI Analysis at ${resolution.name}`, async ({ page }) => {
      // Set viewport
      await page.setViewportSize({ width: resolution.width, height: resolution.height });

      // Navigate to the game
      await page.goto('http://localhost:3000');

      // Wait for page to load completely
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      console.log(`\n=== ANALYSIS FOR ${resolution.name} ===`);

      // 1. EMPTY SPACE DETECTION
      console.log('\n1. EMPTY SPACE DETECTION:');

      // Get main container dimensions
      const mainContainer = await page.locator('body').boundingBox();
      console.log(`Total viewport: ${resolution.width}x${resolution.height}`);
      console.log(`Body dimensions: ${mainContainer.width}x${mainContainer.height}`);

      // Game board dimensions
      const gameBoard = await page.locator('#game-board').boundingBox();
      if (gameBoard) {
        console.log(`Game board: ${gameBoard.width}x${gameBoard.height}`);
        console.log(`Game board position: x=${gameBoard.x}, y=${gameBoard.y}`);

        // Calculate available central space
        const availableWidth = resolution.width - 600; // Assuming 300px sidebars
        const availableHeight = resolution.height - 200; // Assuming 100px top/bottom
        const boardUsageWidth = (gameBoard.width / availableWidth * 100).toFixed(1);
        const boardUsageHeight = (gameBoard.height / availableHeight * 100).toFixed(1);
        console.log(`Board uses ${boardUsageWidth}% of available width, ${boardUsageHeight}% of available height`);
      }

      // Left sidebar analysis
      const leftSidebar = await page.locator('.left-sidebar, #left-sidebar, .sidebar-left').first().boundingBox();
      if (leftSidebar) {
        console.log(`Left sidebar: ${leftSidebar.width}x${leftSidebar.height}`);

        // Count content elements in left sidebar
        const leftContentElements = await page.locator('.left-sidebar *, #left-sidebar *, .sidebar-left *').count();
        console.log(`Left sidebar content elements: ${leftContentElements}`);
      }

      // Right sidebar analysis
      const rightSidebar = await page.locator('.right-sidebar, #right-sidebar, .sidebar-right').first().boundingBox();
      if (rightSidebar) {
        console.log(`Right sidebar: ${rightSidebar.width}x${rightSidebar.height}`);

        // Count content elements in right sidebar
        const rightContentElements = await page.locator('.right-sidebar *, #right-sidebar *, .sidebar-right *').count();
        console.log(`Right sidebar content elements: ${rightContentElements}`);

        // Calculate empty space percentage
        const contentHeight = await page.evaluate(() => {
          const sidebar = document.querySelector('.right-sidebar, #right-sidebar, .sidebar-right');
          if (!sidebar) return 0;

          let totalContentHeight = 0;
          const children = sidebar.children;
          for (let child of children) {
            const rect = child.getBoundingClientRect();
            totalContentHeight += rect.height;
          }
          return totalContentHeight;
        });

        if (contentHeight > 0) {
          const emptySpacePercentage = ((rightSidebar.height - contentHeight) / rightSidebar.height * 100).toFixed(1);
          console.log(`Right sidebar empty space: ${emptySpacePercentage}%`);
        }
      }

      // 2. SCROLLING REQUIREMENTS
      console.log('\n2. SCROLLING REQUIREMENTS:');
      const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
      const viewportHeight = resolution.height;
      const needsScrolling = scrollHeight > viewportHeight;
      console.log(`Content height: ${scrollHeight}px, Viewport: ${viewportHeight}px`);
      console.log(`Requires scrolling: ${needsScrolling}`);
      if (needsScrolling) {
        const excessHeight = scrollHeight - viewportHeight;
        console.log(`Excess height requiring scroll: ${excessHeight}px`);
      }

      // 3. CONTRAST ANALYSIS
      console.log('\n3. CONTRAST ANALYSIS:');

      // Get all text elements and their backgrounds
      const contrastIssues = await page.evaluate(() => {
        const issues = [];
        const textElements = document.querySelectorAll('*');

        for (let element of textElements) {
          if (element.textContent && element.textContent.trim()) {
            const styles = window.getComputedStyle(element);
            const color = styles.color;
            const backgroundColor = styles.backgroundColor;

            if (color && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
              issues.push({
                text: element.textContent.trim().substring(0, 50),
                color: color,
                backgroundColor: backgroundColor,
                tagName: element.tagName.toLowerCase()
              });
            }
          }
        }
        return issues.slice(0, 10); // Limit to first 10 for readability
      });

      contrastIssues.forEach((issue, index) => {
        console.log(`Text ${index + 1}: "${issue.text}" | Color: ${issue.color} | Background: ${issue.backgroundColor}`);
      });

      // 4. EMOJI DETECTION
      console.log('\n4. EMOJI DETECTION:');

      const emojiElements = await page.evaluate(() => {
        const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
        const elements = [];

        function checkElement(element) {
          if (element.textContent && emojiRegex.test(element.textContent)) {
            elements.push({
              text: element.textContent,
              tagName: element.tagName.toLowerCase(),
              className: element.className
            });
          }

          for (let child of element.children) {
            checkElement(child);
          }
        }

        checkElement(document.body);
        return elements;
      });

      if (emojiElements.length > 0) {
        console.log(`Found ${emojiElements.length} elements with emojis:`);
        emojiElements.forEach((element, index) => {
          console.log(`Emoji ${index + 1}: "${element.text}" in <${element.tagName}> class="${element.className}"`);
        });
      } else {
        console.log('No emojis detected in the interface');
      }

      // 5. CONTROL LAYOUT ANALYSIS
      console.log('\n5. CONTROL LAYOUT ANALYSIS:');

      // Find all buttons and controls
      const controls = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, input[type="button"], .btn');
        const controlInfo = [];

        buttons.forEach(button => {
          const rect = button.getBoundingClientRect();
          controlInfo.push({
            text: button.textContent || button.value || 'No text',
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            className: button.className
          });
        });

        return controlInfo;
      });

      console.log(`Found ${controls.length} control elements:`);
      controls.forEach((control, index) => {
        console.log(`Control ${index + 1}: "${control.text}" | Position: (${control.x.toFixed(0)}, ${control.y.toFixed(0)}) | Size: ${control.width.toFixed(0)}x${control.height.toFixed(0)}`);
      });

      // Calculate control clustering
      if (controls.length > 1) {
        let totalSpacing = 0;
        let spacingCount = 0;

        for (let i = 0; i < controls.length - 1; i++) {
          for (let j = i + 1; j < controls.length; j++) {
            const distance = Math.sqrt(
              Math.pow(controls[i].x - controls[j].x, 2) +
              Math.pow(controls[i].y - controls[j].y, 2)
            );
            totalSpacing += distance;
            spacingCount++;
          }
        }

        const averageSpacing = totalSpacing / spacingCount;
        console.log(`Average spacing between controls: ${averageSpacing.toFixed(1)}px`);
      }

      // Take full page screenshot
      await page.screenshot({
        path: `ui-analysis-${resolution.name.replace('x', '-')}.png`,
        fullPage: true
      });

      console.log(`Screenshot saved: ui-analysis-${resolution.name.replace('x', '-')}.png`);
    });
  }

  test('Detailed Space Usage Analysis', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\n=== DETAILED SPACE USAGE ANALYSIS ===');

    // Get precise measurements of all major UI sections
    const measurements = await page.evaluate(() => {
      const sections = {
        body: document.body.getBoundingClientRect(),
        gameBoard: document.querySelector('#game-board, .game-board')?.getBoundingClientRect(),
        leftSidebar: document.querySelector('.left-sidebar, #left-sidebar, .sidebar-left')?.getBoundingClientRect(),
        rightSidebar: document.querySelector('.right-sidebar, #right-sidebar, .sidebar-right')?.getBoundingClientRect(),
        header: document.querySelector('header, .header, #header')?.getBoundingClientRect(),
        footer: document.querySelector('footer, .footer, #footer')?.getBoundingClientRect()
      };

      // Calculate actual used vs available space
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };

      return { sections, viewport };
    });

    console.log('\nPRECISE MEASUREMENTS:');
    Object.entries(measurements.sections).forEach(([name, rect]) => {
      if (rect) {
        console.log(`${name}: ${rect.width.toFixed(1)}x${rect.height.toFixed(1)} at (${rect.x.toFixed(1)}, ${rect.y.toFixed(1)})`);
      } else {
        console.log(`${name}: Not found`);
      }
    });

    console.log(`\nViewport: ${measurements.viewport.width}x${measurements.viewport.height}`);

    // Calculate wasted space percentages
    if (measurements.sections.gameBoard) {
      const gameBoard = measurements.sections.gameBoard;
      const availableWidth = measurements.viewport.width -
        (measurements.sections.leftSidebar?.width || 0) -
        (measurements.sections.rightSidebar?.width || 0);
      const availableHeight = measurements.viewport.height -
        (measurements.sections.header?.height || 0) -
        (measurements.sections.footer?.height || 0);

      const widthUsage = (gameBoard.width / availableWidth * 100).toFixed(1);
      const heightUsage = (gameBoard.height / availableHeight * 100).toFixed(1);

      console.log('\nGAME BOARD EFFICIENCY:');
      console.log(`Available space: ${availableWidth.toFixed(1)}x${availableHeight.toFixed(1)}`);
      console.log(`Game board usage: ${widthUsage}% width, ${heightUsage}% height`);
      console.log(`Potential expansion: ${(100 - widthUsage).toFixed(1)}% width, ${(100 - heightUsage).toFixed(1)}% height`);
    }

    // Take a screenshot with element highlighting
    await page.evaluate(() => {
      // Add highlighting to major sections for visual analysis
      const sections = [
        '#game-board, .game-board',
        '.left-sidebar, #left-sidebar, .sidebar-left',
        '.right-sidebar, #right-sidebar, .sidebar-right'
      ];

      sections.forEach((selector, index) => {
        const element = document.querySelector(selector);
        if (element) {
          element.style.outline = `3px solid ${['red', 'blue', 'green'][index]}`;
        }
      });
    });

    await page.screenshot({
      path: 'ui-analysis-highlighted.png',
      fullPage: true
    });

    console.log('Highlighted screenshot saved: ui-analysis-highlighted.png');
  });
});
