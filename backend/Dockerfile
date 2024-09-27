# HOW TO create docker image
# docker build -t $IMAGENAME$:$IMAGETAG$ . --no-cache

# Use ubuntu 22.04 with python 3.10
FROM ubuntu:22.04

# Tell debian that no interactive frontend is available
ARG DEBIAN_FRONTEND=noninteractive

# Run some default installations
RUN apt-get update && \
    apt-get install -y iputils-ping nano wget curl libcurl4-openssl-dev libssl-dev \
    libsm6 libxext6 libxrender-dev python3-pip python3-graphviz apt-transport-https && \
    apt-get install -y libgl1-mesa-glx redis-server && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create a new user for running celery
# RUN useradd -ms /bin/bash celeryuser

# Switch workdir to /home, copy requirements and setup file and install requirements via pip
WORKDIR /home
COPY requirements.txt /home
RUN pip3 install -r requirements.txt

# Copy the entire project to the container
COPY . /home

# RUN chown -R celeryuser:celeryuser /home

# Add a line to the .bashrc file that sets the PYTHONPATH on each login
RUN echo 'export PYTHONPATH='..:.:../..'' >> ~/.bashrc

# HOW TO build and start container
# docker run -it -d -v /mnt/volume:/data --name $CONTAINERNAME$ $IMAGENAME$:$IMAGETAG$ bash

# Expose the port your application runs on (adjust as needed)
EXPOSE 5000
#EXPOSE 5555

#CMD ["gunicorn", "--certfile=./cert/xai_mnd_thm_de.pem", "--keyfile=./cert/xai-server-ssl-cert.key", "--bind", "0.0.0.0:5000", "endpoints:app"]

CMD service redis-server start && \
    celery -A endpoints.celery worker -n celery_worker_1 -Q test_queue --concurrency=1 --loglevel=info & \
#    --uid=celeryuser
    CORES=$(cat /proc/cpuinfo | grep processor | wc -l) && \
    for i in $(seq 2 $CORES); do \
        celery -A endpoints.celery worker -n celery_worker_$i -Q train_queue --concurrency=1 --loglevel=info & \
    done && \
#    celery -A endpoints.celery flower & \
    gunicorn --certfile=./cert/xai_mnd_thm_de.pem --keyfile=./cert/xai-server-ssl-cert.key --workers $(cat /proc/cpuinfo | grep processor | wc -l) --bind 0.0.0.0:5000 endpoints:app