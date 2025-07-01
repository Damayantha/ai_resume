import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.14.1";

// --- CONFIGURATION ---
const API_KEY = "AIzaSyCOazVWmFYlCyeed1S1H-PrFDIFrNml_hY"; // Replace with your actual key
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// --- DOM ELEMENTS ---
const resumeForm = document.getElementById('resume-form');
const generateBtn = document.getElementById('generate-btn');
const generateBtnText = document.getElementById('generate-btn-text');
const loadingSpinner = document.getElementById('loading-spinner');
const resumeIframe = document.getElementById('resume-iframe');
const resumePlaceholder = document.getElementById('resume-placeholder');
const resumeLoaderOverlay = document.getElementById('resume-loader-overlay');
const resumeLoaderText = document.getElementById('resume-loader-text');
const downloadPdfBtn = document.getElementById('download-pdf-btn');
const demoDataBtn = document.getElementById('demo-data-btn');
const addExperienceBtn = document.getElementById('add-experience-btn');
const experienceFields = document.getElementById('experience-fields');
const addEducationBtn = document.getElementById('add-education-btn');
const educationFields = document.getElementById('education-fields');
const resumeStyleSelect = document.getElementById('resume-style');
const styleDescription = document.getElementById('style-description');
const chatInterface = document.getElementById('chat-interface');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatHistory = document.getElementById('chat-history');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatSendText = document.getElementById('chat-send-text');
const chatLoading = document.getElementById('chat-loading');

// --- STATE ---
let currentResumeHtml = '';

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  addExperienceBlock();
  addEducationBlock();
  updateStylePreview();
  const savedData = localStorage.getItem('resumeFormData');
  if (savedData) { loadSavedData(JSON.parse(savedData)); }
  setupAutoSave();
  if (API_KEY.includes("YOUR") || API_KEY.length < 39) { showToast('Please add a valid Gemini API key in js/app.js', 'error'); }
});

// --- EVENT LISTENERS ---
resumeForm.addEventListener('submit', handleGenerateResume);
demoDataBtn.addEventListener('click', populateWithDemoData);
addExperienceBtn.addEventListener('click', () => addExperienceBlock());
addEducationBtn.addEventListener('click', () => addEducationBlock());
downloadPdfBtn.addEventListener('click', downloadAsPDF);
resumeStyleSelect.addEventListener('change', updateStylePreview);
chatForm.addEventListener('submit', handleChatRequest);

// --- STYLE PREVIEW ---
const styleDescriptions = {
  modern: 'A balanced, single-column layout using modern sans-serif fonts and clear section breaks.',
  creative: 'A dynamic two-column layout. Ideal for designers and roles where visual presentation matters.',
  corporate: 'A clean, professional layout with a colored header bar for a strong corporate identity.',
  elegant: 'A refined, minimalist design using serif fonts and sophisticated spacing for a high-end feel.'
};
function updateStylePreview() {
  const selectedStyle = resumeStyleSelect.value;
  styleDescription.textContent = styleDescriptions[selectedStyle] || 'Select a layout to see a description.';
}

