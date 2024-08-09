import React, {useState} from 'react';
import {useDropzone} from 'react-dropzone';
import styled from 'styled-components';
import axios from 'axios';

const getColor = (props) => {
    if (props.isDragAccept) {
        return '#00e676';
    }
    if (props.isDragReject) {
        return '#ff1744';
    }
    if (props.isFocused) {
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

const button = {
    margin: '10px 0 10px 0'
}

const select = {
    marginBottom: '10px'
}

function DropzoneTest ({ className1, className2, visitorId }) {
    const [predictedClass, setPredictedClass] = useState('');
    const [probability, setProbability] = useState('');
    const [testModel, setTestModel] = useState('own');
    const [xIndex, setXIndex] = useState('predicted');
    const [files, setFiles] = useState([]);
    const [previewFiles, setPreviewFiles] = useState([]);


    const handleChange = (value) => {
        const statusElement = document.getElementById('testStatus');
        statusElement.textContent = "Test läuft ...";
        statusElement.style.display = "block";
        setXIndex(value);
        startTest(files[0], value);
    };

    const {
        getRootProps,
        getInputProps,
        isFocused,
        isDragAccept,
        isDragReject,
        isDragActive
    } = useDropzone({
        multiple: false,
        accept: {
            'image/heic': ['.heic'],
            'image/png': ['.png'],
            'image/jpg': [".jpg", '.jpeg']
        },
        onDrop: async acceptedFiles => {

            const statusElement = document.getElementById('testStatus');
            statusElement.textContent = "Test läuft ...";
            statusElement.style.display = "block";

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
                setPreviewFiles([demo_file])
                setFiles([file])
                startTest(file, "predicted");
            }
            else {
                statusElement.textContent = "Image is null";
            }

            //Option 0
            // const updatedFiles = acceptedFiles.map(file => Object.assign(file, {
            //     preview: URL.createObjectURL(file)
            // }));
            // setFiles(updatedFiles);
            // startTest(acceptedFiles, xIndex);
        }
    });

    const startTest = async (acceptedFile, index) => {
        const statusElement = document.getElementById('testStatus');
        // statusElement.textContent = "Test läuft ...";
        // statusElement.style.display = "block";
        const formData = new FormData();
        formData.append('file', acceptedFile);
        formData.append("testModel", testModel)
        formData.append("xIndex", index)
        formData.append("visitorId", visitorId)

        try {
            const response = await axios.post('https://xai.mnd.thm.de:3000/uploadTest', formData, {
            });
            console.log(response.data);
            if (response.data['message']==='Success') {
                statusElement.textContent = "Test abgeschlossen";
                if (response.data["prediction"] === "1") {
                    setPredictedClass(document.getElementById('className1').value)
                }
                else {
                    setPredictedClass(document.getElementById('className2').value)
                }
                setProbability(response.data["probability"])

                //Todo: Start Übergangslösung
                fetch('https://xai.mnd.thm.de:3000/requestHeatmap?method=gradCam&visitorId='+visitorId)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.blob(); // Lese die Antwort als Blob (Bild)
                    })
                    .then(blob => {
                        const imgUrl = URL.createObjectURL(blob);
                        const imgElement = document.getElementById('heatmap');
                        imgElement.src = imgUrl;
                        const imgContainerElement = document.getElementById('heatmapContainer');
                        imgContainerElement.style.display = "flex";
                        // const imgButtonElement = document.getElementById('heatmapButton');
                        // imgButtonElement.style.margin = "10px 0 10px 0"
                    })
                    .catch(error => {
                        console.error('Error fetching heatmap image:', error);
                    });
                //Todo: Ende Übergangslösung
            }
        } catch (error) {
            console.error('Error uploading file: ', error);
            statusElement.textContent = "Test fehlgeschlagen";
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
                />
            </div>
        </div>
    ));

    return (
        <section className="container">
            <Container {...getRootProps({className: 'dropzone', isFocused, isDragAccept, isDragReject})}>
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
                <select style={select} value={xIndex} onChange={e => handleChange(e.target.value)}>
                    <option value="predicted">Standard</option>
                    <option value="0">{className1}</option>
                    <option value="1">{className2}</option>
                </select>
            </label>
            {/*<button style={button} onClick={() => startTest(files)}>Bild testen</button>*/}
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
