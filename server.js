import express from 'express';
import playwright from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup Express App
const app = express();
const PORT = 3000;

// Handle ES module __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware to serve static files (HTML, CSS, JS) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));
// Middleware to parse large JSON bodies (the HTML from the frontend)
app.use(express.json({ limit: '10mb' }));

// The API endpoint for PDF generation
app.post('/generate-pdf', async (req, res) => {
  const { html, filename } = req.body;

  if (!html) {
    return res.status(400).send('HTML content is missing.');
  }

  let browser;
  try {
    // Launch a headless Chromium browser
    browser = await playwright.chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Set the page content to the HTML received from the frontend
    await page.setContent(html, { waitUntil: 'networkidle' });

    // Generate the PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      // CRITICAL FIX: The margin must be an object, even for zero margins.
      // Setting it to null caused the server to crash.
      margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px'
      }
    });

    // Send the generated PDF back to the client
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename || 'resume.pdf'}`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating PDF with Playwright:', error);
    res.status(500).send('Failed to generate PDF. See server console for details.');
  } finally {
    // Always close the browser instance
    if (browser) {
      await browser.close();
    }
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop.');
});
