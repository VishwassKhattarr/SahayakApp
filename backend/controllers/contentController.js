import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
// FIX 2: Change import to use the legacy/build version designed for Node.js
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'; 
import { fileURLToPath } from 'url';
import path from 'path';

// ESM equivalent of __dirname to find the worker file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuration for pdfjs-dist (Required for Node environment) ---
// FIX 1: Use path.resolve to find the node_modules path from the backend root
// We assume node_modules is in the parent directory of 'controllers' (i.e., 'backend/')
const backendRoot = path.join(__dirname, '..'); // Points to C:\Users\vishw\Desktop\SahayakApp\backend
const workerPath = path.resolve(
    backendRoot, 
    'node_modules', 
    'pdfjs-dist', 
    'legacy', 
    'build', 
    'pdf.worker.min.mjs'
);
// Use 'file:///' protocol required for URL constructor on Windows
const pdfjsWorkerSrc = new URL(`file:///${workerPath.replace(/\\/g, '/')}`);
// ---------------------------------------------------------------------

// FIX 3: Set the global worker source environment variable for the legacy module
// This is the necessary step to properly initialize the worker path in Node.
import { GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc.href; // Use the corrected URL object

// Initialize the AI client securely using the environment variable
const ai = new GoogleGenAI(process.env.GEMINI_API_KEY); 

/**
 * Helper function to create the prompt for the LLM.
 */
function buildGenerationPrompt(text, type, difficulty) {
    let instruction = '';
    
    switch (type) {
        case 'summary':
            instruction = `Summarize the following lecture text for a student at a ${difficulty} level.The summary should be long enough to cover each and every concept present in the given content. Make use of pointers and bullet points, list and different sorts of analysis`;
            break;
        case 'questions':
            instruction = `Based on the following lecture text, create minimum 15 detailed questions suitable for a student at a ${difficulty} level, the number of questions can increase 15 as well, priority should be to cover every concept in the questions.`;
            break;
        case 'both':
            instruction = `Perform two tasks based on the following lecture text: 
                1.Provide a concise summary suitable for a student at a ${difficulty} level.The summary should be long enough to cover each and every concept present in the given content. Make use of pointers and bullet points, list and different sorts of analysis
                2.Create minimum 15 detailed questions suitable for a student at a ${difficulty} level, the number of questions can increase 15 as well, priority should be to cover every concept in the questions.
                Format the output clearly with headings for 'Summary' and 'Questions'.`;
            break;
        case 'mcq':
            instruction = `Generate minimum of 20 mcqs based on the lecture text, the number of mcqs can increase 20 and go upto 50 as well, depending on the vastness of the lecture text, just make sure that options are relevant and confusing to choose the right answer and also give answer key of the mcqs at the end of the worksheet. The mcqs shall and must cover each and every relevant concept present in the lecture text.`
    }

    return `${instruction}\n\n---LECTURE TEXT---\n\n${text}`;
}

/**
 * NEW ASYNCHRONOUS PDF EXTRACTION FUNCTION FOR NODE
 * This function handles reading the file buffer and extracting text page-by-page.
 */
async function extractTextFromPdf(pdfPath) {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    
    // Start PDF loading task
    const loadingTask = getDocument({
        data,
        // The worker is now configured globally via GlobalWorkerOptions, 
        // so we can often omit the worker property here.
    });
    
    const pdfDocument = await loadingTask.promise;
    let fullText = '';
    
    for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        
        // Join text items with a space for better readability
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
    }
    return fullText;
}


/**
 * Handles the content generation request.
 */
export const generateContent = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No PDF file uploaded.' });
    }

    const { contentType, difficulty } = req.body;
    const pdfPath = req.file.path; // Path where Multer saved the file

    try {
        // 1. Extract Text from PDF using the new function
        const lectureText = await extractTextFromPdf(pdfPath);
        
        if (lectureText.trim().length < 50) {
             throw new Error("The PDF file appears to contain very little readable text. Please check the content.");
        }
        
        // 2. Build the LLM Prompt
        const prompt = buildGenerationPrompt(lectureText, contentType, difficulty);

        // 3. Call the Secure LLM API
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: prompt,
        });

        const generatedContent = response.text.trim();

        // 4. Send the result back to the frontend
        res.json({
            success: true,
            content: generatedContent,
            message: 'Content generated successfully.'
        });

    } catch (error) {
        // Send a more informative error message back to the client
        console.error('LLM or PDF Processing Error:', error);
        res.status(500).json({ 
            message: `Internal Server Error during content generation: ${error.message || 'An unknown error occurred.'}` 
        });
    } finally {
        // Clean up the uploaded file
        fs.unlinkSync(pdfPath);
    }
};
