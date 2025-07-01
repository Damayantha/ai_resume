import asyncio
import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from playwright.async_api import async_playwright
import io
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the request body structure for validation
class PdfRequest(BaseModel):
  html: str
  filename: str = 'resume.pdf'

# Initialize FastAPI app
app = FastAPI()

# Configure CORS
origins = ["*"]

app.add_middleware(
  CORSMiddleware,
  allow_origins=origins,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

@app.post("/generate-pdf")
async def create_pdf(request: PdfRequest):
  """
  Accepts HTML content in a POST request and returns a PDF file.
  """
  if not request.html:
    raise HTTPException(status_code=400, detail="HTML content is missing.")

  logger.info(f"Received PDF generation request for filename: {request.filename}")
  logger.info(f"HTML content length: {len(request.html)} characters")

  browser = None
  try:
    async with async_playwright() as p:
      logger.info("Launching browser...")

      # Launch a headless Chromium browser with more robust settings
      browser = await p.chromium.launch(
        headless=True,
        args=[
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      )

      logger.info("Browser launched successfully")
      page = await browser.new_page()

      # Set viewport for consistent rendering
      await page.set_viewport_size({"width": 1200, "height": 800})

      logger.info("Setting page content...")

      # Clean and validate HTML
      html_content = request.html.strip()
      if not html_content.startswith('<!DOCTYPE html>'):
        logger.warning("HTML doesn't start with DOCTYPE, adding it...")
        html_content = f'<!DOCTYPE html>\n{html_content}'

      # Set the page content with better error handling
      try:
        await page.set_content(html_content, wait_until='networkidle', timeout=30000)
        logger.info("Page content set successfully")
      except Exception as content_error:
        logger.error(f"Error setting page content: {content_error}")
        # Try with a shorter timeout
        await page.set_content(html_content, wait_until='domcontentloaded', timeout=15000)
        logger.info("Page content set with fallback method")

      # Wait a bit more for any dynamic content
      await page.wait_for_timeout(2000)

      # --- START OF REVISED FIX ---
      # Inject a more comprehensive block of CSS to force the content to fill the page.
      # This overrides centering styles (like flexbox, grid, or margin:auto) and
      # ensures the root elements expand to the full dimensions of the PDF page.
      # We wrap this in @media print as page.pdf() emulates the print media type.
      await page.add_style_tag(content="""
          @media print {
              html, body {
                  height: 100% !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  /* Override flex/grid centering on the body */
                  display: block !important;
              }
              /* Target the main resume container (first element in body) */
              body > *:first-child {
                  margin: 0 !important;
                  width: 100% !important;
                  min-height: 100% !important;
                  /* We use min-height to allow content to flow to a second page if needed */
                  box-sizing: border-box !important;
              }
          }
      """)
      # --- END OF REVISED FIX ---

      logger.info("Generating PDF...")

      # Generate the PDF with NO page margins - this setting is correct and should be kept.
      pdf_buffer = await page.pdf(
        format='A4',
        print_background=True,
        prefer_css_page_size=True,
        margin={
          'top': '0',
          'right': '0',
          'bottom': '0',
          'left': '0'
        }
      )

      logger.info(f"PDF generated successfully, size: {len(pdf_buffer)} bytes")

      await browser.close()
      browser = None

      # Create a streaming response to send the PDF back
      return StreamingResponse(
        io.BytesIO(pdf_buffer),
        media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename="{request.filename}"'}
      )

  except Exception as e:
    error_msg = f"Error generating PDF: {str(e)}"
    logger.error(error_msg)
    logger.error(f"Full traceback: {traceback.format_exc()}")

    if browser:
      try:
        await browser.close()
      except:
        pass

    # Return more specific error information
    raise HTTPException(
      status_code=500,
      detail=f"PDF generation failed: {str(e)}"
    )

@app.get("/")
def read_root():
  return {"status": "ok", "message": "Resume PDF Generation API is running."}

@app.get("/health")
def health_check():
  return {"status": "healthy", "service": "resume-pdf-generator"}

# Add a test endpoint to check if HTML can be processed
@app.post("/test-html")
async def test_html(request: PdfRequest):
  """Test endpoint to validate HTML without generating PDF"""
  try:
    html_length = len(request.html)
    has_doctype = request.html.strip().startswith('<!DOCTYPE html>')

    # Basic HTML validation
    required_tags = ['<html', '<head', '<body']
    missing_tags = [tag for tag in required_tags if tag not in request.html.lower()]

    return {
      "status": "ok",
      "html_length": html_length,
      "has_doctype": has_doctype,
      "missing_tags": missing_tags,
      "preview": request.html[:200] + "..." if html_length > 200 else request.html
    }
  except Exception as e:
    return {"status": "error", "message": str(e)}
