const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk'); // Import official Groq client SDK
const db = require('./db');

// Initialize Groq using secure environment variable configuration
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post('/submit-review', async (req, res) => {
  const { userId, projectName, reviewType, rawCode, fileName } = req.body;

  try {
    // 1. Check or create project reference using explicit row zero array indices
    let projectRes = await db.query(
      'SELECT id FROM projects WHERE user_id = $1 AND project_name = $2',
      [userId, projectName]
    );
    
    let projectId;
    if (projectRes.rows.length > 0) {
      projectId = projectRes.rows[0].id; // FIXED: Explicit index 0 access
    } else {
      const newProject = await db.query(
        'INSERT INTO projects (user_id, project_name) VALUES ($1, $2) RETURNING id',
        [userId, projectName]
      );
      projectId = newProject.rows[0].id; // FIXED: Explicit index 0 access
    }

    // 2. Insert primary tracking row inside reviews table
    const reviewRes = await db.query(
      'INSERT INTO reviews (project_id, review_type) VALUES ($1, $2) RETURNING id',
      [projectId, reviewType]
    );
    const reviewId = reviewRes.rows[0].id; // FIXED: Explicit index 0 access

    // 3. Request evaluation payload mapping via Groq Cloud
    const systemPrompt = `You are an expert AI code reviewer. Analyze the code provided.
    You MUST return your complete response as a valid, single JSON object matching this structure exactly:
    {
      "overall_score": 85,
      "summary": "Executive overview statement of code health.",
      "findings": [
        {
          "severity": "low",
          "issue": "Problem name",
          "explanation": "Detailed explanation breakdown.",
          "suggested_fix": "Refactored code replacement",
          "line_number": 4
        }
      ]
    }`;

    // Target the ultra-fast Llama-3.3-70b production-grade model node
    const aiResponse = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }, // Forces structured output return
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `File Name: ${fileName || 'main.js'}\nCode to analyze:\n${rawCode}` }
      ],
      temperature: 0.2
    });

    const aiData = JSON.parse(aiResponse.choices[0].message.content);

    // 4. Update the parent reviews table entry with core scores
    await db.query(
      'UPDATE reviews SET overall_score = $1, summary = $2 WHERE id = $3',
      [aiData.overall_score || 100, aiData.summary || 'Audit complete.', reviewId]
    );

    // 5. Populate findings rows inside database grid matrix
    const findings = aiData.findings || [];
    for (const item of findings) {
      await db.query(
        `INSERT INTO review_findings 
        (review_id, severity, issue, explanation, suggested_fix, file_name, line_number) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          reviewId, 
          item.severity || 'low', 
          item.issue || 'Style Warning', 
          item.explanation || 'No detail provided.', 
          item.suggested_fix || null, 
          fileName || 'main.js', 
          item.line_number || 1
        ]
      );
    }

    // Return properties smoothly back to the frontend layer 
    res.status(200).json({
      success: true,
      reviewId,
      overallScore: aiData.overall_score || 100,
      summary: aiData.summary || 'Audit complete.',
      findingsCount: findings.length
    });

  } catch (error) {
    console.error("Groq Pipeline Crash Log:", error);
    res.status(500).json({ error: "Failed executing systemic automated review pipeline." });
  }
});
// FETCH REVIEW DETAILS BY UNIQUE ID
router.get('/details/:id', async (req, res) => {
  const reviewId = req.params.id;

  try {
    // 1. Fetch the main review row
    const reviewRes = await db.query(
      'SELECT * FROM reviews WHERE id = $1',
      [reviewId]
    );

    if (reviewRes.rows.length === 0) {
      return res.status(404).json({ error: "Target review data record not found." });
    }

    // 2. Fetch all related findings for this review
    const findingsRes = await db.query(
      'SELECT * FROM review_findings WHERE review_id = $1 ORDER BY id ASC',
      [reviewId]
    );

    // Return the clean row objects to the frontend
    res.status(200).json({
      success: true,
      review: reviewRes.rows[0], // Access row index 0 directly for metadata
      findings: findingsRes.rows
    });

  } catch (error) {
    console.error("Database detail query crash:", error);
    res.status(500).json({ error: "Internal database querying exception occurred." });
  }
});

module.exports = router;
