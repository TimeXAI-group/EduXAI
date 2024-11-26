import React from 'react';
import {useDropzone} from 'react-dropzone';
import styled from 'styled-components';
import axios from 'axios';

const getColor = (props) => {
    if (props.$isDragAccept) {
        return '#2196f3';
    }
    if (props.$isDragReject) {
        return '#2196f3';
    }
    if (props.$isFocused) {
        return '#2196f3';
    }
    return '#eeeeee';
}

const Container = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  border-width: 2px;
  border-radius: 3px;
  border-color: ${props => getColor(props)};
  border-style: dashed;
  background-color: #fafafa;
  color: #bdbdbd;
  outline: none;
  transition: border .24s ease-in-out;
`;

const thumbsContainer = {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8
};

const thumb = {
    display: 'inline-flex',
    borderRadius: 2,
    border: '1px solid #4a5c66',
    margin: 4,
    // marginLeft: 8,
    width: "100%",
    // height: 50,
    padding: 4,
    boxSizing: 'border-box'
};

const thumbInner = {
    display: 'flex',
    minWidth: 0,
    width: "100%",
    overflow: 'hidden'
};

const img = {
    display: 'block',
    width: '100%',
    aspectRatio: '1/1'
    // height: ''
};

const select = {
    marginBottom: '10px'
}

function DropzoneTest ({className1, className2, visitorId, setStatusElementText, setStatusElementDisplay,
                           isTestDisabled, setIsTestDisabled, setIsUploadTrainDisabled1, setIsUploadTrainDisabled2,
                           setIsTrainDisabled, predictedClass, setPredictedClass, probability, setProbability, xIndex,
                           setXIndex, files, setFiles, previewFiles, setPreviewFiles, setHeatmapContainerDisplay,
                           setHeatmapSource}) {

    const handleChange = async (value) => {
        setIsTestDisabled(true);
        setIsUploadTrainDisabled1(true)
        setIsUploadTrainDisabled2(true)
        setIsTrainDisabled(true)
        setXIndex(value);
        await startTest(files[0], value);
    };

    const {
        getRootProps,
        getInputProps,
        isFocused,
        isDragAccept,
        isDragReject,
        isDragActive
    } = useDropzone({
        disabled: isTestDisabled,
        multiple: false,
        accept: {
            'image/heic': ['.heic'],
            'image/png': ['.png'],
            'image/jpg': ['.jpg', '.jpeg']
        },
        onDrop: async acceptedFiles => {

            setIsTestDisabled(true)
            setIsUploadTrainDisabled1(true)
            setIsUploadTrainDisabled2(true)
            setIsTrainDisabled(true)

            let file = acceptedFiles[0]
            let demo_file;
            if (file != null) {
                if (file.type === "image/heic") {
                    const response = await fetch("HEIC_demo.png");
                    const buffer = await response.arrayBuffer();
                    const pngFile = new File([buffer], 'HEIC_demo.png', { type: 'image/png'});
                    demo_file = Object.assign(pngFile, {
                        path: "HEIC_demo.png",
                        preview: URL.createObjectURL(pngFile)
                    });
                }
                else {
                    file = await processFile(file);
                    demo_file = file;
                }
                if (file != null && demo_file != null) {
                    setPreviewFiles([demo_file])
                    setFiles([file])
                    setXIndex("predicted")
                    await startTest(file, "predicted");
                }
                else {
                    setStatusElementText("Ungültiges Bild");
                    setStatusElementDisplay("block");
                    setIsTestDisabled(false)
                    setIsUploadTrainDisabled1(false)
                    setIsUploadTrainDisabled2(false)
                    setIsTrainDisabled(false)
                }
            }
            else {
                setStatusElementText("Ungültiges Bild");
                setStatusElementDisplay("block");
                setIsTestDisabled(false)
                setIsUploadTrainDisabled1(false)
                setIsUploadTrainDisabled2(false)
                setIsTrainDisabled(false)
            }
        }
    });

    const startTest = async (acceptedFile, index) => {

        setHeatmapContainerDisplay("none")
        setHeatmapSource("none")

        const formData = new FormData();
        formData.append('file', acceptedFile);
        formData.append("testModel", "own")
        formData.append("xIndex", index)
        formData.append("visitorId", visitorId)

        try {
            const response = await axios.post('https://xai.mnd.thm.de:3000/uploadTest', formData, {
            });
            console.log(response.data);
            setStatusElementText(response.data['message']);
            setStatusElementDisplay("block");

            let attempt = 0

            const interval = setInterval(() => {

                axios.get('https://xai.mnd.thm.de:3000/status', {
                    params: {
                        task_id: response.data["task_id"]
                    }
                })
                    .then(response => {
                        const taskStatus = response.data.state;
                        const taskMessage = response.data.message;

                        if (attempt >= 300) { //try not longer than 1 min
                            clearInterval(interval);
                            console.log(response.data)

                            setStatusElementText("Test fehlgeschlagen");
                            setIsTestDisabled(false)
                            setIsUploadTrainDisabled1(false)
                            setIsUploadTrainDisabled2(false)
                            setIsTrainDisabled(false)

                        } else if (taskStatus === 'SUCCESS') {
                            clearInterval(interval);
                            console.log(response.data.result)

                            setStatusElementText(response.data.result['message']);

                            if (response.data.result["prediction"] === "1") {
                                setPredictedClass(className1)
                            }
                            else {
                                setPredictedClass(className2)
                            }
                            setProbability(response.data.result["probability"])

                            //Todo: Start Übergangslösung
                            axios.get('https://xai.mnd.thm.de:3000/requestHeatmap', {
                                params: {
                                    method: 'gradCam',
                                    visitorId: visitorId
                                },
                                responseType: 'blob'
                            })
                                .then(response => {
                                    setHeatmapSource(URL.createObjectURL(response.data));
                                    setHeatmapContainerDisplay("flex")
                                })
                                .catch(error => {
                                    if (error.response && error.response.data) {
                                        const blob = error.response.data;
                                        const reader = new FileReader();
                                        reader.onload = () => {
                                            const text = reader.result;
                                            try {
                                                const json = JSON.parse(text);
                                                console.error('Fehler:', json['message']);
                                                console.error('Status:', error.response.status);
                                                if (json['exception'] !== undefined) {
                                                    console.error('Exception:', json['exception']);
                                                }
                                                setStatusElementText(json['message']);
                                            } catch (e) {
                                                console.error('Fehler beim Parsen der Fehlermeldung:', text);
                                            }
                                        };
                                        reader.readAsText(blob);
                                    } else if (error.request) {
                                        console.error('Keine Antwort vom Server erhalten:', error.request);
                                        setStatusElementText("Server nicht erreichbar");
                                    } else {
                                        console.error('Ein Fehler ist aufgetreten:', error.message);
                                        setStatusElementText("Heatmap anfordern fehlgeschlagen");
                                    }
                                });
                            //Todo: Ende Übergangslösung

                            setIsTestDisabled(false)
                            setIsUploadTrainDisabled1(false)
                            setIsUploadTrainDisabled2(false)
                            setIsTrainDisabled(false)

                        } else if (taskStatus === 'FAILURE') {
                            clearInterval(interval);
                            console.log(response.data)

                            setStatusElementText("Test fehlgeschlagen");
                            setIsTestDisabled(false)
                            setIsUploadTrainDisabled1(false)
                            setIsUploadTrainDisabled2(false)
                            setIsTrainDisabled(false)
                        }

                        attempt++;

                        console.log('Task Status:', taskStatus);
                        console.log('Task Info:', taskMessage);
                    })
                    .catch(error => {
                        clearInterval(interval);  // Stoppt das Polling im Fehlerfall
                        console.error('Fehler beim Abrufen des Task-Status:', error);
                        setStatusElementText("Test fehlgeschlagen");
                        setIsTestDisabled(false)
                        setIsUploadTrainDisabled1(false)
                        setIsUploadTrainDisabled2(false)
                        setIsTrainDisabled(false)
                    });
            }, 200);  // Alle 0,2 Sekunden

        } catch (error) {
            if (error.response) {
                console.error('Fehler:', error.response.data['message']);
                console.error('Status:', error.response.status);
                if (error.response.data['exception'] !== undefined) {
                    console.error('Exception:', error.response.data['exception']);
                }
                setStatusElementText(error.response.data['message']);
            } else if (error.request) {
                console.error('Keine Antwort vom Server erhalten:', error.request);
                setStatusElementText("Server nicht erreichbar");
            } else {
                console.error('Ein Fehler ist aufgetreten:', error.message);
                setStatusElementText("Test fehlgeschlagen");
            }
            setIsTestDisabled(false)
            setIsUploadTrainDisabled1(false)
            setIsUploadTrainDisabled2(false)
            setIsTrainDisabled(false)
        }
    };

    const thumbs = previewFiles.map(file => (
        <div style={thumb} key={file.name}>
            <div style={thumbInner}>
                <img
                    src={file.preview}
                    style={img}
                    // Revoke data uri after image is loaded
                    onLoad={() => { URL.revokeObjectURL(file.preview) }}
                    alt="Preview"
                />
            </div>
        </div>
    ));

    const loadSampleImage = async () => {
        setIsTestDisabled(true)
        setIsUploadTrainDisabled1(true)
        setIsUploadTrainDisabled2(true)
        setIsTrainDisabled(true)

        const filename = (Math.random()<0.5 ? "apple" : "pear")+String(Math.floor(Math.random()*10))+".png"
        const response = await fetch(filename);
        const buffer = await response.arrayBuffer();
        const jpgFile = new File([buffer], filename, { type: 'image/png'});
        const file = Object.assign(jpgFile, {
            path: filename,
            preview: URL.createObjectURL(jpgFile)
        });

        setPreviewFiles([file])
        setFiles([file])
        setXIndex("predicted")
        await startTest(file, "predicted");
    }

    const processFile = async (file) => {

        const resizeImage = (blob) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                const reader = new FileReader();

                reader.onload = (event) => {
                    img.src = event.target.result;

                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = 224;
                        canvas.height = 224;

                        ctx.drawImage(img, 0, 0, 224, 224);

                        canvas.toBlob((resizedBlob) => {
                            if (resizedBlob) {
                                resolve(resizedBlob);
                            } else {
                                reject(new Error('Canvas toBlob failed'));
                            }
                        }, 'image/jpeg', 1);
                    };
                };

                reader.readAsDataURL(blob);
            });
        };

        try {
            const file_name = file.name;
            const file_type = file.type;
            file = await resizeImage(file);
            file = new File([file], file_name, { type: file_type});
            return Object.assign(file, {
                path: file_name,
                preview: URL.createObjectURL(file)
            });
        } catch (e) {
            console.error('Error processing file:', e);
            return null;
        }
    };

    return (
        <section className="container">
            <Container {...getRootProps({
                className: 'dropzone',
                $isFocused: isFocused,
                $isDragAccept: isDragAccept,
                $isDragReject: isDragReject
            })}>
                <input {...getInputProps()} />
                {isDragActive ? (
                    <p>Datei hier droppen</p>
                ) : (
                    <p>Bild durch Drag and Drop oder Klicken hinzufügen</p>
                )}
            </Container>
            <aside style={thumbsContainer}>
                {thumbs}
            </aside>
            <div>
                <button disabled={isTestDisabled} onClick={() => loadSampleImage()}
                        style={{marginTop: 5, marginBottom: 5}}>Probebild nutzen</button>
            </div>
            {/*<label>*/}
            {/*    <b>Modell: </b>*/}
            {/*    <select style={button} value={testModel} onChange={e => setTestModel(e.target.value)}>*/}
            {/*        <option value="own">Eigenes</option>*/}
            {/*        <option value="fruits360">Fruits360</option>*/}
            {/*        <option value="vgg16fruits360">VGG16+Fruits360</option>*/}
            {/*    </select>*/}
            {/*</label>*/}
            {/*<br></br>*/}
            <label>
                <b>Erklärbarkeitsindex: </b>
                <select disabled={isTestDisabled} style={select} value={xIndex}
                        onChange={e => handleChange(e.target.value)}>
                    <option value="predicted">Standard</option>
                    <option value="0">{className1}</option>
                    <option value="1">{className2}</option>
                </select>
            </label>
            <div>
                <b>Vorhergesagte Klasse: {predictedClass}
                    <br></br>
                Wahrscheinlichkeit: {probability}%
                </b>
            </div>
        </section>
    );
}

export default DropzoneTest;
