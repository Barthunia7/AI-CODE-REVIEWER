const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const db = require('./db');

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const runStaticLinter = (filePath) => {
  return new Promise((resolve) => {
    exec(`npx eslint "${filePath}" --format json`, (error, stdout) => {
      try {
        const parsedData = JSON.parse(stdout);
        const fileMessages = parsedData?.messages || [];
        const formattedFindings = fileMessages.map(msg => ({
          severity: msg.severity === 2 ? 'high' : 'medium',
          issue: msg.ruleId || 'Syntax Constraint Warning',
          explanation: `Local Static Linter Rule Exception: ${msg.message}`,
          suggested_fix: msg.fix ? 'Auto-fix formatting guidelines available via CLI' : null,
          line_number: msg.line || 1
        }));
        resolve(formattedFindings);
      } catch (e) {
        resolve([]);
      }
    });
  });
};

router.post('/submit-review', async (req, res) => {
  const { userId, projectName, reviewType, rawCode, fileName } = req.body;
  let tempFilePath = null;

  try {
    let projectRes = await db.query('SELECT id FROM projects WHERE user_id = $1 AND project_name = $2', [userId, projectName]);
    let projectId = projectRes.rows.length > 0 ? projectRes.rows[0].id : (await db.query('INSERT INTO projects (user_id, project_name) VALUES ($1, $2) RETURNING id', [userId, projectName])).rows[0].id;

    const reviewRes = await db.query('INSERT INTO reviews (project_id, review_type) VALUES ($1, $2) RETURNING id', [projectId, reviewType]);
    const reviewId = reviewRes.rows[0].id;

    const targetFile = fileName || 'snippet.js';
    tempFilePath = path.join(__dirname, `../temp_${Date.now()}_${targetFile}`);
    await fs.writeFile(tempFilePath, rawCode, 'utf8');

    const staticFindings = await runStaticLinter(tempFilePath);

    // PIPELINE CALL 1: Request strictly structured, lightweight score metrics data via Native JSON Mode
    const metricsPrompt = `You are an expert software vulnerability auditor. Analyze the code provided below.
    You MUST respond with a single, valid JSON object matching this schema exactly with NO markdown fences:
    {
      "overall_score": 35,
      "summary": "Clear, short executive summary sentence.",
      "findings": [
        {
          "severity": "high",
          "issue": "Problem name",
          "explanation": "Bug description details.",
          "suggested_fix": "Clean code fix string substitution",
          "line_number": 12
        }
      ]
    }`;

    const metricsTask = groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: metricsPrompt },
        { role: "user", content: `Code:\n${rawCode}` }
      ],
      temperature: 0.1
    });

    // PIPELINE CALL 2: Request plain text documentation manual. No JSON structures allowed here.
    const docsPrompt = `You are a technical documentation writer. Generate a professional JSDoc markdown documentation block for the following code snippet. 
    Explain the classes, methods, parameters, and return value targets clearly. Do not output any JSON data structures or summary metrics. Output raw markdown text only.`;

    const docsTask = groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: docsPrompt },
        { role: "user", content: `Code to document:\n${rawCode}` }
      ],
      temperature: 0.3
    });

    // Run both AI extraction processes in parallel to maximize speed performance
    const [metricsResponse, docsResponse] = await Promise.all([metricsTask, docsTask]);

    const aiData = JSON.parse(metricsResponse.choices[0].message.content.trim());
    const documentationText = docsResponse.choices[0].message.content.trim();

    // Commit dynamic data straight down to Supabase columns securely
    await db.query(
      'UPDATE reviews SET overall_score = $1, summary = $2, documentation = $3 WHERE id = $4',
      [aiData.overall_score, aiData.summary || 'Audit complete.', documentationText || null, reviewId]
    );

    const combinedFindings = [...staticFindings, ...(aiData.findings || [])];

    for (const item of combinedFindings) {
      await db.query(
        `INSERT INTO review_findings (review_id, severity, issue, explanation, suggested_fix, file_name, line_number) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [reviewId, item.severity || 'low', item.issue || 'Warning', item.explanation || 'Omitted.', item.suggested_fix || null, targetFile, item.line_number || 1]
      );
    }

    res.status(200).json({
      success: true,
      reviewId,
      overallScore: aiData.overall_score,
      summary: aiData.summary,
      findingsCount: combinedFindings.length
    });

  } catch (error) {
    console.error("Dual-Engine Pipeline Exception:", error);
    res.status(500).json({ error: "Failed executing composite review analysis validation rules." });
  } finally {
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }
  }
});

router.get('/details/:id', async (req, res) => {
  const reviewId = req.params.id;
  try {
    const reviewRes = await db.query('SELECT * FROM reviews WHERE id = $1', [reviewId]);
    if (reviewRes.rows.length === 0) return res.status(404).json({ error: "Record not found." });
    const findingsRes = await db.query('SELECT * FROM review_findings WHERE review_id = $1 ORDER BY id ASC', [reviewId]);
    res.status(200).json({
      success: true,
      review: reviewRes.rows[0], // Explicitly target index 0 object mapping
      findings: findingsRes.rows
    });
  } catch (error) {
    res.status(500).json({ error: "Internal database exception error." });
  }
});

module.exports = router;
