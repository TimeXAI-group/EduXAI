docker stop edu-xai-api-v1.0
docker rm edu-xai-api-v1.0
docker rmi edu-xai-api:v1.0
docker build -t edu-xai-api:v1.0 .
docker run -it -d -p 3000:5000 --name edu-xai-api-v1.0 edu-xai-api:v1.0
