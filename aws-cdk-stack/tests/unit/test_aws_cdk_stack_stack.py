import aws_cdk as core
import aws_cdk.assertions as assertions

from aws_cdk_stack.aws_cdk_stack_stack import S3SignedUrlAccessStack

# example tests. To run these tests, uncomment this file along with the example
# resource in aws_cdk_stack/aws_cdk_stack_stack.py
def test_sqs_queue_created():
    app = core.App()
    stack = S3SignedUrlAccessStack(app, "aws-cdk-stack")
    template = assertions.Template.from_stack(stack)
#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })
