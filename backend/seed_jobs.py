"""
Script to seed initial job data
"""
import requests
import sys

def seed_jobs():
    """Seed initial job postings"""
    try:
        response = requests.post('http://localhost:8000/api/jobs/seed')
        response.raise_for_status()
        result = response.json()
        print("✅ Successfully seeded jobs:")
        for job in result.get('jobs', []):
            print(f"  - {job['title']} at {job['company']}")
        return True
    except requests.exceptions.ConnectionError:
        print("❌ Error: Backend server not running. Please start it with: uv run uvicorn src.main:app --reload")
        return False
    except Exception as e:
        print(f"❌ Error seeding jobs: {e}")
        return False

if __name__ == "__main__":
    success = seed_jobs()
    sys.exit(0 if success else 1)
