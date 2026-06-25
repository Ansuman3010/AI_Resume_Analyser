const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Google GenAI
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// Multer setup for memory storage
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/analyze', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    // Extract text from PDF
    const pdfData = await pdfParse(req.file.buffer);
    const text = pdfData.text;

    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Could not extract text from the PDF.' });
    }

    const { jobDescription } = req.body;

    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const jobSection = jobDescription
      ? 'Compare it against this Job Description:\n' + jobDescription + '\n'
      : '';

    const prompt =
      'You are an expert ATS (Applicant Tracking System) and professional recruiter.\n' +
      'Please analyze the following resume.\n' +
      jobSection +
      '\nResume Text:\n' +
      text +
      '\n\nProvide your analysis strictly in the following JSON format:\n' +
      '{\n' +
      '  "score": <number 0-100>,\n' +
      '  "summary": "<brief summary of the candidate>",\n' +
      '  "strengths": ["strength 1", "strength 2"],\n' +
      '  "weaknesses": ["weakness 1", "weakness 2"],\n' +
      '  "keywords": ["keyword 1", "keyword 2"],\n' +
      '  "suggestions": ["suggestion 1", "suggestion 2"]\n' +
      '}\n'+
      'And at last tell what the candidate can apply for according to resume\n';

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const resultText = response.text;
    let jsonResult;
    try {
      jsonResult = JSON.parse(resultText);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse AI response.', details: resultText });
    }

    res.json(jsonResult);
  } catch (error) {
    console.error('Error analyzing resume:', error);
    res.status(500).json({ error: 'Failed to analyze resume.', details: error.message });
  }
});

app.listen(port, () => {
  console.log('Server is running on port ' + port);
});
