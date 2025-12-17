# AWS Infrastructure Deployment Guide

## Overview

This document describes the AWS infrastructure for the FracSYS Demo Site and provides instructions for deploying it using AWS CDK (Cloud Development Kit).

## Architecture

The AWS infrastructure provides secure access to 3D model files stored in Amazon S3 through presigned URLs. The architecture consists of:

![AWS Architecture](AWS-Architecture.png)

### Components

1. **Amazon S3 Bucket** (`fracsys-models-20251127`)
   - Private bucket with Block Public Access enabled
   - Stores 3D model files (GLTF/GLB format)
   - SSL/TLS enforcement enabled
   - Versioning disabled

2. **AWS Lambda Functions**
   - **Signed URL Handler**: Generates presigned URLs for downloading models from S3
   - **Upload URL Handler**: Generates presigned URLs for uploading models to S3
   - Runtime: Python 3.12
   - Timeout: 10 seconds
   - Environment variables:
     - `BUCKET_NAME`: Name of the S3 bucket
     - `DEFAULT_EXPIRES_SECONDS`: Default expiration time (3600 seconds = 1 hour)

3. **Amazon API Gateway**
   - REST API with CORS enabled
   - Two endpoints:
     - `GET /signed-url`: Request download URLs
     - `GET /upload-url`: Request upload URLs
   - CloudFormation outputs provide the API endpoint URLs

## API Usage

### Download URL Endpoint

Request a presigned URL to download a model:

```
GET https://{api-id}.execute-api.{region}.amazonaws.com/prod/signed-url?key={object-key}&expires={seconds}
```

**Query Parameters:**
- `key` (required): S3 object key (path to the file in the bucket)
- `expires` (optional): URL expiration time in seconds (default: 3600, max: 86400)

**Response:**
```json
{
  "bucket": "fracsys-models-20251127",
  "key": "path/to/model.glb",
  "expires_in": 3600,
  "signedUrl": "https://fracsys-models-20251127.s3.amazonaws.com/..."
}
```

### Upload URL Endpoint

Request a presigned URL to upload a model:

```
GET https://{api-id}.execute-api.{region}.amazonaws.com/prod/upload-url?key={object-key}&contentType={mime-type}&expires={seconds}
```

**Query Parameters:**
- `key` (required): S3 object key (destination path in the bucket)
- `contentType` (optional): MIME type (default: `application/octet-stream`)
- `expires` (optional): URL expiration time in seconds (default: 3600, max: 86400)

**Response:**
```json
{
  "bucket": "fracsys-models-20251127",
  "key": "path/to/model.glb",
  "expires_in": 3600,
  "contentType": "model/gltf-binary",
  "uploadUrl": "https://fracsys-models-20251127.s3.amazonaws.com/..."
}
```

## Prerequisites

Before deploying the CDK stack, ensure you have:

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
   ```bash
   aws configure
   ```
3. **Node.js** (v14 or later) for AWS CDK CLI
4. **Python 3.12** or later
5. **AWS CDK CLI** installed globally
   ```bash
   npm install -g aws-cdk
   ```

## Deployment Instructions

### 1. Navigate to the CDK Stack Directory

```bash
cd aws-cdk-stack
```

### 2. Create and Activate Virtual Environment

**On macOS/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

**On Windows:**
```bash
python -m venv .venv
.venv\Scripts\activate.bat
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Bootstrap CDK (First Time Only)

If this is your first time using CDK in your AWS account/region:

```bash
cdk bootstrap
```

This creates the necessary resources in your AWS account for CDK deployments.

### 5. Review the CloudFormation Template

Before deploying, you can review the generated CloudFormation template:

```bash
cdk synth
```

### 6. Deploy the Stack

Deploy the infrastructure to AWS:

```bash
cdk deploy
```

You will be prompted to approve security-related changes. Review them and approve to proceed.

### 7. Note the Outputs

After successful deployment, CDK will output the API Gateway endpoints:

```
Outputs:
S3SignedUrlAccessStack.SignedUrlDownloadEndpoint = https://{api-id}.execute-api.{region}.amazonaws.com/prod/signed-url
S3SignedUrlAccessStack.SignedUrlUploadEndpoint = https://{api-id}.execute-api.{region}.amazonaws.com/prod/upload-url
```

Save these URLs for use in your application.

## Updating the Stack

After making changes to the CDK code:

1. Review changes:
   ```bash
   cdk diff
   ```

2. Deploy updates:
   ```bash
   cdk deploy
   ```

## Useful CDK Commands

- `cdk ls` - List all stacks in the app
- `cdk synth` - Synthesize CloudFormation template
- `cdk deploy` - Deploy stack to AWS
- `cdk diff` - Compare deployed stack with current state
- `cdk destroy` - Remove the stack from AWS
- `cdk docs` - Open CDK documentation

## Security Considerations

1. **Private S3 Bucket**: All public access is blocked. Access is only possible through presigned URLs.
2. **SSL/TLS Enforcement**: All connections to S3 must use HTTPS.
3. **Time-Limited URLs**: Presigned URLs expire after the specified time (max 24 hours).
4. **CORS Configuration**: Currently set to allow all origins (`*`). For production, restrict this to your specific domain:
   ```python
   allow_origins=["https://yourdomain.com"]
   ```
5. **Lambda Permissions**: Lambda functions only have read permissions on the S3 bucket.

## Cost Estimation

The infrastructure uses the following AWS services with costs:

- **S3**: Storage costs based on data volume and requests
- **Lambda**: Pay per invocation and execution time
- **API Gateway**: Pay per API call
- **CloudWatch Logs**: Log storage costs

For a demo site with moderate traffic, the cost should remain within AWS Free Tier limits.

## Troubleshooting

### Deployment Fails

- Ensure AWS credentials are properly configured
- Check you have necessary IAM permissions
- Verify the bucket name is unique globally

### CORS Errors

- Verify the API Gateway CORS configuration
- Check that the Lambda functions return proper CORS headers

### Presigned URL Returns 403

- Verify the object exists in the S3 bucket
- Check the Lambda function has read permissions on the bucket
- Ensure the URL hasn't expired

## Support

For issues or questions, please open an issue on the project repository.
