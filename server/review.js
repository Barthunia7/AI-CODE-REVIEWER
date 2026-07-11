const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const db = require('./db');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/submit-review', async (req, res) => {
  const { userId, projectName, reviewType, rawCode, fileName } = req.body;

  try {
    // 1. Check if the project metadata already exists, or save it as a new profile
    let projectRes = await db.query(
      'SELECT id FROM projects WHERE user_id = $1 AND project_name = $2',
      [userId, projectName]
    );
    
    let projectId;
    if (projectRes.rows.length > 0) {
      projectId = projectRes.rows[0].id;
    } else {
      const newProject = await db.query(
        'INSERT INTO projects (user_id, project_name) VALUES ($1, $2) RETURNING id',
        [userId, projectName]
      );
      projectId = newProject.rows[0].id;
    }

    // 2. Insert main tracking record row into reviews table
    const reviewRes = await db.query(
      'INSERT INTO reviews (project_id, review_type) VALUES ($1, $2) RETURNING id',
      [projectId, reviewType]
    );
    const reviewId = reviewRes.rows[0].id;

    // 3. Request evaluation payload mapping directly from OpenAI
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Cost-effective model selection for dev volume
      response_format: { type: "json_object" }, 
      messages: [
        {
          role: "system",
          content: `You are an AI code reviewer. Analyze the code provided. 
          You must respond with a JSON object containing an 'overall_score' (0-100), a 'summary', and an array of 'findings'.
          Each finding must match this JSON structure:
          {
            "severity": "low" | "medium" | "high",
            "issue": "Brief problem statement",
            "explanation": "Detailed safety or performance bug breakdown.",
            "suggested_fix": "Refactored clean code block snippet replacement",
            "line_number": 5
          }`
        },
        { role: "user", content: `File Name: ${fileName || 'main.js'}\nCode:\n${rawCode}` }
      ]
    });

    const aiData = JSON.parse(aiResponse.choices.message.content);

    // 4. Record top-level score rankings straight back to reviews row index
    await db.query(
      'UPDATE reviews SET overall_score = $1, summary = $2 WHERE id = $3',
      [aiData.overall_score, aiData.summary, reviewId]
    );

    // 5. Bulk insert deep analysis item listings inside findings table database rows
    const findings = aiData.findings || [];
    for (const item of findings) {
      await db.query(
        `INSERT INTO review_findings 
        (review_id, severity, issue, explanation, suggested_fix, file_name, line_number) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [reviewId, item.severity, item.issue, item.explanation, item.suggested_fix, fileName || 'main.js', item.line_number || 1]
      );
    }

    res.status(200).json({
      success: true,
      reviewId,
      overallScore: aiData.overall_score,
      summary: aiData.summary,
      findingsCount: findings.length
    });

  } catch (error) {
    console.error("OpenAI Pipeline Crash:", error);
    res.status(500).json({ error: "Failed to generate AI code analysis insights." });
  }
});

module.exports = router;