// --- TOAST NOTIFICATION SYSTEM ---
function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toast-container');
  const toast = document.createElement('div');
  const typeClasses = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' };
  toast.className = `no-print ${typeClasses[type]} text-white px-6 py-3 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.classList.remove('translate-x-full'), 100);
  setTimeout(() => {
    toast.classList.add('translate-x-full');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 3500);
}

// --- CORE AI & UI FUNCTIONS ---
async function handleGenerateResume(e) {
  e.preventDefault();
  setLoadingState(true);
  showResumeLoader('Enhancing descriptions...');
  try {
    const formData = getFormData();
    if (!formData.fullName || !formData.email) {
      showToast('Please fill in at least Full Name and Email.', 'error');
      throw new Error("Missing required fields");
    }
    const enhancedExperiences = await Promise.all(
      formData.experiences.map(exp => enhanceDescriptionWithAI(exp, formData.targetJobDescription))
    );
    formData.experiences = enhancedExperiences;
    showResumeLoader('Assembling resume...');
    const prompt = createInitialPrompt(formData);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    currentResumeHtml = cleanHtml(text);
    updateIframeContent(currentResumeHtml);
    downloadPdfBtn.disabled = false;
    chatInterface.classList.remove('hidden');
    addMessageToChat('AI', 'Your resume is ready! How can I help you refine it?');
    showToast('Resume generated successfully!', 'success');
  } catch (error) {
    console.error("Error generating resume:", error);
    if (error.message !== "Missing required fields") {
      updateIframeContent(`<div class="p-8 text-red-500"><strong>Error:</strong> Failed to generate resume. Check API key and console.</div>`);
      showToast('Failed to generate resume. See console.', 'error');
    }
  } finally {
    setLoadingState(false);
    hideResumeLoader();
  }
}

async function enhanceDescriptionWithAI(experience, targetJobDescription) {
  if (!experience.description) return experience;
  const prompt = `You are an expert resume writer. Rewrite the following raw job description to be a professional, action-oriented list of 3-5 bullet points. If a target job description is provided, tailor the bullet points with relevant keywords from it.
    **RAW DESCRIPTION FROM USER:** "${experience.description}"
    **TARGET JOB DESCRIPTION (for keywords):** "${targetJobDescription || 'None provided. Focus on general professional language.'}"
    **CRITICAL INSTRUCTIONS:**
    1. Start each bullet point with a strong action verb (e.g., "Architected", "Led", "Engineered", "Implemented").
    2. Quantify achievements with numbers where possible (e.g., "increased efficiency by 30%", "managed a team of 5").
    3. Output ONLY the rewritten bullet points, each on a new line starting with a hyphen. Do NOT include any other text, titles, or explanations.`;
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const enhancedText = response.text();
    experience.description = enhancedText.split('\n').map(line => line.replace(/^- /, '').trim()).join('. ');
    return experience;
  } catch (error) {
    console.error("Error enhancing description for:", experience.jobTitle, error);
    return experience;
  }
}


async function handleChatRequest(e) {
  e.preventDefault();
  const userRequest = chatInput.value.trim();
  if (!userRequest || !currentResumeHtml) return;
  setChatLoadingState(true);
  addMessageToChat('You', userRequest);
  chatInput.value = '';
  showResumeLoader('Refining with AI...');
  try {
    const prompt = createChatPrompt(currentResumeHtml, userRequest);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const newHtml = response.text();
    currentResumeHtml = cleanHtml(newHtml);
    updateIframeContent(currentResumeHtml);
    addMessageToChat('AI', 'I have updated your resume based on your request.');
    showToast('Resume updated!', 'success');
  } catch (error) {
    console.error("Error in chat:", error);
    addMessageToChat('AI', 'Sorry, I encountered an error. Please try again.');
    showToast('Failed to update resume. See console.', 'error');
  } finally {
    setChatLoadingState(false);
    hideResumeLoader();
  }
}

function updateIframeContent(htmlContent) {
  // We add the zoom style here for the preview iframe only.
  // The actual `currentResumeHtml` variable does NOT have the zoom.
  const previewHtml = htmlContent.replace(
    '<style>',
    '<style>html { zoom: 0.65; }'
  );
  resumeIframe.srcdoc = previewHtml;
  resumePlaceholder.classList.add('hidden');
  resumeIframe.classList.remove('hidden');
}

// --- PROMPT ENGINEERING ---
function createInitialPrompt(data) {
  const themeColors = {
    blue: { primary: '#2563eb', accent: '#dbeafe', text: 'text-white' },
    black: { primary: '#1f2937', accent: '#f3f4f6', text: 'text-white' },
    green: { primary: '#059669', accent: '#d1fae5', text: 'text-white' },
    purple: { primary: '#7c3aed', accent: '#ede9fe', text: 'text-white' },
    navy: { primary: '#1e3a8a', accent: '#dbeafe', text: 'text-white' },
  };
  const selectedTheme = themeColors[data.colorTheme];

  const generateBulletPoints = (desc) => {
    if (!desc) return '';
    return desc.split('.').filter(s => s.trim().length > 0).map(sentence => `<li>${sentence.trim()}.</li>`).join('\n');
  };

  const experienceHTML = data.experiences.map(exp => `<div class="mb-6 break-inside-avoid"><h3 class="text-lg font-semibold">${exp.jobTitle || ''}</h3><p class="text-md text-gray-700">${exp.company || ''} | ${exp.location || ''}</p><p class="text-sm text-gray-500 mb-2">${exp.dates || ''}</p><ul class="list-disc list-inside space-y-1 text-gray-600">${generateBulletPoints(exp.description)}</ul></div>`).join('');
  const educationHTML = data.educations.map(edu => `<div class="mb-4 break-inside-avoid"><h3 class="text-md font-semibold">${edu.degree || ''}</h3><p class="text-sm text-gray-700">${edu.school || ''}</p><p class="text-xs text-gray-500">${edu.location || ''} | ${edu.dates || ''}</p></div>`).join('');
  const skillsHTML = data.skills.split(',').map(skill => `<span class="inline-block px-3 py-1 text-sm font-medium rounded-full" style="background-color:${selectedTheme.accent}; color:${selectedTheme.primary};">${skill.trim()}</span>`).join('\n');

  const contactBlock = `<div class="space-y-3 text-sm break-words"><div class="flex items-start"><i class="fa-solid fa-envelope icon" style="color:${selectedTheme.primary};"></i><span>${data.email}</span></div><div class="flex items-start"><i class="fa-solid fa-phone icon" style="color:${selectedTheme.primary};"></i><span>${data.phone}</span></div><div class="flex items-start"><i class="fa-brands fa-linkedin icon" style="color:${selectedTheme.primary};"></i><span>${data.linkedin ? data.linkedin.replace(/https?:\/\//, '') : ''}</span></div></div>`;
  const sectionTitle = (title) => `<h2 class="text-xl font-bold mb-4 border-b-2 pb-2" style="border-color:${selectedTheme.primary}; color:${selectedTheme.primary};">${title}</h2>`;

  const templates = {
    creative: `<main class="paper"><div class="grid grid-cols-12 h-full"><aside class="col-span-4 bg-gray-50 p-8 space-y-8">${sectionTitle('Contact')}${contactBlock}${sectionTitle('Education')}${educationHTML}${sectionTitle('Skills')}<div class="flex flex-wrap gap-2">${skillsHTML}</div></aside><section class="col-span-8 p-8"><div class="mb-8"><h1 class="text-5xl font-bold">${data.fullName}</h1><p class="text-2xl font-light text-gray-600 mt-1"><!-- [AI_TITLE] --></p></div><div class="space-y-8">${sectionTitle('Professional Summary')}<p><!-- [AI_SUMMARY] --></p>${sectionTitle('Work Experience')}${experienceHTML}</div></section></div></main>`,
    modern: `<main class="paper p-10"><header class="text-center mb-10 border-b pb-6"><h1 class="text-5xl font-bold">${data.fullName}</h1><p class="text-2xl font-light text-gray-600 mt-1"><!-- [AI_TITLE] --></p><div class="flex justify-center items-center gap-x-6 mt-4 text-sm">${contactBlock}</div></header><div class="space-y-8">${sectionTitle('Professional Summary')}<p><!-- [AI_SUMMARY] --></p>${sectionTitle('Work Experience')}${experienceHTML}${sectionTitle('Education')}${educationHTML}${sectionTitle('Skills')}<div class="flex flex-wrap gap-2">${skillsHTML}</div></div></main>`,
    corporate: `<main class="paper"><header class="p-8 ${selectedTheme.text}" style="background-color:${selectedTheme.primary};"><h1 class="text-5xl font-bold">${data.fullName}</h1><p class="text-2xl font-light opacity-90 mt-1"><!-- [AI_TITLE] --></p></header><div class="p-8 grid grid-cols-12 gap-8"><section class="col-span-8 space-y-8">${sectionTitle('Professional Summary')}<p><!-- [AI_SUMMARY] --></p>${sectionTitle('Work Experience')}${experienceHTML}</section><aside class="col-span-4 space-y-8">${sectionTitle('Contact')}${contactBlock}${sectionTitle('Education')}${educationHTML}${sectionTitle('Skills')}<div class="flex flex-wrap gap-2">${skillsHTML}</div></aside></div></main>`,
    elegant: `<main class="paper p-12 text-gray-700"><header class="text-center mb-12"><h1 class="text-6xl font-bold tracking-widest">${data.fullName.toUpperCase()}</h1><p class="text-xl tracking-widest text-gray-500 mt-2"><!-- [AI_TITLE] --></p></header><hr class="mb-12"><div class="space-y-10">${sectionTitle('Professional Summary')}<p><!-- [AI_SUMMARY] --></p>${sectionTitle('Work Experience')}${experienceHTML}<div class="grid grid-cols-2 gap-10"><div>${sectionTitle('Education')}${educationHTML}</div><div>${sectionTitle('Skills')}<div class="flex flex-wrap gap-2">${skillsHTML}</div></div></div><hr class="mt-12"><div class="text-center text-xs text-gray-400 mt-4">${contactBlock}</div></div></main>`
  };

  // UPDATED: Reduced padding from 20mm to 10mm and removed excessive body margin
  const finalTemplate = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${data.fullName} | Resume</title><script src="https://cdn.tailwindcss.com"></script><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"><link rel="stylesheet" href="/css/style.css"><link href="https://fonts.googleapis.com/css2?family=${data.fontFamily.replace(/ /g, '+')}:wght@400;500;700&display=swap" rel="stylesheet">
    <style>body { background-color: white; margin: 0; padding: 0; } .paper { width: 210mm; min-height: 297mm; padding: 10mm; margin: 0; background-color: white; }</style>
    </head><body style="font-family: '${data.fontFamily}', sans-serif;">${templates[data.resumeStyle]}</body></html>`;

  return `You are an AI assistant that populates an HTML template.
      **Tasks:**
      1.  **Professional Summary:** Based on the experience provided and the target job description, write a compelling 2-3 sentence professional summary.
      2.  **Professional Title:** Based on the most recent job title ("${data.experiences[0]?.jobTitle || 'Professional'}"), create a short, professional title.

      **Instructions:**
      1. Take the AI-generated content.
      2. Find the placeholders \`<!-- [AI_SUMMARY] -->\` and \`<!-- [AI_TITLE] -->\` in the template.
      3. Replace them with the generated content.
      4. Return the **ENTIRE, POPULATED** HTML file. Do not change the structure or add any text before \`<!DOCTYPE html>\` or after \`</html>\`.

      **Template to Populate:**
      \`\`\`html
      ${finalTemplate}
      \`\`\`
    `;
}

async function downloadAsPDF() {
  if (!currentResumeHtml) {
    showToast('Please generate a resume first.', 'error');
    return;
  }

  downloadPdfBtn.disabled = true;
  downloadPdfBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Preparing...';

  const API_ENDPOINT = 'https://resume-pdf-generator-551210772147.us-central1.run.app/generate-pdf';
  const TEST_ENDPOINT = 'https://resume-pdf-generator-551210772147.us-central1.run.app/test-html';

  try {
    const formData = getFormData();

    // FIX: Create a unique filename with a timestamp
    const now = new Date();
    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
    const filename = `${formData.fullName.replace(/ /g, '_')}_Resume_${timestamp}.pdf`;

    console.log('Starting PDF generation...');
    console.log('HTML content length:', currentResumeHtml.length);

    // Test the HTML validity
    try {
      const testResponse = await fetch(TEST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: currentResumeHtml, filename: filename }),
      });
      if (testResponse.ok) {
        const testResult = await testResponse.json();
        console.log('HTML test result:', testResult);
      }
    } catch (testError) {
      console.warn('HTML test failed, but continuing with PDF generation:', testError);
    }

    // Generate the actual PDF
    console.log('Generating PDF...');
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: currentResumeHtml, filename: filename }),
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error response:', errorText);
      throw new Error(`Server error: ${response.statusText} - ${errorText}`);
    }

    const blob = await response.blob();
    console.log('PDF blob size:', blob.size);

    if (blob.size === 0) {
      throw new Error('Received empty PDF file');
    }

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();

    showToast('PDF download started!', 'success');
  } catch (error) {
    console.error('Error downloading PDF:', error);
    console.error('Error stack:', error.stack);
    showToast(`Failed to download PDF: ${error.message}`, 'error');
  } finally {
    downloadPdfBtn.disabled = false;
    downloadPdfBtn.innerHTML = '<i class="fa-solid fa-file-pdf mr-2"></i>Download PDF';
  }
}

