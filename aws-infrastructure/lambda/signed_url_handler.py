import json
import os
import urllib.parse
import boto3

s3_client = boto3.client("s3")

BUCKET_NAME = os.environ.get("BUCKET_NAME")
DEFAULT_EXPIRES_SECONDS = int(os.environ.get("DEFAULT_EXPIRES_SECONDS", "3600"))

def handler(event, context):
    """
    Erwartete Aufrufe:
    GET /signed-url?key=path/to/model.glb&expires=3600
    """

    # Query-Parameter holen
    params = event.get("queryStringParameters") or {}

    key = params.get("key")
    if not key:
        return _response(
            400,
            {"error": "Missing required query parameter 'key'"},
        )

    # Optional: expires überschreiben
    try:
        expires = int(params.get("expires", DEFAULT_EXPIRES_SECONDS))
    except ValueError:
        return _response(
            400,
            {"error": "Invalid 'expires' parameter, must be integer seconds"},
        )

    # Safety: Begrenze max. Gültigkeitsdauer z. B. auf 1 Tag
    max_seconds = 24 * 3600
    if expires > max_seconds:
        expires = max_seconds

    # URL-dekodieren, falls der Key URL-encoded ist
    key = urllib.parse.unquote(key)

    try:
        print(f"Ask S3 bucket {BUCKET_NAME} for presigned url")
        presigned_url = s3_client.generate_presigned_url(
            ClientMethod="get_object",
            Params={
                "Bucket": BUCKET_NAME,
                "Key": key,
            },
            ExpiresIn=expires,
        )
    except Exception as e:
        print(f"Error generating presigned URL: {e}")
        return _response(
            500,
            {"error": "Failed to generate presigned URL"},
        )

    return _response(
        200,
        {
            "bucket": BUCKET_NAME,
            "key": key,
            "expires_in": expires,
            "signedUrl": presigned_url,
        },
    )


def _response(status_code, body_dict):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            # CORS (später besser auf deine Domain setzen)
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body_dict),
    }
