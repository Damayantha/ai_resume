// AI Resume Maker - Main Application
// This application uses the Google Gemini API to generate professional resumes
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

class ResumeApp {
  constructor() {
    // IMPORTANT: In a real-world application, this API key should be handled on a secure backend server,
    // not exposed in the frontend client-side code. This is for demonstration purposes only.
    this.apiKey = 'AIzaSyCOazVWmFYlCyeed1S1H-PrFDIFrNml_hY';
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

    this.currentResume = '';
    this.selectedTheme = '#3b82f6';
    this.selectedStyle = 'modern'; // Default style
    this.experienceCount = 0;
    this.educationCount = 0;

    this.init();
  }

  init() {
    this.bindEvents();
    this.addInitialFields();
  }

  bindEvents() {
    document.getElementById('resume-form').addEventListener('submit', (e) => { e.preventDefault(); this.generateResume(); });
    document.getElementById('demo-data-btn').addEventListener('click', () => { this.loadDemoData(); });
    document.getElementById('add-experience-btn').addEventListener('click', () => { this.addExperienceField(); });
    document.getElementById('add-education-btn').addEventListener('click', () => { this.addEducationField(); });
    document.getElementById('download-pdf-btn').addEventListener('click', () => { this.downloadPDF(); });
    document.getElementById('chat-form').addEventListener('submit', (e) => { e.preventDefault(); this.sendChatMessage(); });
    document.getElementById('theme-selector').addEventListener('click', (e) => { if (e.target.closest('.color-swatch')) this.selectTheme(e.target.closest('.color-swatch')); });
    document.getElementById('resume-upload').addEventListener('change', (e) => { this.handleResumeUpload(e); });
    document.getElementById('style-selector').addEventListener('click', (e) => {
      const card = e.target.closest('.style-selector-card');
      if (card) this.selectStyle(card);
    });
  }

  addInitialFields() {
    this.addExperienceField();
    this.addEducationField();
  }

  addExperienceField(data = {}) {
    const container = document.getElementById('experience-fields');
    const id = this.experienceCount++;
    const experienceDiv = document.createElement('div');
    experienceDiv.className = 'space-y-3 p-4 bg-white/5 rounded-lg border border-white/10';
    experienceDiv.innerHTML = `
      <div class="flex justify-between items-center">
          <h4 class="text-white font-medium">Experience ${id + 1}</h4>
          ${id > 0 ? `<button type="button" class="text-red-400 hover:text-red-300 remove-experience"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>` : ''}
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input type="text" name="jobTitle[]" placeholder="Job Title" class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 input-focus text-sm" value="${data.jobTitle || ''}">
          <input type="text" name="company[]" placeholder="Company Name" class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 input-focus text-sm" value="${data.company || ''}">
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input type="text" name="workLocation[]" placeholder="Location" class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 input-focus text-sm" value="${data.location || ''}">
          <input type="text" name="workDuration[]" placeholder="e.g., Jan 2020 - Present" class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 input-focus text-sm" value="${data.duration || ''}">
      </div>
      <div class="relative">
          <textarea name="jobDescription[]" placeholder="Job description and key achievements..." class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 input-focus h-20 resize-none text-sm pr-10">${data.description || ''}</textarea>
          <button type="button" class="enhance-btn" title="Enhance with AI">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
          </button>
      </div>
    `;
    container.appendChild(experienceDiv);

    const removeBtn = experienceDiv.querySelector('.remove-experience');
    if(removeBtn) removeBtn.addEventListener('click', () => experienceDiv.remove());

    const enhanceBtn = experienceDiv.querySelector('.enhance-btn');
    const descriptionTextarea = experienceDiv.querySelector('textarea');
    enhanceBtn.addEventListener('click', () => this.enhanceDescription(descriptionTextarea, enhanceBtn));
  }

  addEducationField(data = {}) {
    const container = document.getElementById('education-fields');
    const id = this.educationCount++;
    const educationDiv = document.createElement('div');
    educationDiv.className = 'space-y-3 p-4 bg-white/5 rounded-lg border border-white/10';
    educationDiv.innerHTML = `
      <div class="flex justify-between items-center">
          <h4 class="text-white font-medium">Education ${id + 1}</h4>
          ${id > 0 ? `<button type="button" class="text-red-400 hover:text-red-300 remove-education"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>` : ''}
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input type="text" name="degree[]" placeholder="Degree/Certification" class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 input-focus text-sm" value="${data.degree || ''}">
          <input type="text" name="institution[]" placeholder="Institution Name" class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 input-focus text-sm" value="${data.institution || ''}">
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input type="text" name="eduLocation[]" placeholder="Location" class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 input-focus text-sm" value="${data.location || ''}">
          <input type="text" name="eduDuration[]" placeholder="e.g., 2018 - 2022" class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 input-focus text-sm" value="${data.duration || ''}">
      </div>
      <input type="text" name="gpa[]" placeholder="GPA or Details (Optional)" class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 input-focus text-sm" value="${data.gpa || ''}">
    `;
    container.appendChild(educationDiv);

    const removeBtn = educationDiv.querySelector('.remove-education');
    if(removeBtn) removeBtn.addEventListener('click', () => educationDiv.remove());
  }

