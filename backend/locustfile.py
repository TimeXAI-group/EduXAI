from locust import HttpUser, task, between
import os
import random
import time


class WebsiteUser(HttpUser):
    wait_time = between(1, 5)  # Zeit in Sekunden zwischen Anfragen der Benutzer

    @task
    def process(self):
        def upload_train(visitor_id, class_name):
            images = [f for f in os.listdir(f"test/{class_name}") if f.endswith(('png', 'jpg', 'jpeg'))]
            files = [('files[]', open(os.path.join(f"test/{class_name}", img), 'rb')) for img in images]
            if class_name == "apple":
                class_name = "class1"
            else:
                class_name = "class2"
            payload = {
                "className": class_name,
                "visitorId": visitor_id
            }
            response = self.client.post("/uploadTrain", files=files, data=payload)
            for _, img in files:
                img.close()
            # print(response.status_code)
            if not response.ok:
                upload_train(visitor_id, class_name)

        def train(visitor_id):
            payload = {
                "epochs": "10",
                "batchSize": "1",
                "learnRate": "0.0001",
                "pretrained": "false",
                "visitorId": visitor_id
            }
            response = self.client.post("/startTraining", data=payload)
            print(visitor_id, "TRAINING ANGEFRAGT")
            # print(response.status_code)
            if not response.ok:
                train(visitor_id)
            task_id = response.json()["task_id"]

            while True:
                time.sleep(0.5)
                response = self.client.get(f"/status?task_id={task_id}")
                # print(response.status_code)
                state = response.json()["state"]
                if state == "SUCCESS":
                    print(visitor_id, "TRAINING FERTIG")
                    break
                elif state == "FAILURE":
                    train(visitor_id)

        def test(visitor_id):
            image_file = open("test/r0_43.jpg", 'rb')
            files = {'file': ('image.jpg', image_file, 'image/jpeg')}
            payload = {
                "testModel": "own",
                "xIndex": "predicted",
                "visitorId": visitor_id
            }
            response = self.client.post("/uploadTest", files=files, data=payload)
            print(visitor_id, "TEST ANGEFRAGT")
            image_file.close()
            # print(response.status_code)
            if not response.ok:
                test(visitor_id)
            task_id = response.json()["task_id"]

            while True:
                time.sleep(0.2)
                response = self.client.get(f"/status?task_id={task_id}")
                # print(response.status_code)
                state = response.json()["state"]
                if state == "SUCCESS":
                    print(visitor_id, "TEST FERTIG")
                    break
                elif state == "FAILURE":
                    test(visitor_id)

            response = self.client.get(f"/requestHeatmap?method=gradCam&visitorId={visitor_id}")
            # print(response.status_code)
            if not response.ok:
                test(visitor_id)

        visitor_id = str(random.randint(100000, 999999))
        upload_train(visitor_id, "apple")
        upload_train(visitor_id, "pear")
        train(visitor_id)
        test(visitor_id)
