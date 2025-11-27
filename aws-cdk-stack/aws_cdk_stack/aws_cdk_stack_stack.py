from constructs import Construct
import aws_cdk as cdk
from aws_cdk import (
    Stack,
    Duration,
    aws_s3 as s3,
    aws_lambda as _lambda,
    aws_apigateway as apigw,
)

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
        )

        # 2) Lambda Function, die Signed URLs erzeugt
        signed_url_lambda = _lambda.Function(
            self,
            "SignedUrlLambda",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="signed_url_handler.handler",
            code=_lambda.Code.from_asset("lambda"),
            timeout=Duration.seconds(10),
            environment={
                "BUCKET_NAME": models_bucket.bucket_name,
                "DEFAULT_EXPIRES_SECONDS": "3600",  # 1 Stunde
            },
        )

        # Berechtigungen: Lambda darf aus dem Bucket lesen (für presigned URLs)
        models_bucket.grant_read(signed_url_lambda)

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

        # /signed-url Resource
        signed_url_resource = api.root.add_resource("signed-url")

        # GET /signed-url
        signed_url_integration = apigw.LambdaIntegration(
            signed_url_lambda,
            proxy=True,
        )
        signed_url_resource.add_method("GET", signed_url_integration)

        # signed url for upload (PUT)
        upload_url_resource = api.root.add_resource("upload-url")
        upload_url_resource.add_method("GET", apigw.LambdaIntegration(signed_url_lambda))

        # Optional: Endpoint-URL als Output
        cdk.CfnOutput(
            self,
            "SignedUrlDownloadEndpoint",
            value=api.url + "signed-url",
            description="API endpoint for generating signed URLs",
        )

        cdk.CfnOutput(
            self,
            "SignedUrlUploadEndpoint",
            value=api.url + "upload-url",
            description="API endpoint for generating signed URLs",
        )
