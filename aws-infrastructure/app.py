#!/usr/bin/env python3
import os

import aws_cdk as cdk

from aws_cdk_stack.aws_cdk_stack_stack import S3SignedUrlAccessStack


app = cdk.App()
S3SignedUrlAccessStack(app, "S3SignedUrlAccessStack")

app.synth()