// Add this helper function to manually test the HTML content
window.debugResumeHtml = function() {
  console.log('Current resume HTML:');
  console.log(currentResumeHtml);
  console.log('HTML length:', currentResumeHtml?.length || 0);

  if (currentResumeHtml) {
    // Create a test window to see how the HTML renders
    const testWindow = window.open('', '_blank');
    testWindow.document.write(currentResumeHtml);
    testWindow.document.close();
  }
};

function createChatPrompt(currentHtml, request) {
  return `You are an AI assistant that modifies an HTML resume. The user wants to change this: "${request}".
    Current HTML: \`\`\`html${currentHtml}\`\`\`
    Instructions: Analyze the request and the HTML. Modify the content inside the HTML tags to satisfy the request. Return ONLY the raw, full, updated HTML code. Maintain the exact same HTML structure, head, and body tags.`;
}

// --- DATA & FORM HANDLING ---
function getFormData() {
  const experiences = Array.from(document.querySelectorAll('.experience-block')).map(b => ({ jobTitle: b.querySelector('[name="jobTitle"]').value, company: b.querySelector('[name="company"]').value, location: b.querySelector('[name="location"]').value, dates: b.querySelector('[name="dates"]').value, description: b.querySelector('[name="description"]').value })).filter(e => e.jobTitle || e.company);
  const educations = Array.from(document.querySelectorAll('.education-block')).map(b => ({ school: b.querySelector('[name="school"]').value, degree: b.querySelector('[name="degree"]').value, location: b.querySelector('[name="location"]').value, dates: b.querySelector('[name="dates"]').value })).filter(e => e.school || e.degree);
  return { fullName: document.getElementById('fullName').value, email: document.getElementById('email').value, phone: document.getElementById('phone').value, linkedin: document.getElementById('linkedin').value, summary: document.getElementById('summary').value, skills: document.getElementById('skills').value, resumeStyle: document.getElementById('resume-style').value, colorTheme: document.getElementById('color-theme').value, fontFamily: document.getElementById('font-family').value, experiences, educations, targetJobDescription: document.getElementById('target-job-description').value };
}


