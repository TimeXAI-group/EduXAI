import os.path
import tensorflow as tf
from keras.utils import load_img, img_to_array
from keras.models import load_model, Model
import numpy as np
import cv2
import matplotlib.pyplot as plt
from signxai.utils.utils import aggregate_and_normalize_relevancemap_rgb, calculate_explanation_innvestigate


def start_test(path, test_model, x_index):

    if test_model == "fruits360":
        model = load_model("fruits360_model.h5")
    elif test_model == "vgg16fruits360":
        model = load_model("vgg16fruits360_model.h5")
    else:
        model = load_model(os.path.join(path, 'model.h5'))

    last_convolution_layer = None
    for layer in reversed(model.layers):
        if 'conv2d' in str(type(layer)).lower():
            last_convolution_layer = layer.name
            break

    img_path = os.path.join(path, 'test.jpg')

    target_shape = (224, 224)

    img = load_img(img_path, target_size=target_shape)
    img_array = img_to_array(img)
    img_array_normalized = img_array / 255.
    img_array_expanded = img_array_normalized[tf.newaxis, ...]

    score = model.predict(img_array_expanded)
    ind = int(np.argmax(score))
    index = ind

    if x_index != "predicted":
        ind = int(x_index)

    img_array = img_array.astype(np.uint8)

    last_conv_layer = model.get_layer(last_convolution_layer)
    heatmap_model = Model(model.inputs, [last_conv_layer.output, model.output])

    with tf.GradientTape() as tape:
        conv_outputs, predictions = heatmap_model(img_array_expanded)
        loss = predictions[:, ind]

    grads = tape.gradient(loss, conv_outputs)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    heatmap = tf.reduce_mean(tf.multiply(pooled_grads, conv_outputs[0]), axis=-1)
    heatmap = tf.maximum(heatmap, 0)
    max_value = np.max(heatmap)
    if max_value > 0:
        heatmap /= max_value

    heatmap = np.nan_to_num(heatmap)
    heatmap = cv2.resize(heatmap, target_shape)
    heatmap = np.uint8(255 * heatmap)

    heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
    superimposed_img = cv2.addWeighted(cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR), 0.4, heatmap, 0.6, 0)
    cv2.imwrite(os.path.join(path, "grad_cam.jpg"), superimposed_img)

    # #  Remove last layer's softmax activation (we need the raw values!)
    # model.layers[-1].activation = None
    #
    # x = img_to_array(img)
    # # 'RGB'->'BGR'
    # x = x[..., ::-1]
    # # Zero-centering based on ImageNet mean RGB values
    # mean = [103.939, 116.779, 123.68]
    # x[..., 0] -= mean[0]
    # x[..., 1] -= mean[1]
    # x[..., 2] -= mean[2]
    #
    # r = calculate_explanation_innvestigate(model, x, method='lrp.stdxepsilon', stdfactor=0.1, input_layer_rule='Z',
    #                                        neuron_selection=ind)
    # # Visualize heatmaps
    # fig, axs = plt.subplots(ncols=1, nrows=1, figsize=(2.92, 2.92), dpi=100)
    # axs.matshow(aggregate_and_normalize_relevancemap_rgb(r), cmap='seismic', clim=(-1, 1))
    # axs.axis('off')
    # plt.savefig(os.path.join(path, "sign_x.jpg"), bbox_inches='tight', dpi=100, pad_inches=0)

    return int(index), float(score[0][index])


# if __name__ == '__main__':
#     print(start_test("d0093721cd7ba98debfebc9f7aa37f19", test_model="own", x_index="1"))
