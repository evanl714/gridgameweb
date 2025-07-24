// Debug script to test grid rendering state
import http from 'http';
import fs from 'fs';

// Simple HTTP request to check if server is running
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    // Check for key elements in the HTML
    const hasGameBoard = data.includes('id="gameBoard"');
    const hasGameCanvas = data.includes('id="gameCanvas"');
    const hasGridCellClass = data.includes('grid-cell');
    const hasResourceNodes = data.includes('resource-node');

    console.log('\n=== GRID STATE ANALYSIS ===');
    console.log(`Server Response: ${res.statusCode === 200 ? 'OK' : 'ERROR'}`);
    console.log(`Has gameBoard element: ${hasGameBoard}`);
    console.log(`Has gameCanvas element: ${hasGameCanvas}`);
    console.log(`Has grid-cell CSS class: ${hasGridCellClass}`);
    console.log(`Has resource-node CSS class: ${hasResourceNodes}`);

    // Check for specific grid generation code
    const hasGridGeneration = data.includes('Generate 625 grid cells');
    const hasResourcePositions = data.includes('resourcePositions');
    const hasGameJS = data.includes('src="game.js"');

    console.log(`Has grid generation code: ${hasGridGeneration}`);
    console.log(`Has resource positions: ${hasResourcePositions}`);
    console.log(`Has game.js import: ${hasGameJS}`);

    // Check for potential issues
    const hasCanvasHidden = data.includes('display: none');
    const hasGridAdapter = data.includes('initializeGridAdapter');

    console.log(`Canvas is hidden: ${hasCanvasHidden}`);
    console.log(`Has grid adapter code: ${hasGridAdapter}`);

    // Save response for detailed analysis
    fs.writeFileSync('/Users/evanluchs/gridgameweb/debug-response.html', data);
    console.log('\nFull HTML response saved to debug-response.html');

    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
  console.log('Server may not be running on localhost:3000');
  process.exit(1);
});

req.end();