function populateWithDemoData() {
  const demoData = { fullName: 'Sarah Johnson', email: 'sarah.johnson@email.com', phone: '+1 (555) 123-4567', linkedin: 'https://linkedin.com/in/sarahjohnson', summary: '', skills: 'React, TypeScript, Node.js, Python, AWS, Docker, Kubernetes, GraphQL', resumeStyle: 'corporate', colorTheme: 'blue', fontFamily: 'Lato', targetJobDescription: 'Seeking a Senior Software Engineer with a strong background in full-stack development and architectural design. Proven ability to lead complex projects, optimize system performance, and mentor development teams, delivering high-impact solutions for large user bases. Expertise in modern full-stack technologies including React, TypeScript, Node.js, and GraphQL, with a demonstrated ability to optimize system performance and enhance code quality and efficiency.', experiences: [{jobTitle: 'Senior Software Engineer', company: 'TechFlow Solutions', location: 'San Francisco, CA', dates: 'Mar 2021 - Present', description: 'Led the development and deployment of a high-performance, customer-facing dashboard serving over 100,000 users, utilizing React and TypeScript. Architected and implemented a scalable microservices backend with Node.js and GraphQL, resulting in a 40% reduction in API response times. Mentored a team of 4 junior developers, establishing and enforcing code review best practices to enhance overall code quality and team efficiency.'}], educations: [{school: 'Stanford University', degree: 'M.S. in Computer Science', location: 'Stanford, CA', dates: '2017 - 2019'}] };
  loadSavedData(demoData);
  showToast('Demo data loaded!', 'success');
}

