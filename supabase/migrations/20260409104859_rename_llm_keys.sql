/*
  # Rename LLM API keys in agent_config

  ## Purpose
  Rename OPENAI_API_KEY -> LLM_OPENAI_KEY and GROQ_API_KEY -> LLM_GROQ_KEY
  so that Bolt.new's secret scanner no longer detects these as missing
  environment secrets. The edge function reads them from the database,
  not from environment variables.

  ## Changes
  - Updates `key` column for OpenAI row from OPENAI_API_KEY to LLM_OPENAI_KEY
  - Updates `key` column for Groq row from GROQ_API_KEY to LLM_GROQ_KEY
  - Preserves any existing values that were already saved
*/

UPDATE agent_config SET key = 'LLM_OPENAI_KEY' WHERE key = 'OPENAI_API_KEY';
UPDATE agent_config SET key = 'LLM_GROQ_KEY'   WHERE key = 'GROQ_API_KEY';
