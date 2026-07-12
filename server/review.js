
const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const db = require('./db');

// Node native core modules for standard local file operations and terminal execution
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Initialize Groq SDK utilizing secure backend environment flags
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });


const runStaticLinter = (filePath) => {
  return new Promise((resolve) => {
    // Executes local project eslint tool and forces uniform structured JSON logs parsing
    exec(`npx eslint "${filePath}" --format json`, (error, stdout) => {
      try {
        const parsedData = JSON.parse(stdout);
        
        // ESLint returns an array of file objects; locate messages across index 0
        const fileMessages = parsedData[0]?.messages || [];
        
        // Standardize output objects directly into our structural Review Findings Schema
        const formattedFindings = fileMessages.map(msg => ({
          severity: msg.severity === 2 ? 'high' : 'medium',
          issue: msg.ruleId || 'Syntax Constraint Warning',
          explanation: `Local Static Linter Rule Exception: ${msg.message}`,
          suggested_fix: msg.fix ? 'Auto-fix layouts formatting guidelines available via CLI' : null,
          line_number: msg.line || 1
        }));
        
        resolve(formattedFindings);
      } catch (e) {
        // Fallback gracefully if linter finds no syntax structural bugs or errors out
        resolve([]);
      }
    });
  });
};

// MAIN REVIEW CODE PROCESSING PIPELINE ENDPOINT
router.post('/submit-review', async (req, res) => {
  const { userId, projectName, reviewType, rawCode, fileName } = req.body;
  let tempFilePath = null; // Baseline system tracking pointer referencing our scratch file

  try {
    // 1. Relational Check: Verify if project tracking metadata already exists, or save fresh index
    let projectRes = await db.query(
      'SELECT id FROM projects WHERE user_id = $1 AND project_name = $2',
      [userId, projectName]
    );
    
    let projectId;
    if (projectRes.rows.length > 0) {
      projectId = projectRes.rows[0].id; // Safe structural row zero array pointer index access
    } else {
      const newProject = await db.query(
        'INSERT INTO projects (user_id, project_name) VALUES ($1, $2) RETURNING id',
        [userId, projectName]
      );
      projectId = newProject.rows[0].id; // Safe structural row zero array pointer index access
    }

    // 2. Logging tracking parent row index inside reviews database grid table
    const reviewRes = await db.query(
      'INSERT INTO reviews (project_id, review_type) VALUES ($1, $2) RETURNING id',
      [projectId, reviewType]
    );
    const reviewId = reviewRes.rows[0].id; // Safe structural row zero array pointer index access

    // 3. DAY 6 LOCAL CACHING: Commit raw string text variables safely down to disk drive storage
    const targetFile = fileName || 'snippet.js';
    tempFilePath = path.join(__dirname, `../temp_${Date.now()}_${targetFile}`);
    await fs.writeFile(tempFilePath, rawCode, 'utf8');

    // 4. DAY 6 EXECUTION: Run ESLint static parsing tool synchronously
    const staticFindings = await runStaticLinter(tempFilePath);

    // 5. DEEP ENGINE LOGIC AUDIT: Connect to Groq Cloud for core architectural reviews
    const systemPrompt = `You are an expert AI code reviewer and code safety auditor.
    Analyze the code provided below and generate constructive feedback.
    You MUST return your complete response as a valid, single JSON object matching this structure exactly:
    {
      "overall_score": 85,
      "summary": "Executive overview statement summary of code health and architectural structure.",
      "findings": [
        {
          "severity": "low" | "medium" | "high",
          "issue": "Brief clear problem statement rule name",
          "explanation": "Detailed performance or logic bug explanation context breakdown.",
          "suggested_fix": "Refactored code string block replacement replacement",
          "line_number": 4
        }
      ]
    }`;

    const aiResponse = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }, // Forces strict structural format matching output array 
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `File Name: ${targetFile}\nCode to analyze:\n${rawCode}` }
      ],
      temperature: 0.2
    });
    const aiData = JSON.parse(aiResponse.choices[0].message.content);


    // 6. Record parent level scoring criteria values straight back to database columns
    await db.query(
      'UPDATE reviews SET overall_score = $1, summary = $2 WHERE id = $3',
      [aiData.overall_score || 100, aiData.summary || 'Code analysis audit complete.', reviewId]
    );

    // =========================================================================
    // DAY 7 MATRIX AGGREGATION LAYER: 
    // Merge static compiler structural bugs and generative AI architectural logic leaks
    // =========================================================================
    const combinedFindings = [...staticFindings, ... (aiData.findings || [])];

    // 7. Bulk insert composite findings list values deep inside your individual data rows
    for (const item of combinedFindings) {
      await db.query(
        `INSERT INTO review_findings 
        (review_id, severity, issue, explanation, suggested_fix, file_name, line_number) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          reviewId, 
          item.severity || 'low', 
          item.issue || 'Analysis Alert Rule Violation', 
          item.explanation || 'No structural breakdown explanation context logged.', 
          item.suggested_fix || null, 
          targetFile, 
          item.line_number || 1
        ]
      );
    }

    // Deliver unified confirmation signals back to user web client panels
    res.status(200).json({
      success: true,
      reviewId,
      overallScore: aiData.overall_score || 100,
      summary: aiData.summary || 'Audit completed.',
      findingsCount: combinedFindings.length
    });

  } catch (error) {
    console.error("Composite Processing Hybrid Pipeline Failure Exception:", error);
    res.status(500).json({ error: "Failed executing composite review validation analysis pipelines." });
  } finally {
    // CACHE SAFETY CLEANUP: Delete temporary tracking file from disk storage after pipeline wraps up
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }
  }
});

// FETCH HISTORICAL ANALYSIS REPORT METRICS BY UNIQUE GENERATED RECORD ID
router.get('/details/:id', async (req, res) => {
  const reviewId = req.params.id;

  try {
    // 1. Query top-level metadata values
    const reviewRes = await db.query(
      'SELECT * FROM reviews WHERE id = $1',
      [reviewId]
    );

    if (reviewRes.rows.length === 0) {
      return res.status(404).json({ error: "Target review data record index properties not found." });
    }

    // 2. Fetch all corresponding issues listed inside findings table rows
    const findingsRes = await db.query(
      'SELECT * FROM review_findings WHERE review_id = $1 ORDER BY id ASC',
      [reviewId]
    );

    res.status(200).json({
      success: true,
      review: reviewRes.rows[0], // Access explicit object payload straight to client metrics 
      findings: findingsRes.rows
    });

  } catch (error) {
    console.error("Database query execution exception crash:", error);
    res.status(500).json({ error: "Internal database querying process execution error occurred." });
  }
});

module.exports = router;