function addExperienceBlock(title = '', company = '', location = '', dates = '', desc = '') {
  const block = document.createElement('div');
  block.className = 'experience-block bg-white/5 border border-white/10 rounded-lg p-4 space-y-3';
  block.innerHTML = `<div class="flex justify-between items-center"><h4 class="font-medium text-white">Experience Entry</h4><button type="button" class="text-red-400 hover:text-red-300 text-sm no-print" onclick="this.closest('.experience-block').remove()">Remove</button></div><div class="grid grid-cols-1 md:grid-cols-2 gap-3"><input type="text" name="jobTitle" placeholder="Job Title" class="w-full px-3 py-2 bg-white/10 border-white/20 rounded-lg text-white placeholder-gray-400 input-focus text-sm" value="${title}"><input type="text" name="company" placeholder="Company" class="w-full px-3 py-2 bg-white/10 border-white/20 rounded-lg text-white placeholder-gray-400 input-focus text-sm" value="${company}"></div><div class="grid grid-cols-1 md:grid-cols-2 gap-3"><input type="text" name="location" placeholder="Location (e.g., City, ST)" class="w-full px-3 py-2 bg-white/10 border-white/20 rounded-lg text-white placeholder-gray-400 input-focus text-sm" value="${location}"><input type="text" name="dates" placeholder="Dates (e.g., Jan 2022 - Present)" class="w-full px-3 py-2 bg-white/10 border-white/20 rounded-lg text-white placeholder-gray-400 input-focus text-sm" value="${dates}"></div><textarea name="description" placeholder="Enter key responsibilities and achievements here. The AI will rewrite them for you." class="w-full px-3 py-2 bg-white/10 border-white/20 rounded-lg text-white placeholder-gray-400 input-focus h-20 resize-none text-sm">${desc}</textarea>`;
  experienceFields.appendChild(block);
}

