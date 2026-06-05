const express = require('express');
const router = express.Router();
const { query, mutate } = require('../lib/db');
const { requireAuth, requireAdmin } = require('../lib/auth');
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/genai/server');

// ─── Batches ──────────────────────────────────────────────────────────────────

// GET /api/batches
router.get('/batches', requireAuth, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM batches ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/batches
router.post('/batches', requireAdmin, async (req, res) => {
  try {
    const { id, name, course_id, start_date, end_date, schedule } = req.body;
    await mutate(
      `INSERT OR REPLACE INTO batches
        (id, name, course_id, start_date, end_date, schedule, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [id, name, course_id, start_date, end_date, schedule]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/batches/:id
router.put('/batches/:id', requireAdmin, async (req, res) => {
  try {
    const { name, course_id, start_date, end_date, schedule } = req.body;
    await mutate(
      `UPDATE batches
       SET name=?, course_id=?, start_date=?, end_date=?, schedule=?
       WHERE id=?`,
      [name, course_id, start_date, end_date, schedule, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/batches/:id
router.delete('/batches/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await mutate('DELETE FROM daily_recordings WHERE batch_id=?', [id]);
    await mutate('DELETE FROM batches WHERE id=?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Recordings ───────────────────────────────────────────────────────────────

// GET /api/recordings  (optional ?batchId=xxx)
router.get('/recordings', requireAuth, async (req, res) => {
  try {
    const { batchId } = req.query;
    let sql = 'SELECT * FROM daily_recordings';
    const params = [];
    if (batchId) {
      sql += ' WHERE batch_id = ?';
      params.push(batchId);
    }
    sql += ' ORDER BY recording_date DESC';
    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recordings
router.post('/recordings', requireAdmin, async (req, res) => {
  try {
    const { id, batch_id, title, video_url, recording_date, description, duration } = req.body;
    await mutate(
      `INSERT OR REPLACE INTO daily_recordings
        (id, batch_id, title, video_url, recording_date, description, duration, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [id, batch_id, title, video_url, recording_date, description, duration]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/recordings/:id
router.put('/recordings/:id', requireAdmin, async (req, res) => {
  try {
    const { batch_id, title, video_url, recording_date, description, duration } = req.body;
    await mutate(
      `UPDATE daily_recordings
       SET batch_id=?, title=?, video_url=?, recording_date=?, description=?, duration=?
       WHERE id=?`,
      [batch_id, title, video_url, recording_date, description, duration, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/recordings/:id
router.delete('/recordings/:id', requireAdmin, async (req, res) => {
  try {
    await mutate('DELETE FROM daily_recordings WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recordings/analyze-video
router.post('/recordings/analyze-video', requireAuth, async (req, res) => {
  try {
    const { video_url, title, subject, description } = req.body;
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key is missing on the server" });
    }

    if (!video_url) {
      return res.status(400).json({ error: "No video_url provided" });
    }

    console.log(`[Gemini] Starting video analysis for: ${title}`);
    
    // 1. Download video to temporary file
    const tmpDir = os.tmpdir();
    const fileName = `cynexai_vid_${Date.now()}.mp4`;
    const filePath = path.join(tmpDir, fileName);
    
    console.log(`[Gemini] Downloading video from ${video_url} to ${filePath}...`);
    const writer = fs.createWriteStream(filePath);
    const response = await axios({
      url: video_url,
      method: 'GET',
      responseType: 'stream',
      timeout: 60000 // 60s timeout for starting DL
    });

    await new Promise((resolve, reject) => {
      response.data.pipe(writer);
      let error = null;
      writer.on('error', err => {
        error = err;
        writer.close();
        reject(err);
      });
      writer.on('close', () => {
        if (!error) resolve(true);
      });
    });

    console.log(`[Gemini] Download complete. Uploading to Gemini...`);

    // 2. Upload to Gemini
    // Note: The @google/genai package uses GoogleAIFileManager
    const fileManager = new GoogleAIFileManager(apiKey);
    const uploadResult = await fileManager.uploadFile(filePath, {
      mimeType: "video/mp4",
      displayName: title,
    });
    
    const fileUri = uploadResult.file.uri;
    const fileNameGemini = uploadResult.file.name;
    console.log(`[Gemini] Uploaded as ${fileUri}. Waiting for processing...`);

    // Wait until processed
    let fileState = await fileManager.getFile(fileNameGemini);
    while (fileState.state === 'PROCESSING') {
      console.log(`[Gemini] Still processing... waiting 5 seconds...`);
      await new Promise(r => setTimeout(r, 5000));
      fileState = await fileManager.getFile(fileNameGemini);
    }
    
    if (fileState.state === 'FAILED') {
      throw new Error("Video processing failed in Gemini");
    }

    console.log(`[Gemini] Processing complete. Generating content...`);

    // 3. Generate Content
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Generate study notes for the attached video titled "${title}" about "${subject}". 
    Here is the instructor's description: "${description || 'No description provided.'}"
    
    Return ONLY a raw JSON object with the following structure:
    {
      "summary": "A 2-3 sentence summary of what this topic generally covers, based on the video.",
      "takeaways": ["Key takeaway 1", "Key takeaway 2", "Key takeaway 3", "Key takeaway 4"],
      "codeSnippet": "A relevant code snippet or query for this topic",
      "sandboxTask": "A short practical exercise or challenge for the student to try",
      "chapters": [
        { "time": "00:00", "title": "Introduction to the topic" },
        { "time": "15:00", "title": "Deep dive into core concepts" }
      ]
    }`;

    const generateResult = await model.generateContent([
      { fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } },
      { text: prompt }
    ]);
    
    const textResponse = generateResult.response.text();
    
    // Cleanup temporary local file
    fs.unlink(filePath, () => {});
    // Optionally delete from Gemini if needed to save space
    try {
      await fileManager.deleteFile(fileNameGemini);
    } catch(e) {}

    // Parse response
    const jsonStart = textResponse.indexOf('{');
    const jsonEnd = textResponse.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("AI did not return valid JSON");
    }
    const jsonStr = textResponse.substring(jsonStart, jsonEnd + 1);
    const data = JSON.parse(jsonStr);

    res.json(data);
  } catch (err) {
    console.error(`[Gemini] Video Analysis Error:`, err);
    res.status(500).json({ error: err.message || "Error analyzing video" });
  }
});

module.exports = router;
