import os.path
from keras.api._v2.keras.models import Sequential, load_model, Model
from keras.api._v2.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout
from keras.api._v2.keras.preprocessing.image import ImageDataGenerator
from keras.api._v2.keras.optimizers import Adam
from keras.api._v2.keras.callbacks import EarlyStopping
from keras.api._v2.keras.applications import VGG16


def start_training(path, epochs, batch_size, learn_rate, pretrained, model_save_path):
    train_data_dir = os.path.join(path, 'train_data')
    num_classes = len(os.listdir(train_data_dir))
    input_shape = (224, 224, 3)
    target_shape = (224, 224)

    train_datagen = ImageDataGenerator(
        rescale=1/255.,
        shear_range=0.2,
        zoom_range=0.2,
        horizontal_flip=True,
        validation_split=0.2
    )

    train_generator = train_datagen.flow_from_directory(
        train_data_dir,
        target_size=target_shape,
        batch_size=batch_size,
        class_mode='categorical',
        subset='training'
    )

    validation_generator = train_datagen.flow_from_directory(
        train_data_dir,
        target_size=target_shape,
        batch_size=batch_size,
        class_mode='categorical',
        subset='validation'
    )

    if pretrained == "false":
        model = Sequential([
            Conv2D(32, (3, 3), activation='relu', padding='same', input_shape=input_shape),
            MaxPooling2D((2, 2)),
            Conv2D(64, (3, 3), activation='relu', padding='same'),
            MaxPooling2D((2, 2)),
            Conv2D(128, (3, 3), activation='relu', padding='same'),
            MaxPooling2D((2, 2)),
            Conv2D(256, (3, 3), activation='relu', padding='same'),
            MaxPooling2D((2, 2)),
            Flatten(),
            Dense(512, activation='relu'),
            Dropout(0.5),
            Dense(num_classes, activation='softmax')
        ])
    elif pretrained == "vgg16":
        # pretrained_model = VGG16(weights='imagenet', include_top=False, input_shape=input_shape)
        pretrained_model = load_model("vgg16_model.h5")
        model = Sequential()
        for layer in pretrained_model.layers:
            layer.trainable = False
            model.add(layer)
        model.add(Flatten())
        model.add(Dense(512, activation='relu'))
        model.add(Dropout(0.5))
        model.add(Dense(num_classes, activation='softmax'))
    else:
        if pretrained == "fruits360":
            model = load_model("fruits360_model.h5")
        elif pretrained == "own":
            model = load_model(model_save_path)
        else:
            model = load_model("vgg16fruits360_model.h5")

        model.trainable = False
        model.layers[-6].trainable = True
        model.layers[-5].trainable = True
        x = model.layers[-5].output
        x = Flatten()(x)
        x = Dense(512, activation='relu')(x)
        x = Dropout(0.5)(x)
        x = Dense(num_classes, activation='softmax')(x)
        model = Model(inputs=model.input, outputs=x)

    optimizer = Adam(learning_rate=learn_rate)
    model.compile(optimizer=optimizer,
                  loss='binary_crossentropy',
                  metrics=['accuracy'])

    history = model.fit(
        train_generator,
        steps_per_epoch=train_generator.samples // batch_size,
        epochs=epochs,
        validation_data=validation_generator,
        validation_steps=validation_generator.samples // batch_size,
        callbacks=[EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)]
    )

    model.save(model_save_path)

    return history.history


def create_pretrained_fruits360_model(epochs, batch_size, learn_rate):
    start_training(path="pretraining", epochs=epochs, batch_size=batch_size, learn_rate=learn_rate, pretrained="false",
                   model_save_path=os.path.join("pretraining", "fruits360_model.h5"))


def create_pretrained_vgg16fruits360_model(epochs, batch_size, learn_rate):
    start_training(path="pretraining", epochs=epochs, batch_size=batch_size, learn_rate=learn_rate, pretrained="vgg16",
                   model_save_path=os.path.join("pretraining", "vgg16fruits360_model.h5"))


# if __name__ == '__main__':
#     create_pretrained_fruits360_model(epochs=10, batch_size=8, learn_rate=0.001)
#     create_pretrained_vgg16fruits360_model(epochs=50, batch_size=64, learn_rate=0.0001)
#     start_training(path="069e0a7249f84f7f276bd051bbb3d687", epochs=3, batch_size=4, learn_rate=0.0001,
#                    pretrained="fruits360",
#                    model_save_path=os.path.join("069e0a7249f84f7f276bd051bbb3d687", "model.h5"))
