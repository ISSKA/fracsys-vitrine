import json
import os
import urllib.parse
import boto3

s3_client = boto3.client("s3")

BUCKET_NAME = os.environ.get("BUCKET_NAME")
DEFAULT_EXPIRES_SECONDS = int(os.environ.get("DEFAULT_EXPIRES_SECONDS", "3600"))

def handler(event, context):
    """
    Erwarteter Aufruf:
    GET /upload-url?key=path/to/model.glb&contentType=model/gltf-binary&expires=3600
    """

    params = event.get("queryStringParameters") or {}

    key = params.get("key")
    if not key:
        return _response(400, {"error": "Missing required query parameter 'key'"})

    key = urllib.parse.unquote(key)

    content_type = params.get("contentType", "application/octet-stream")

    try:
        expires = int(params.get("expires", DEFAULT_EXPIRES_SECONDS))
    except ValueError:
        return _response(400, {"error": "Invalid 'expires' value"})

    max_seconds = 24 * 3600
    if expires > max_seconds:
        expires = max_seconds

    try:
        presigned_url = s3_client.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": BUCKET_NAME,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=expires,
        )
    except Exception as e:
        print(f"Error generating upload presigned URL: {e}")
        return _response(500, {"error": "Failed to generate upload presigned URL"})

    return _response(
        200,
        {
            "bucket": BUCKET_NAME,
            "key": key,
            "expires_in": expires,
            "contentType": content_type,
            "uploadUrl": presigned_url,
        },
    )


def _response(status_code, body_dict):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body_dict),
    }
