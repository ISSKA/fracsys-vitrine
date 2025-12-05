import json
import os
import urllib.parse
import boto3
from botocore.config import Config

s3_client = boto3.client(
    "s3",
    region_name="eu-central-1",
    config=Config(signature_version="s3v4")
)

BUCKET_NAME = os.environ.get("BUCKET_NAME")
DEFAULT_EXPIRES_SECONDS = int(os.environ.get("DEFAULT_EXPIRES_SECONDS", "3600"))

def handler(event, context):
    params = event.get("queryStringParameters") or {}
    key = params.get("key")

    # Debug-Logs:
    print("### DEBUG ###")
    print("BUCKET_NAME repr:", repr(BUCKET_NAME))
    print("RAW KEY repr:   ", repr(key))

    if not key:
        return _response(400, {"error": "Missing key"})

    key = urllib.parse.unquote(key)
    print("DECODED KEY repr:", repr(key))

    expires = int(params.get("expires", DEFAULT_EXPIRES_SECONDS))
    print("EXPIRES:", expires)

    presigned_url = s3_client.generate_presigned_url(
        ClientMethod="get_object",
        Params={
            "Bucket": BUCKET_NAME,
            "Key": key,
        },
        ExpiresIn=expires,
    )

    print("PRESIGNED_URL:", presigned_url)

    return _response(200, {
        "bucket": BUCKET_NAME,
        "key": key,
        "signedUrl": presigned_url,
        "expires_in": expires,
    })


def _response(status_code, body_dict):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body_dict),
    }
