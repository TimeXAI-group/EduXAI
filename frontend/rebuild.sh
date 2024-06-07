docker stop edu-xai-app-v1.0
docker rm edu-xai-app-v1.0
docker rmi edu-xai-app:v1.0
docker build -t edu-xai-app:v1.0 .
docker run -it -d -p 443:3000 --name edu-xai-app-v1.0 edu-xai-app:v1.0
