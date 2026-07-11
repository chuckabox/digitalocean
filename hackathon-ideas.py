import os
import argparse
from openai import OpenAI
from dotenv import load_dotenv

def get_evaluation(prompt):
    load_dotenv()
    
    # We use the token provided (or load from environment)
    token = os.getenv("DIGITAL_OCEAN_MODEL_ACCESS_KEY", "YOUR_API_KEY_HERE")
    
    client = OpenAI(
        base_url="https://inference.do-ai.run/v1/",
        api_key=token,
    )

    system_prompt = """
You are an expert, highly critical hackathon mentor and technical judge. Your job is to brainstorm and evaluate "AI for Social Good" hackathon ideas for a team of 3 developers. 

DO NOT INFLATE SCORES. Most ideas should NOT score 9s or 10s. If everything is a 10, the criteria are useless. Be honest, brutal, and realistic about what can be built in ~8-24 hours.

Evaluate all ideas on these 5 criteria:
1. Real Pain / Theme Fit: Is this a real social good problem? Does it actually need AI, or is it just a form?
2. DigitalOcean Centrality: Would the app break without DigitalOcean Inference Engine, Managed PostgreSQL (pgvector), or Spaces? Is DO actually core to the architecture?
3. 8-Hour Feasibility: Accounting for real friction (OAuth, prompt tuning, integration, UI polish). Not "feasible with unlimited time".
4. Demo Wow / Judge Legibility: Do judges understand the value in 2 minutes of watching a live demo?
5. Scalability: Technical (can the data model scale) and Business (real adoption story).

When the user provides a theme or idea:
1. Generate 3-5 scoped variants of the idea (from simple to "full combo").
2. Put them in a Markdown table with columns: Variant, Pain/Theme, DO Centrality, Feasibility, Wow, Scalability, Avg.
3. Keep the scores HONEST (averages should realistically hover around 7.0 - 8.8, rarely 9.0+ unless it's a perfect fit and very feasible).
4. Explain the tradeoffs of the variants below the table. Point out technical risks (e.g., "adding a vector DB buys demo wow but costs 2 points of feasibility").
5. Recommend the best realistic pick for an 8-12 hour hackathon.
"""

    print(f"Analyzing ideas with DigitalOcean Inference...\n")

    try:
        response = client.chat.completions.create(
            model="llama3.3-70b-instruct",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            max_completion_tokens=1500,
            temperature=0.7,
        )
        print(response.choices[0].message.content)
    except Exception as e:
        print(f"Error calling DigitalOcean API: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate Hackathon Ideas")
    parser.add_argument("idea", type=str, nargs="?", default="Give me 3 initial ideas for an AI for Social Good hackathon focused on local communities", help="The idea or theme to brainstorm and evaluate")
    args = parser.parse_args()
    
    get_evaluation(args.idea)