  loadDemoData() {
    this.resetForm();
    document.getElementById('fullName').value = 'Sarah Johnson';
    document.getElementById('email').value = 'sarah.johnson@email.com';
    document.getElementById('phone').value = '+1 (555) 123-4567';
    document.getElementById('linkedin').value = 'https://linkedin.com/in/sarahjohnson';
    document.getElementById('location').value = 'San Francisco, CA';
    document.getElementById('summary').value = 'Results-driven Full Stack Developer with 5+ years of experience building scalable web applications. Expertise in React, Node.js, and cloud technologies. Proven track record of leading cross-functional teams and delivering high-quality solutions that improve user experience and drive business growth.';
    document.getElementById('skills').value = 'JavaScript, React, Node.js, Python, SQL, MongoDB, AWS, Docker, Git, Agile Development, Team Leadership, Problem Solving';

    this.addExperienceField({ jobTitle: 'Senior Full Stack Developer', company: 'TechCorp Solutions', location: 'San Francisco, CA', duration: 'Jan 2021 - Present', description: '- Led development of customer-facing web applications serving 100K+ users.\n- Architected microservices infrastructure resulting in 40% performance improvement.\n- Mentored junior developers and established coding standards.' });
    this.addExperienceField({ jobTitle: 'Full Stack Developer', company: 'Digital Innovations Inc', location: 'San Francisco, CA', duration: 'Jun 2019 - Dec 2020', description: '- Developed and maintained e-commerce platform handling $2M+ in annual transactions.\n- Implemented automated testing reducing bugs by 60%.' });
    this.addEducationField({ degree: 'Bachelor of Science in Computer Science', institution: 'University of California, Berkeley', location: 'Berkeley, CA', duration: '2015 - 2019', gpa: 'GPA: 3.8/4.0, Dean\'s List' });
    document.getElementById('job-description').value = 'We are seeking a Senior Full Stack Developer to join our growing team. The ideal candidate will have experience with modern web technologies including React, Node.js, and cloud platforms. You will be responsible for designing and implementing scalable web applications, mentoring junior developers, and collaborating with cross-functional teams to deliver high-quality solutions.';
    this.showToast('Demo data loaded successfully!', 'success');
  }

