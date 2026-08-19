from constructs import Construct
import aws_cdk as cdk
from aws_cdk import (
    Stack,
    Duration,
    aws_s3 as s3,
    aws_lambda as _lambda,
    aws_apigateway as apigw,
)

URL_EXPIRES_SECONDS = 60

class S3SignedUrlAccessStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # 1) S3 Bucket für deine 3D-Modelle (privat)
        models_bucket = s3.Bucket(
            self,
            "fracsys-models-20251127",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            enforce_ssl=True,
            versioned=False,
            cors=[
                s3.CorsRule(
                    allowed_methods=[s3.HttpMethods.GET],    # für Download
                    allowed_origins=["*"],
                    # allowed_origins=["https://fracsys-vitrine.ch"],
                    allowed_headers=["*"],
                )
            ],
        )

        # 2) Lambda Function, die Signed URLs für den Upload erzeugt
        download_url_lambda = _lambda.Function(
            self,
            "DownloadUrlLambda",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="download_url_handler.handler",
            code=_lambda.Code.from_asset("lambda"),
            timeout=Duration.seconds(10),
            environment={
                "BUCKET_NAME": models_bucket.bucket_name,
                "DEFAULT_EXPIRES_SECONDS": str(URL_EXPIRES_SECONDS),
            },
        )

        upload_url_lambda = _lambda.Function(
            self,
            "UploadUrlLambda",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="upload_url_handler.handler",
            code=_lambda.Code.from_asset("lambda"),
            timeout=Duration.seconds(10),
            environment={
                "BUCKET_NAME": models_bucket.bucket_name,
                "DEFAULT_EXPIRES_SECONDS": str(URL_EXPIRES_SECONDS),
            },
        )

        # Berechtigungen: Lambda darf aus dem Bucket lesen (für presigned URLs)
        # Nur diese beiden Operationen sind erlaubt.
        models_bucket.grant_read(download_url_lambda)
        models_bucket.grant_put(upload_url_lambda)

        # 3) API Gateway REST API
        api = apigw.RestApi(
            self,
            "SignedUrlApi",
            rest_api_name="S3SignedUrlApi",
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,  # später evtl. auf deine Domain einschränken
                allow_methods=["GET", "POST", "OPTIONS"],
            ),
        )

        # infrastructre for /signed_url
        download_url_resource = api.root.add_resource("download-url")
        download_url_integration = apigw.LambdaIntegration(
            download_url_lambda,
            proxy=True,
        )
        download_url_resource.add_method("GET", download_url_integration)

        # signed url for upload (PUT)
        upload_url_resource = api.root.add_resource("upload-url")
        upload_url_integration = apigw.LambdaIntegration(
            upload_url_lambda,
            proxy=True,
        )
        upload_url_resource.add_method("GET", upload_url_integration)

        # Optional: Endpoint-URL als Output
        cdk.CfnOutput(
            self,
            "SignedUrlDownloadEndpoint",
            value=api.url + "download-url",
            description="API endpoint for generating signed URLs used for downloading",
        )

        cdk.CfnOutput(
            self,
            "SignedUrlUploadEndpoint",
            value=api.url + "upload-url",
            description="API endpoint for generating signed URLs used for uploading",
        )
