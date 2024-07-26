import shutil
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
from train import start_training
from test import start_test

app = Flask(__name__)
CORS(app)

TRAIN_FOLDER = './train_data'
app.config['UPLOAD_FOLDER'] = TRAIN_FOLDER


@app.route('/test', methods=['GET'])
def test_endpoints():
    try:
        return jsonify({'message': 'Success'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/uploadTrain', methods=['POST'])
def upload_train():
    try:
        class_name = request.form['className']
        visitor_id = request.form['visitorId']

        if 'files[]' not in request.files:
            return jsonify({'error': 'No files part in the request'}), 400

        files = request.files.getlist('files[]')

        if not files:
            return jsonify({'error': 'No files provided'}), 400

        path = os.path.join(visitor_id, app.config['UPLOAD_FOLDER'])
        path = os.path.join(path, class_name)

        if os.path.exists(path):
            shutil.rmtree(path)

        os.makedirs(path)

        for file in files:
            if file.filename == '':
                continue

            filename = os.path.join(path, file.filename)
            file.save(filename)

        return jsonify({'message': 'Success'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/startTraining', methods=['POST'])
def train():
    try:
        epochs = int(request.form['epochs'])
        batch_size = int(request.form['batchSize'])
        learn_rate = float(request.form['learnRate'])
        pretrained = request.form['pretrained']
        visitor_id = request.form['visitorId']

        if not (epochs or batch_size or learn_rate):
            return jsonify({'error': 'No parameters provided'}), 400

        start_training(path=visitor_id, epochs=epochs, batch_size=batch_size, learn_rate=learn_rate,
                       pretrained=pretrained, model_save_path=os.path.join(visitor_id, 'model.h5'))

        return jsonify({'message': 'Success'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/uploadTest', methods=['POST'])
def test():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part in the request'}), 400

        file = request.files.get('file')
        test_model = request.form['testModel']
        x_index = request.form['xIndex']
        visitor_id = request.form['visitorId']

        if not file:
            return jsonify({'error': 'No file provided'}), 400

        if not os.path.exists(visitor_id):
            os.makedirs(visitor_id)

        file.save(os.path.join(visitor_id, "test.jpg"))

        predicted_class, probability = start_test(path=visitor_id, test_model=test_model, x_index=x_index)

        return jsonify({'message': 'Success', 'prediction': str(predicted_class+1),
                        'probability': str(round(probability*100, 2))}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/requestHeatmap', methods=['GET'])
def heatmap():
    try:
        method = request.args.get('method')
        visitor_id = request.args.get('visitorId')

        if method == "gradCam":
            image = "grad_cam.jpg"
        else:
            image = "sign_x.jpg"

        if not os.path.exists(os.path.join(visitor_id, image)):
            return jsonify({'error': 'No heatmap available'}), 400

        return send_file(os.path.join(visitor_id, image), mimetype='image/jpg')

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# if __name__ == '__main__':
#     app.run(host="0.0.0.0", port=5000,
#             ssl_context=("./cert/xai_mnd_thm_de.pem", "./cert/xai-server-ssl-cert.key")
#             )
