import os
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

import pytest
import requests
from dotenv import load_dotenv

S3_TEST_FILE = "s3_test_file.txt"
# we create some urls, thus we make them short-lived
URL_EXPIRES_SECONDS = 10

@pytest.fixture(scope="session")
def shared_data_file(tmp_path_factory) -> Path:
    temp_dir = tmp_path_factory.mktemp("data")
    file_path = temp_dir / "numbers.txt"
    file_path.write_text("File used for S3 connection tests.")
    return file_path

def test_can_upload_file(shared_data_file: Path):
    load_dotenv()
    key = shared_data_file.name
    url = f"{os.getenv('SignedUrlUploadEndpoint')}?key={quote(key)}&expires={URL_EXPIRES_SECONDS}"
    resp = requests.get(url)
    assert resp.status_code == 200

    data = resp.json()
    signed_upload_url = data["uploadUrl"]
    assert "fracsysmodels20251127" in signed_upload_url

    with open(shared_data_file.as_posix() , "rb") as f:
        # We only allow application/octet-stream (binary files) for the upload.
        # The lambda function expects this type in the header. Otherwise,
        # we won't get an url back.
        resp = requests.put(signed_upload_url, data=f, headers={"Content-Type": "application/octet-stream"})
        if resp.status_code not in (200, 204):
            raise RuntimeError(
                f"Upload failed: {resp.status_code} {resp.text}"
            )


def test_can_download_file(shared_data_file: Path) -> None:
    load_dotenv()
    key = shared_data_file.name
    url = f"{os.getenv('SignedUrlDownloadEndpoint')}?key={quote(key)}"
    resp = requests.get(url)

    assert resp.status_code == 200

    data = resp.json()
    signed_download_url = data["signedUrl"]

    resp = requests.get(signed_download_url)
    file_content = str(resp.content)
    assert "File used for S3 connection tests." in file_content