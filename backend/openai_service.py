import os
import json
from openai import AsyncOpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    # Fallback to try loading from env_config.txt if .env fails (e.g. due to gitignore)
    try:
        with open("env_config.txt", "r") as f:
            for line in f:
                if line.startswith("OPENAI_API_KEY="):
                    api_key = line.split("=", 1)[1].strip()
                    break
    except:
        pass

client = AsyncOpenAI(api_key=api_key)

# Simple in-memory cache to avoid repeated calls
# Key: project_description:url, Value: {relevance_score, reasoning}
cache = {}

def clear_cache():
    """Clear the analysis cache (useful for testing or updating prompt)"""
    global cache
    cache = {}
    print("Cache cleared")

async def analyze_page_relevance(project_description, url, title, content_preview):
    """
    Analyze if a webpage is relevant to the current project using OpenAI.
    """
    # Check cache first
    cache_key = f"{project_description}:{url}"
    if cache_key in cache:
        return cache[cache_key]

    # Skip analysis for empty content or system pages
    if not content_preview and not title:
        return {"relevance_score": 1.0, "reasoning": "System page or empty content, allowing by default."}

    prompt = f"""
    You are a productivity assistant helping a user stay focused.
    
    User's Current Project: "{project_description}"
    
    Page They Are Visiting:
    - URL: {url}
    - Title: {title}
    - Content Preview: {content_preview[:1000]}...

    Task: Determine if this page is relevant/productive for the stated project.
    
    IMPORTANT GUIDELINES:
    - Consider tools and resources that HELP with the project as RELEVANT (e.g., ChatGPT for coding help, Stack Overflow, documentation, tutorials)
    - Learning resources, Q&A sites, AI assistants that directly support the work = HIGH relevance (0.7-1.0)
    - Social media, entertainment, shopping = LOW relevance (0.0-0.3)
    - News, tangentially related topics = MEDIUM relevance (0.3-0.6)
    
    Output a valid JSON object with exactly these fields:
    - "relevance_score": A number between 0.0 (completely distracting) and 1.0 (highly relevant)
    - "reasoning": A short, one-sentence explanation of why.

    Example JSON:
    {{
        "relevance_score": 0.8,
        "reasoning": "ChatGPT can help answer coding questions related to the project."
    }}
    """

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini", # Using a faster, cheaper model for real-time checks
            messages=[
                {"role": "system", "content": "You are a helpful productivity assistant. Always return valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            max_tokens=150,
            temperature=0.3
        )
        
        result = json.loads(response.choices[0].message.content)
        
        # Cache the result
        cache[cache_key] = result
        return result
        
    except Exception as e:
        print(f"OpenAI API Error: {e}")
        # Fail open (allow) if API fails to avoid blocking work
        return {
            "relevance_score": 1.0, 
            "reasoning": "Error analyzing page, defaulting to allowed to prevent blocking work."
        }
