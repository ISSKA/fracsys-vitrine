import os
import time
from pathlib import Path
from urllib.parse import quote

import pytest
import requests
from dotenv import load_dotenv

S3_TEST_FILE = "s3_test_file.txt"

@pytest.fixture(scope="session", autouse=True)
def load_environment():
    load_dotenv()

@pytest.fixture(scope="session")
def shared_data_file(tmp_path_factory) -> Path:
    temp_dir = tmp_path_factory.mktemp("data")
    file_path = temp_dir / S3_TEST_FILE
    file_path.write_text("File used for S3 connection tests.")
    return file_path


def test_download_endpoint_url(shared_data_file: Path):
    key = shared_data_file.name
    url = f"{os.getenv('SignedUrlDownloadEndpoint')}?key={quote(key)}"
    resp = requests.get(url)

    assert resp.status_code == 200

    data = resp.json()
    signed_url = data["signedUrl"]
    assert "fracsysmodels20251127" in signed_url


def test_download_endpoint_url_no_key():
    url = f"{os.getenv('SignedUrlDownloadEndpoint')}"
    resp = requests.get(url)

    assert resp.status_code == 400

    data = resp.json()
    assert "Missing key" in data["error"]


def test_upload_endpoint_url(shared_data_file: Path):
    key = shared_data_file.name
    url = f"{os.getenv('SignedUrlUploadEndpoint')}?key={quote(key)}"
    resp = requests.get(url)
    assert resp.status_code == 200

    data = resp.json()
    signed_url = data["uploadUrl"]
    assert "fracsysmodels20251127" in signed_url


def test_upload_endpoint_url_no_key():
    url = f"{os.getenv('SignedUrlUploadEndpoint')}"
    resp = requests.get(url)
    assert resp.status_code == 400

    data = resp.json()
    assert "Missing required" in data["error"]


def test_url_expires_after_10s(shared_data_file: Path):
    key = shared_data_file.name
    url = f"{os.getenv('SignedUrlDownloadEndpoint')}?key={quote(key)}&expires=10"
    resp = requests.get(url)

    assert resp.status_code == 200

    data = resp.json()
    signed_url = data["signedUrl"]
    assert "fracsysmodels20251127" in signed_url

    # wait 15s. After that the url should be invalid
    time.sleep(15)
    resp = requests.get(signed_url)
    file_content = str(resp.content)
    assert resp.status_code == 403
    assert "Request has expired" in file_content
