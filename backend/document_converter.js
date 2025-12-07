const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const textract = require('textract');
const fs = require('fs').promises;
const { promisify } = require('util');

const app = express();
app.use(cors());

const upload = multer({ dest: 'uploads/' });
const textractFromFile = promisify(textract.fromFileWithPath);

app.post('/convert', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const buffer = await fs.readFile(file.path);
    let text = '';

    if (file.originalname.endsWith('.doc')) {
      // Legacy Word format - use textract
      text = await textractFromFile(file.path);
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.originalname.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
      const data = await pdfParse(buffer);
      text = data.text;
      
      // Check if PDF extraction resulted in garbled text
      const nonPrintableRatio = (text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g) || []).length / text.length;
      if (nonPrintableRatio > 0.3 || text.trim().length < 50) {
        await fs.unlink(file.path);
        return res.status(400).json({ error: 'PDF text extraction failed. Please save as .docx or .txt format.' });
      }
    } else if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
      text = buffer.toString('utf-8');
    } else {
      await fs.unlink(file.path);
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    await fs.unlink(file.path);
    res.json({ text, filename: file.originalname });
  } catch (error) {
    console.error('Conversion error:', error);
    if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ error: 'Failed to convert document. Try .docx or .txt format.' });
  }
});

const PORT = 5003;
app.listen(PORT, () => {
  console.log(`Document converter running on http://localhost:${PORT}`);
});
