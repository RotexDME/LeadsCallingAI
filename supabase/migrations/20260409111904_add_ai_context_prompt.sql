/*
  # Add AI Context Prompt to agent_config

  ## Purpose
  Adds a second prompt field `AI_CONTEXT_PROMPT` in the instructions group.
  The system prompt defines the AI's role and behavior rules.
  The context prompt provides knowledge-base content (FAQs, school info, etc.)
  that is injected alongside the system prompt on every request.

  ## New Rows
  - `AI_CONTEXT_PROMPT` (group: instructions) — supplementary context/knowledge
    appended to the system prompt so the AI has domain-specific information.
*/

INSERT INTO agent_config (key, value, label, "group", is_secret, placeholder)
VALUES (
  'AI_CONTEXT_PROMPT',
  'School Details:
- School Name: Rapid X High School
- Location: 123 Education Lane, Knowledge City
- Office Hours: Monday to Saturday, 8:00 AM to 4:00 PM
- Contact: +91-XXXXXXXXXX

Grades Offered: Grade 1 to Grade 10

Fee Structure (approximate):
- Grade 1-5: Rs. 50,000 per year
- Grade 6-10: Rs. 65,000 per year
- Includes tuition, books, and activity fees

Admission Process:
1. Fill out the online application form at the school website
2. Submit required documents (birth certificate, previous mark sheets)
3. Attend an interview / assessment
4. Receive confirmation within 7 working days

Important Dates:
- Admissions open: April 1st each year
- Academic year starts: June 1st',
  'AI Context / Knowledge Base',
  'instructions',
  false,
  'Add school details, FAQs, policies, or any knowledge the AI should know...'
)
ON CONFLICT (key) DO NOTHING;
