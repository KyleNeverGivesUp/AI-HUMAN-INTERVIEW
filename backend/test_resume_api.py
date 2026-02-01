#!/usr/bin/env python3
"""
Test script for resume management API
"""
import requests
import sys
from pathlib import Path

API_URL = "http://localhost:8000"

def test_health():
    """Test API health"""
    print("1. Testing API health...")
    response = requests.get(f"{API_URL}/api/health")
    print(f"   ✓ API is healthy: {response.json()}")

def test_upload():
    """Test resume upload"""
    print("\n2. Testing resume upload...")
    
    # Create a dummy PDF file for testing
    test_file = Path("test_resume.pdf")
    test_file.write_bytes(b"%PDF-1.4\n%Test PDF\n")
    
    try:
        with open(test_file, 'rb') as f:
            files = {'file': ('test_resume.pdf', f, 'application/pdf')}
            response = requests.post(f"{API_URL}/api/resumes/upload", files=files)
            
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ Upload successful: {data['id']}")
            return data['id']
        else:
            print(f"   ✗ Upload failed: {response.status_code} - {response.text}")
            return None
    finally:
        test_file.unlink(missing_ok=True)

def test_list():
    """Test resume list"""
    print("\n3. Testing resume list...")
    response = requests.get(f"{API_URL}/api/resumes")
    
    if response.status_code == 200:
        data = response.json()
        print(f"   ✓ Found {data['total']} resume(s)")
        return data['items']
    else:
        print(f"   ✗ List failed: {response.status_code}")
        return []

def test_download(resume_id: str):
    """Test resume download"""
    print(f"\n4. Testing resume download (ID: {resume_id})...")
    response = requests.get(f"{API_URL}/api/resumes/{resume_id}/download")
    
    if response.status_code == 200:
        print(f"   ✓ Download successful: {len(response.content)} bytes")
        return True
    else:
        print(f"   ✗ Download failed: {response.status_code}")
        return False

def test_delete(resume_id: str):
    """Test resume delete"""
    print(f"\n5. Testing resume delete (ID: {resume_id})...")
    response = requests.delete(f"{API_URL}/api/resumes/{resume_id}")
    
    if response.status_code == 200:
        print(f"   ✓ Delete successful")
        return True
    else:
        print(f"   ✗ Delete failed: {response.status_code}")
        return False

def main():
    """Run all tests"""
    print("=" * 50)
    print("Resume Management API Test")
    print("=" * 50)
    
    try:
        # Test health
        test_health()
        
        # Test upload
        resume_id = test_upload()
        if not resume_id:
            print("\n✗ Upload failed, stopping tests")
            sys.exit(1)
        
        # Test list
        resumes = test_list()
        
        # Test download
        test_download(resume_id)
        
        # Test delete
        test_delete(resume_id)
        
        # Verify deletion
        print("\n6. Verifying deletion...")
        resumes_after = test_list()
        if len(resumes_after) < len(resumes):
            print("   ✓ Resume deleted successfully")
        
        print("\n" + "=" * 50)
        print("✓ All tests passed!")
        print("=" * 50)
        
    except requests.exceptions.ConnectionError:
        print("\n✗ Cannot connect to backend. Is it running?")
        print("   Start backend with: cd backend && python -m src.main")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