  async generateResume() {
    const formData = this.collectFormData();
    if (!this.validateFormData(formData)) {
      this.showToast('Please fill in Full Name, Email, and at least one experience or education entry.', 'error');
      return;
    }
    this.setLoading(true);
    try {
      const prompt = this.createResumePrompt(formData);
      const aiResponse = await this.callGeminiAPI(prompt);
      this.currentResume = aiResponse;
      this.displayResume(aiResponse);
      this.enableDownload();
      this.showChatInterface();
      this.showToast('Resume generated successfully!', 'success');
    } catch (error) {
      console.error('Error generating resume:', error);
      this.displayResume(`<div class="text-red-500 text-center p-4">Sorry, there was an error generating the resume. Please check the console for details.</div>`);
      this.showToast('Failed to generate resume. Please try again.', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  collectFormData() {
    const getValues = (name) => Array.from(document.getElementsByName(name)).map(el => el.value);
    const formData = {
      personalInfo: { fullName: document.getElementById('fullName').value, email: document.getElementById('email').value, phone: document.getElementById('phone').value, linkedin: document.getElementById('linkedin').value, location: document.getElementById('location').value },
      summary: document.getElementById('summary').value,
      skills: document.getElementById('skills').value,
      jobDescription: document.getElementById('job-description').value,
      experience: [], education: []
    };

    const jobTitles = getValues('jobTitle[]');
    for (let i = 0; i < jobTitles.length; i++) {
      if (jobTitles[i] || getValues('company[]')[i]) {
        formData.experience.push({ jobTitle: jobTitles[i], company: getValues('company[]')[i], location: getValues('workLocation[]')[i], duration: getValues('workDuration[]')[i], description: getValues('jobDescription[]')[i] });
      }
    }
    const degrees = getValues('degree[]');
    for (let i = 0; i < degrees.length; i++) {
      if (degrees[i] || getValues('institution[]')[i]) {
        formData.education.push({ degree: degrees[i], institution: getValues('institution[]')[i], location: getValues('eduLocation[]')[i], duration: getValues('eduDuration[]')[i], gpa: getValues('gpa[]')[i] });
      }
    }
    return formData;
  }

  validateFormData(formData) { return formData.personalInfo.fullName && formData.personalInfo.email && (formData.experience.length > 0 || formData.education.length > 0); }

  createResumePrompt(formData) {
    const styleInstructions = {
      modern: `
**Style Guide: Modern (Two-Column)**
- Main container class: \`resume-container resume-container-modern\`
- Layout: Two columns.
- \`<aside>\`: Must contain 'Contact Info', 'Education', and 'Skills' sections.
- \`<main>\`: Must contain the candidate name \`<h1>\`, 'Professional Summary', and 'Work Experience' sections.`,
      classic: `
**Style Guide: Classic (Traditional)**
- Main container class: \`resume-container resume-container-classic\`
- Layout: Single, elegant column. The CSS will apply a serif font.
- The header containing the name (\`<h1>\`) and contact info (\`<div>\`) should be centered.
- All sections must appear sequentially in a single column.`,
      compact: `
**Style Guide: Compact (Minimalist)**
- Main container class: \`resume-container resume-container-compact\`
- Layout: Single, information-dense column. CSS will apply smaller fonts and tighter spacing.
- Use a standard single-column order: Header (Name, Contact), Summary, Experience, Education, Skills.`,
    };

    const targetJobSection = formData.jobDescription ? `
**Target Job Description:**
${formData.jobDescription}
**Instruction:** Optimize the resume for ATS by incorporating relevant keywords from this job description naturally into the summary and experience bullet points.` : '';

    const themeInstruction = `**Theme Color:** The user has selected a theme color (${this.selectedTheme}). The final HTML will be styled with a CSS variable \`--resume-accent-color\` set to this value. You MUST use the provided HTML structure and CSS classes which are designed to use this variable. DO NOT use inline styles for colors.`;

    return `You are an expert resume writer and HTML developer. Create a professional, ATS-optimized resume in clean HTML format based on the user's data and style preferences.

**Candidate Data:**
- Personal Info: ${JSON.stringify(formData.personalInfo)}
- Professional Summary: ${formData.summary || '(AI to generate based on experience)'}
- Work Experience: ${JSON.stringify(formData.experience)}
- Education: ${JSON.stringify(formData.education)}
- Skills: ${formData.skills}
${targetJobSection}

---

**Formatting and Style Requirements:**

**1. Selected Style and Theme:**
${styleInstructions[this.selectedStyle] || styleInstructions['classic']}
${themeInstruction}

**2. Required HTML Structure and CSS Classes (MUST BE FOLLOWED):**
- **Main Container**: Must have BOTH the base class \`resume-container\` AND the style-specific class (e.g., \`class="resume-container resume-container-modern"\`).
- **Header Section**:
  - Name: \`<h1 class="candidate-name">\`
  - Contact Info Container: \`<div class="contact-info">\`. Inside, use \`<span class="contact-item">\` for each piece of info (e.g., email, phone). Use \`<a href="...">\` for links.
- **Section Structure**:
  - Each section wrapper: \`<section class="resume-section">\`
  - Section Title: \`<h2 class="section-title">\`
- **Experience & Education Entries**:
  - Entry wrapper: \`<div class="experience-entry">\` or \`<div class="education-entry">\`
  - Entry Header: \`<div class="entry-header">\`
    - Title & Company group: \`<div class="entry-title-company">\` containing \`<h3 class="entry-title">\` and \`<span class="entry-company">\`.
    - Date & Location group: \`<div class="entry-date-location">\` containing \`<span class="entry-date">\` and \`<span class="entry-location">\`.
  - Achievements/Description List: \`<ul class="achievement-list">\`. Each bullet point: \`<li class="achievement-item">\`.
- **Skills Section**:
  - Skills wrapper: \`<div class="skills-list">\`
  - Each skill tag: \`<span class="skill-item">\`

**Content Quality:**
- Rewrite experience descriptions into impactful bullet points starting with strong action verbs.
- Quantify achievements with metrics (e.g., "increased sales by 20%", "reduced bug reports by 40%").
- If the summary is empty, write a compelling one (2-3 sentences) based on the provided data.

**Final Output Rules:**
- **Return ONLY the raw HTML.** No explanations, no comments, no markdown, no \`\`\`html wrapper.
- The entire output must be a single, valid HTML block ready to be injected directly into a \`<div>\`.
`;
  }

  async callGeminiAPI(prompt, temperature = 0.7, maxOutputTokens = 8192) {
    const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature, topK: 40, topP: 0.95, maxOutputTokens }
      })
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status} ${await response.text()}`);
    const data = await response.json();
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) throw new Error('Invalid response from AI service');
    const text = data.candidates[0].content.parts[0].text;
    return text.replace(/```html\n?|\n?```/g, '').replace(/```\n?|\n?```/g, '').trim();
  }

  displayResume(htmlContent) { document.getElementById('resume-output').innerHTML = htmlContent; }

  async sendChatMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    if (!message) return;
    if (!this.currentResume) { this.showToast('Please generate a resume first', 'error'); return; }

    this.setChatLoading(true);
    this.addChatMessage(message, 'user');
    chatInput.value = '';

    try {
      const prompt = `Here is the current resume in HTML format:\n${this.currentResume}\n\nUser request: "${message}"\nPlease modify the resume HTML according to the user's request. Maintain the same professional formatting, structure, and CSS classes as the original. Return ONLY the updated HTML content.`;
      const aiResponse = await this.callGeminiAPI(prompt, 0.5);
      this.currentResume = aiResponse;
      this.displayResume(aiResponse);
      this.addChatMessage('Resume updated successfully!', 'ai');
    } catch (error) {
      console.error('Error in chat:', error);
      this.addChatMessage('Sorry, I encountered an error. Please try again.', 'ai');
    } finally {
      this.setChatLoading(false);
    }
  }

  addChatMessage(message, sender) {
    const chatHistory = document.getElementById('chat-history');
    const messageDiv = document.createElement('div');
    messageDiv.className = `mb-3 ${sender === 'user' ? 'text-right' : 'text-left'}`;
    messageDiv.innerHTML = `<div class="inline-block px-4 py-2 rounded-lg max-w-xs ${sender === 'user' ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-200 border border-white/20'}"><div class="text-xs opacity-75 mb-1">${sender === 'user' ? 'You' : 'AI Assistant'}</div><div class="text-sm">${message}</div></div>`;
    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  async enhanceDescription(textarea, button) {
    const originalText = textarea.value;
    if (!originalText) { this.showToast('Please enter a description to enhance.', 'error'); return; }

    const originalIcon = button.innerHTML;
    button.innerHTML = `<div class="w-4 h-4 border-2 border-white/50 border-t-white rounded-full spinner"></div>`;
    button.disabled = true;

    const prompt = `Rewrite and enhance the following job responsibility to be more impactful for a resume. Use strong action verbs and quantify achievements where possible. Format the output as bullet points, each starting with a hyphen '-'. Keep it concise and professional.
    Original text: "${originalText}"
    Return ONLY the enhanced text.`;

    try {
      const enhancedText = await this.callGeminiAPI(prompt, 0.6, 1024);
      textarea.value = enhancedText.trim();
      this.showToast('Description enhanced by AI!', 'success');
    } catch (error) {
      console.error('Enhancement failed:', error);
      this.showToast('AI enhancement failed. Please try again.', 'error');
    } finally {
      button.innerHTML = originalIcon;
      button.disabled = false;
    }
  }

  async handleResumeUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const uploadStatus = document.getElementById('upload-status');
    const uploadLabel = document.getElementById('upload-label');
    uploadStatus.textContent = 'Reading file...';

    if (file.type !== 'text/plain') {
      this.showToast('For this demo, please upload a .txt file.', 'info');
      uploadStatus.textContent = 'Demo only supports .txt';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const textContent = e.target.result;
      uploadStatus.textContent = 'Extracting data with AI...';
      try {
        const prompt = `Analyze the following resume text and extract the key information into a structured JSON object. The JSON object should have these keys: "fullName", "email", "phone", "linkedin", "location", "summary", "skills" (as a comma-separated string), "experience" (an array of objects with keys: "jobTitle", "company", "location", "duration", "description"), and "education" (an array of objects with keys: "degree", "institution", "location", "duration", "gpa").
        Resume Text:\n---\n${textContent}\n---\nReturn ONLY the raw JSON object.`;
        let extractedData = await this.callGeminiAPI(prompt, 0.1, 4096);
        // Clean potential markdown artifacts from the response
        const cleanJsonString = extractedData.replace(/^```json\n|```$/g, '').trim();
        const parsedData = JSON.parse(cleanJsonString);
        this.populateForm(parsedData);
        uploadStatus.textContent = 'Data extracted successfully!';
        this.showToast('Resume data has been populated!', 'success');
      } catch (error) {
        console.error('Data extraction failed:', error);
        uploadStatus.textContent = 'AI extraction failed.';
        this.showToast('Could not extract data from the resume.', 'error');
      } finally {
        uploadLabel.textContent = 'Select File (.txt)';
        event.target.value = ''; // Reset file input
      }
    };
    uploadLabel.textContent = file.name;
    reader.readAsText(file);
  }

  populateForm(data) {
    this.resetForm();
    document.getElementById('fullName').value = data.fullName || '';
    document.getElementById('email').value = data.email || '';
    document.getElementById('phone').value = data.phone || '';
    document.getElementById('linkedin').value = data.linkedin || '';
    document.getElementById('location').value = data.location || '';
    document.getElementById('summary').value = data.summary || '';
    document.getElementById('skills').value = data.skills || '';
    if (data.experience && Array.isArray(data.experience)) data.experience.forEach(exp => this.addExperienceField(exp));
    if (data.education && Array.isArray(data.education)) data.education.forEach(edu => this.addEducationField(edu));
  }

  resetForm() {
    document.getElementById('resume-form').reset();
    document.getElementById('experience-fields').innerHTML = '';
    document.getElementById('education-fields').innerHTML = '';
    this.experienceCount = 0;
    this.educationCount = 0;
    this.addInitialFields();
  }

  selectTheme(swatchElement) {
    document.querySelectorAll('#theme-selector .color-swatch').forEach(el => el.classList.remove('active'));
    swatchElement.classList.add('active');
    this.selectedTheme = swatchElement.dataset.color;
    document.documentElement.style.setProperty('--resume-accent-color', this.selectedTheme);
  }

  selectStyle(cardElement) {
    document.querySelectorAll('#style-selector .style-selector-card').forEach(el => el.classList.remove('active'));
    cardElement.classList.add('active');
    cardElement.querySelector('input[type="radio"]').checked = true;
    this.selectedStyle = cardElement.dataset.style;
  }

  downloadPDF() {
    const resumeElement = document.getElementById('resume-output');
    if (!resumeElement.innerHTML.trim() || resumeElement.querySelector('.text-gray-400')) { this.showToast('No resume to download', 'error'); return; }
    const fullName = document.getElementById('fullName').value.replace(/ /g, '_') || 'resume';
    const opt = { margin: [0.5, 0.5, 0.5, 0.5], filename: `${fullName}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, letterRendering: true }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } };
    html2pdf().set(opt).from(resumeElement).save().then(() => { this.showToast('Resume downloaded successfully!', 'success'); }).catch(e => { console.error(e); this.showToast('Failed to download PDF', 'error'); });
  }

  setLoading(isLoading) {
    const btn = document.getElementById('generate-btn'), text = document.getElementById('generate-btn-text'), spinner = document.getElementById('loading-spinner');
    btn.disabled = isLoading;
    text.classList.toggle('hidden', isLoading);
    spinner.classList.toggle('hidden', !isLoading);
  }

  setChatLoading(isLoading) {
    const btn = document.getElementById('chat-send-btn'), text = document.getElementById('chat-send-text'), loading = document.getElementById('chat-loading');
    btn.disabled = isLoading;
    text.classList.toggle('hidden', isLoading);
    loading.classList.toggle('hidden', !isLoading);
  }

  enableDownload() { document.getElementById('download-pdf-btn').disabled = false; }
  showChatInterface() { document.getElementById('chat-interface').classList.remove('hidden'); }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `px-6 py-4 rounded-lg shadow-lg text-white font-medium transform transition-all duration-300 translate-x-full opacity-0 ${ type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500' }`;
    toast.textContent = message;
    const container = document.getElementById('toast-container');
    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-x-full', 'opacity-0'), 100);
    setTimeout(() => {
      toast.classList.add('translate-x-full', 'opacity-0');
      setTimeout(() => container.contains(toast) && container.removeChild(toast), 300);
    }, 3000);
  }

  // Import the functions you need from the SDKs you need

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional



}
const firebaseConfig = {
  apiKey: "AIzaSyAmHNnRbgPuJPs2nU0KMKtSfwGmc6UmgB4",
  authDomain: "ai-resume-maker-6060f.firebaseapp.com",
  projectId: "ai-resume-maker-6060f",
  storageBucket: "ai-resume-maker-6060f.firebasestorage.app",
  messagingSenderId: "551210772147",
  appId: "1:551210772147:web:33443066a78b0d717672c6",
  measurementId: "G-NH2LNQL1HJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
document.addEventListener('DOMContentLoaded', () => new ResumeApp());