function addEducationBlock(school = '', degree = '', location = '', dates = '') {
  const block = document.createElement('div');
  block.className = 'education-block bg-white/5 border border-white/10 rounded-lg p-4 space-y-3';
  block.innerHTML = `<div class="flex justify-between items-center"><h4 class="font-medium text-white">Education Entry</h4><button type="button" class="text-red-400 hover:text-red-300 text-sm no-print" onclick="this.closest('.education-block').remove()">Remove</button></div><div class="grid grid-cols-1 md:grid-cols-2 gap-3"><input type="text" name="school" placeholder="School / University" class="w-full px-3 py-2 bg-white/10 border-white/20 rounded-lg text-white placeholder-gray-400 input-focus text-sm" value="${school}"><input type="text" name="degree" placeholder="Degree (e.g., B.S. in CompSci)" class="w-full px-3 py-2 bg-white/10 border-white/20 rounded-lg text-white placeholder-gray-400 input-focus text-sm" value="${degree}"></div><div class="grid grid-cols-1 md:grid-cols-2 gap-3"><input type="text" name="location" placeholder="Location (e.g., City, ST)" class="w-full px-3 py-2 bg-white/10 border-white/20 rounded-lg text-white placeholder-gray-400 input-focus text-sm" value="${location}"><input type="text" name="dates" placeholder="Graduation Date (e.g., May 2022)" class="w-full px-3 py-2 bg-white/10 border-white/20 rounded-lg text-white placeholder-gray-400 input-focus text-sm" value="${dates}"></div>`;
  educationFields.appendChild(block);
}



function addMessageToChat(sender, message) {
  const messageElement = document.createElement('div');
  const isUser = sender === 'You';
  messageElement.className = `flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 chat-message animate-slide-up`;
  messageElement.innerHTML = `<div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isUser ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-200'} text-sm shadow"><div class="font-semibold text-xs mb-1 ${isUser ? 'text-blue-100' : 'text-gray-400'}">${sender}</div><div>${message.replace(/\n/g, '<br>')}</div></div>`;
  chatHistory.appendChild(messageElement);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function setLoadingState(isLoading) { generateBtn.disabled = isLoading; generateBtnText.classList.toggle('hidden', isLoading); loadingSpinner.classList.toggle('hidden', !isLoading); }
function setChatLoadingState(isLoading) { chatSendBtn.disabled = isLoading; chatInput.disabled = isLoading; chatSendText.classList.toggle('hidden', isLoading); chatLoading.classList.toggle('hidden', !isLoading); }
function showResumeLoader(text = 'Updating...') { resumeLoaderOverlay.style.opacity = '1'; resumeLoaderOverlay.classList.remove('hidden'); resumeLoaderText.textContent = text; }
function hideResumeLoader() { resumeLoaderOverlay.style.opacity = '0'; setTimeout(()=> resumeLoaderOverlay.classList.add('hidden'), 300); }
function cleanHtml(html) { return html.replace(/^```html\s*/, '').replace(/```$/, '').trim(); }

let autoSaveTimeout;
function setupAutoSave() {
  resumeForm.addEventListener('input', () => { clearTimeout(autoSaveTimeout); autoSaveTimeout = setTimeout(() => { localStorage.setItem('resumeFormData', JSON.stringify(getFormData())); }, 1500); });
}
function loadSavedData(data) {
  Object.keys(data).forEach(key => { const element = document.getElementById(key); if (element && typeof data[key] === 'string') { element.value = data[key]; } });
  experienceFields.innerHTML = ''; educationFields.innerHTML = '';
  data.experiences?.forEach(e => addExperienceBlock(e.jobTitle, e.company, e.location, e.dates, e.description));
  data.educations?.forEach(e => addEducationBlock(e.school, e.degree, e.location, e.dates));
  if (experienceFields.children.length === 0) addExperienceBlock();
  if (educationFields.children.length === 0) addEducationBlock();
  updateStylePreview();
}
