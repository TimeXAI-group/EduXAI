import shutil
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from celery import Celery
from celery.result import AsyncResult
import os
import base64
from train import start_training
from test import start_test
from PIL import Image
import pillow_heif
pillow_heif.register_heif_opener()


app = Flask(__name__)
celery = Celery(app.name, backend='redis://localhost:6379/0', broker='redis://localhost:6379/0')
celery.conf.broker_connection_retry_on_startup = True
celery.conf.task_routes = {"run_test": {"queue": "test_queue"}, "run_train": {"queue": "train_queue"}}
celery.conf.worker_prefetch_multiplier = 1
CORS(app)
app.config['UPLOAD_FOLDER'] = './train_data'


@app.route('/status', methods=['GET'])
def get_task_status():
    try:
        task_id = request.args.get('task_id')

        task = AsyncResult(task_id, app=celery)

        if task.state == 'PENDING':
            response = {
                'state': task.state,
                'message': 'Task has not started yet.'
            }
        elif task.state == 'STARTED':
            response = {
                'state': task.state,
                'message': 'Task is currently running.'
            }
        elif task.state == 'SUCCESS':
            response = {
                'state': task.state,
                'message': 'Task completed successfully!',
                'result': task.result
            }
            return jsonify(response), 200
        else:
            response = {
                'state': task.state,
                'message': 'Task failed or encountered an error.',
                'result': str(task.info)
            }
            return jsonify(response), 500

        return jsonify(response), 202

    except Exception as e:
        return jsonify({'message': 'Task anfordern fehlgeschlagen', "exception": str(e)}), 500


def convert_and_resize_image(image_file, size=(224, 224)):
    image = Image.open(image_file)
    image = image.resize(size, Image.Resampling.LANCZOS)
    return image


@app.route('/test', methods=['GET'])
def test_endpoints():
    try:
        return jsonify({'message': 'Success'}), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/uploadTrain', methods=['POST'])
def upload_train():
    try:
        class_name = request.form['className']
        visitor_id = request.form['visitorId']

        if 'files[]' not in request.files:
            return jsonify({'message': 'Keine Bilder vorhanden'}), 400

        files = request.files.getlist('files[]')

        if not files:
            return jsonify({'message': 'Keine Bilder vorhanden'}), 400

        path = os.path.join(visitor_id, app.config['UPLOAD_FOLDER'])
        path = os.path.join(path, class_name)

        if os.path.exists(path):
            shutil.rmtree(path)

        os.makedirs(path)

        for file in files:
            if file.filename == '':
                continue

            if str.lower(file.filename).endswith(".heic"):
                image = convert_and_resize_image(file)
                filename = os.path.splitext(file.filename)[0] + ".jpg"
                save_path = os.path.join(path, filename)
                image.save(save_path, format='JPEG')

            else:
                filename = os.path.join(path, file.filename)
                file.save(filename)

        return jsonify({'message': 'Upload abgeschlossen'}), 200

    except Exception as e:
        return jsonify({'message': "Upload fehlgeschlagen", "exception": str(e)}), 500


@app.route('/startTraining', methods=['POST'])
def train():
    try:
        epochs = int(request.form['epochs'])
        batch_size = int(request.form['batchSize'])
        learn_rate = float(request.form['learnRate'])
        pretrained = request.form['pretrained']
        visitor_id = request.form['visitorId']

        if not (epochs or batch_size or learn_rate or pretrained):
            return jsonify({'message': 'Keine Parameter übergeben'}), 400

        if pretrained == "own" and not os.path.isfile(os.path.join(visitor_id, 'model.h5')):
            return jsonify({'message': 'Kein trainiertes Modell vorhanden'}), 400

        task = run_train.delay(path=visitor_id, epochs=epochs, batch_size=batch_size, learn_rate=learn_rate,
                               pretrained=pretrained, model_save_path=os.path.join(visitor_id, 'model.h5'))

        return jsonify({"message": "Training läuft ...", "task_id": task.id}), 202

    except Exception as e:
        return jsonify({'message': "Training fehlgeschlagen", "exception": str(e)}), 500


@celery.task(name="run_train")
def run_train(path, epochs, batch_size, learn_rate, pretrained, model_save_path):

    history = start_training(path=path, epochs=epochs, batch_size=batch_size, learn_rate=learn_rate,
                             pretrained=pretrained, model_save_path=model_save_path)

    for key in history:
        history[key] = [round(value, 3) for value in history[key]]

    return {'message': 'Training abgeschlossen', 'accuracy': history['accuracy'], 'loss': history['loss'],
            'val_accuracy': history['val_accuracy'], 'val_loss': history['val_loss']}


@celery.task(name="run_test")
def run_test(path, test_model, x_index):

    predicted_class, probability = start_test(path=path, test_model=test_model, x_index=x_index)

    with open(os.path.join(path, "grad_cam.jpg"), "rb") as image_file:
        grad_cam_base64 = base64.b64encode(image_file.read()).decode('utf-8')

    # with open(os.path.join(path, "sign_x.jpg"), "rb") as image_file:
    #     sign_x_base64 = base64.b64encode(image_file.read()).decode('utf-8')

    return {'message': 'Test abgeschlossen',
            'prediction': str(predicted_class+1),
            'probability': str(round(probability*100, 2)),
            # 'signX': sign_x_base64,
            'gradCam': grad_cam_base64}


@app.route('/uploadTest', methods=['POST'])
def test():
    try:
        if 'file' not in request.files:
            return jsonify({'message': 'Keine Datei vorhanden'}), 400

        file = request.files.get('file')
        test_model = request.form['testModel']
        x_index = request.form['xIndex']
        visitor_id = request.form['visitorId']

        if not file:
            return jsonify({'message': 'Keine Datei vorhanden'}), 400

        if not os.path.exists(visitor_id):
            os.makedirs(visitor_id)

        if str.lower(file.filename).endswith(".heic"):
            image = convert_and_resize_image(file)
            image.save(os.path.join(visitor_id, "test.jpg"), format='JPEG')
        else:
            file.save(os.path.join(visitor_id, "test.jpg"))

        task = run_test.delay(path=visitor_id, test_model=test_model, x_index=x_index)

        return jsonify({"message": "Test läuft ...", "task_id": task.id}), 202

    except Exception as e:
        return jsonify({'message': "Test fehlgeschlagen", "exception": str(e)}), 500


@app.route('/requestModel', methods=['GET'])
def heatmap():
    try:
        visitor_id = request.args.get('visitorId')

        model_path = os.path.join(visitor_id, "model.h5")
        if not os.path.exists(model_path):
            return jsonify({'message': 'Kein Modell verfügbar'}), 400

        return send_file(model_path, as_attachment=True, mimetype='application/octet-stream', download_name='model.h5')

    except Exception as e:
        return jsonify({'message': 'Modell anfordern fehlgeschlagen', "exception": str(e)}), 500


# if __name__ == '__main__':
#     app.run(host="0.0.0.0", port=5000)
