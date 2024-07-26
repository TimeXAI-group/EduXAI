import os.path
import tensorflow as tf
from keras.api._v2.keras.preprocessing import image
from keras.api._v2.keras.models import load_model, Model
import numpy as np
import cv2
import matplotlib.pyplot as plt
from signxai.methods.wrappers import calculate_relevancemap
from signxai.utils.utils import (load_image, aggregate_and_normalize_relevancemap_rgb,
                                 calculate_explanation_innvestigate)


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

    img = image.load_img(img_path, target_size=target_shape)
    img_array = image.img_to_array(img)
    img_array_normalized = img_array / 255.
    img_array_expanded = img_array_normalized[tf.newaxis, ...]

    score = model.predict(img_array_expanded)
    print(score)
    ind = np.argmax(score)
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

    #  Remove last layer's softmax activation (we need the raw values!)
    model.layers[-1].activation = None

    # img, x = load_image(img_path)

    # Calculate relevancemaps
    # R1 = calculate_relevancemap('lrpz_epsilon_0_1_std_x', np.array(x), model)
    # R2 = calculate_relevancemap('lrpsign_epsilon_0_1_std_x', np.array(x), model)

    # Equivalent relevance maps as for R1 and R2, but with direct access to innvestigate and parameters
    # R3 = calculate_explanation_innvestigate(model, x, method='lrp.stdxepsilon', stdfactor=0.1, input_layer_rule='Z', neuron_selection=ind)
    # R4 = calculate_explanation_innvestigate(model, x, method='lrp.stdxepsilon', stdfactor=0.1, input_layer_rule='SIGN')

    # Visualize heatmaps
    # fig, axs = plt.subplots(ncols=1, nrows=1, figsize=(10, 10))
    # axs[0][0].imshow(img)
    # axs[1][0].imshow(img)
    # axs[0][1].matshow(aggregate_and_normalize_relevancemap_rgb(R1), cmap='seismic', clim=(-1, 1))
    # axs[0][2].matshow(aggregate_and_normalize_relevancemap_rgb(R2), cmap='seismic', clim=(-1, 1))
    # axs.matshow(aggregate_and_normalize_relevancemap_rgb(R3), cmap='seismic', clim=(-1, 1))
    # axs[1].matshow(aggregate_and_normalize_relevancemap_rgb(R4), cmap='seismic', clim=(-1, 1))

    # plt.savefig(os.path.join(path, "sign_x.jpg"), bbox_inches='tight')

    return index, score[0][index]


# if __name__ == '__main__':
#     print(start_test("069e0a7249f84f7f276bd051bbb3d687", test_model="fruits360", x_index="predicted"))
