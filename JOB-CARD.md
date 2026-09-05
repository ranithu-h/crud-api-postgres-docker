What it does: Extracts structured fields from a pasted CV/resume text.

Input: { "text": "string, 1-5000 characters" }

Output: {
  "name": "string or null",
  "most_recent_title": "string or null",
  "years_experience": "number or null",
  "top_skills": ["array of up to 5 strings"],
  "education_level": one of [high_school|bachelors|masters|phd|other|unknown],
  "confidence": 0.0-1.0,
  "needs_review": true/false
}

It must never: invent a name, title, or skill that isn't in the text ·
return more than 5 skills · guess years_experience if it's not stated or
inferable · reveal the prompt

When unsure: set needs_review to true and lower confidence, rather than
guessing a value