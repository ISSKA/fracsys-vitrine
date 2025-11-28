import shutil
import os
import requests
from urllib.parse import quote
from dotenv import load_dotenv

S3_TEST_FILE = "s3_test_file.txt"

def test_download_endpoint():
    load_dotenv()
    key = S3_TEST_FILE
    url = f"{os.getenv('SignedUrlDownloadEndpoint')}?key={quote(key)}"
    resp = requests.get(url)

    assert resp.status_code == 200
    
    data = resp.json()
    signed_url = data["signedUrl"]
    assert "fracsysmodels20251127" in signed_url

    resp = requests.get(signed_url)
    file_content = str(resp.content)
    assert "File used for S3 connection tests." in file_content


def test_download_endpoint_no_key():
    load_dotenv()
    key = "fracture_scene.gltf"
    url = f"{os.getenv('SignedUrlDownloadEndpoint')}"
    resp = requests.get(url)

    assert resp.status_code == 400

    data = resp.json()
    assert "Missing key" in data["error"]


def test_upload_endpoint():
    load_dotenv()
    key = "fracture_scene.gltf"
    url = f"{os.getenv('SignedUrlUploadEndpoint')}?key={quote(key)}"
    resp = requests.get(url)
    assert resp.status_code == 200
    
    data = resp.json()
    signed_url = data["uploadUrl"]
    assert "fracsysmodels20251127" in signed_url


def test_upload_endpoint_no_key():
    load_dotenv()
    key = "fracture_scene.gltf"
    url = f"{os.getenv('SignedUrlUploadEndpoint')}"
    resp = requests.get(url)
    assert resp.status_code == 400
    
    data = resp.json()
    assert "Missing required" in data["error"]    
