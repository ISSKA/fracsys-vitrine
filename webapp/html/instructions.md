Now I want to download the .vtp file from AWS S3.
This works like this:
1. First get a signed url from https://xhx5lqfvq1.execute-api.eu-central-1.amazonaws.com/prod/download-url?key=output_scene.vtp
2. This REST API endpoint returns a JSON object. It has a key named "signedUrl". Extract the vaule of this key and use it to download the model.
3. Display the model.

I want to keep the file upload button the control section. But add another button
to optionally download the model from the cloud.