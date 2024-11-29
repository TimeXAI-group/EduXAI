import React, {useState} from 'react';
import {useDropzone} from 'react-dropzone';
import styled from 'styled-components';
import axios from 'axios';
import "./Dropzone.css"
import FingerprintJS from '@fingerprintjs/fingerprintjs'

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

const thumbInner = {
    display: 'flex',
    minWidth: 0,
    overflow: 'hidden'
};

const img = {
    display: 'block',
    width: '100%',
    aspectRatio: '1/1'
};

const DropzoneTrain = ({className, setClassName, visitorId, setVisitorId, setStatusElementText, setStatusElementDisplay,
                           otherStatusElementText, isUploadTrainDisabled, setIsUploadTrainDisabled,
                           setIsTrainDisabled, setOtherIsUploadTrainDisabled, setIsTestDisabled,
                           setResultsContainerDisplay, setResultsButtonText, setIsResultsButtonDisabled,
                           setStatusElementDisplayTrain, setStatusElementTextTrain, setPredictedClass, setProbability,
                           setXIndex, setTestFiles, setTestPreviewFiles, setStatusElementDisplayTest,
                           setStatusElementTextTest, setHeatmapContainerDisplay, setHeatmapSource, serverAddress,
                           setIsDownloadButtonDisabled, setStatusElementDisplayDownload,
                           setStatusElementTextDownload, setDownloaded}) => {

    const [files, setFiles] = useState([]);

    const {
        getRootProps,
        getInputProps,
        isFocused,
        isDragAccept,
        isDragReject,
        isDragActive
    } = useDropzone({
        disabled: isUploadTrainDisabled,
        accept: {
            'image/heic': ['.heic'],
            'image/png': ['.png'],
            'image/jpg': ['.jpg', '.jpeg']
        },
        onDrop: async acceptedFiles => {

            setResultsContainerDisplay("none");
            setResultsButtonText("Trainingsverlauf einblenden")
            setIsResultsButtonDisabled(true)
            setStatusElementDisplayTrain("none")
            setStatusElementTextTrain("")
            setStatusElementDisplayDownload("none")
            setStatusElementTextDownload("")

            setPredictedClass("")
            setProbability("")
            setXIndex("predicted")
            setTestFiles([])
            setTestPreviewFiles([])
            setStatusElementDisplayTest("none")
            setStatusElementTextTest("")
            setHeatmapContainerDisplay("none")
            setHeatmapSource("none")

            setIsUploadTrainDisabled(true)
            setOtherIsUploadTrainDisabled(true)
            setIsTrainDisabled(true)
            setIsTestDisabled(true)
            setIsDownloadButtonDisabled(true)
            setDownloaded(false)

            setStatusElementText("Upload läuft ...")
            setStatusElementDisplay("block")

            if (acceptedFiles.length < 10) {
                setFiles([])
                setStatusElementText("Mindestens 10 Dateien hochladen");
                setIsUploadTrainDisabled(false)
                setOtherIsUploadTrainDisabled(false)
                return;
            }

            // const flexbox = document.getElementById("flexbox")
            // const flex_direction = window.getComputedStyle(flexbox).getPropertyValue("flex-direction")
            // if (flex_direction === "row") {
            //     const difference = countOfFilesInOtherDropzone - validFiles.length
            //     console.log(difference)
            // }

            const heicImages = acceptedFiles.filter(file => file.type === "image/heic")
            const validHEICImages = heicImages.filter(file => file !== null);
            const notHEICImages = acceptedFiles.filter(file => file.type !== "image/heic")
            const convertedNotHEICImages = await Promise.all(notHEICImages.map(processFile));
            const validNotHEICImages = convertedNotHEICImages.filter(file => file !== null);

            let previewHEICImages = [];
            for (let i = 0; i < validHEICImages.length; i++) {
                const response = await fetch("HEIC_demo.png");
                const buffer = await response.arrayBuffer();
                const pngFile = new File([buffer], 'HEIC_demo'+String(i)+'.png', { type: 'image/png'});
                previewHEICImages[i] = Object.assign(pngFile, {
                    path: "HEIC_demo.png",
                    preview: URL.createObjectURL(pngFile)
                });
            }
            const previewFiles = validNotHEICImages.concat(previewHEICImages);
            const uploadFiles = validNotHEICImages.concat(validHEICImages);
            if (previewFiles.length === uploadFiles.length && previewFiles.length >= 10) {
                setFiles(previewFiles);
                await handleUpload(uploadFiles);
            }
            else {
                setStatusElementText("Weniger als 10 gültige Bilder");
                setIsUploadTrainDisabled(false)
                setOtherIsUploadTrainDisabled(false)
            }
        }
    });

    const getVisitorId = async () => {
        try {
            const fp = await FingerprintJS.load();
            const result = await fp.get();
            setVisitorId(result.visitorId);
            return result.visitorId;
        } catch (error) {
            console.error("Error getting visitorId:", error);
            throw error;
        }
    };

    const upload = async (acceptedFiles) => {
        // setButtonState(true)
        const formData = new FormData();
        formData.append('className', className);
        formData.append('visitorId', visitorId);
        acceptedFiles.forEach(file => {
            formData.append('files[]', file);
        });

        try {
            const response = await axios.post(serverAddress+'/uploadTrain', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            console.log(response.data);
            setStatusElementText(response.data['message']);
            if (otherStatusElementText === response.data['message']) {
                setIsTrainDisabled(false);
            }
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
                setStatusElementText("Upload fehlgeschlagen");
            }
        }
        setIsUploadTrainDisabled(false)
        setOtherIsUploadTrainDisabled(false)
    }

    const handleUpload = async (acceptedFiles) => {

        if (visitorId === null) {
            try {
                visitorId = await getVisitorId(); // Wartet, bis die Visitor ID gesetzt ist
                await upload(acceptedFiles)
            } catch (error) {
                console.error("Aktion konnte nicht ausgeführt werden:", error);
            }
        }
        else {
            await upload(acceptedFiles)
        }
    };

    const thumbs = files.slice(0,24).map(file => (
        <div className="thumb" key={file.name}>
            <div style={thumbInner}>
                <img
                    className="previewImage"
                    src={file.preview}
                    style={img}
                    // Revoke data uri after image is loaded
                    onLoad={() => { URL.revokeObjectURL(file.preview) }}
                    alt={"Preview"}
                />
            </div>
        </div>
    ));

    const loadSampleImages = async (className) => {

        setResultsContainerDisplay("none");
        setResultsButtonText("Trainingsverlauf einblenden")
        setIsResultsButtonDisabled(true)
        setStatusElementDisplayTrain("none")
        setStatusElementTextTrain("")
        setStatusElementDisplayDownload("none")
        setStatusElementTextDownload("")

        setPredictedClass("")
        setProbability("")
        setXIndex("predicted")
        setTestFiles([])
        setTestPreviewFiles([])
        setStatusElementDisplayTest("none")
        setStatusElementTextTest("")
        setHeatmapContainerDisplay("none")
        setHeatmapSource("none")

        setIsUploadTrainDisabled(true)
        setOtherIsUploadTrainDisabled(true)
        setIsTestDisabled(true)
        setIsDownloadButtonDisabled(true)
        setDownloaded(false)
        setIsTrainDisabled(true)

        let name;
        let textContent;
        if (className === "class1") {
            name = "apple"
            textContent = "Apfel"
        }
        else {
            name = "pear"
            textContent = "Birne"
        }
        let images = []
        for (let i = 0; i < 10; i++) {
            const filename = name+String(i)+".png"
            const response = await fetch(filename);
            const buffer = await response.arrayBuffer();
            const pngFile = new File([buffer], filename, { type: 'image/png'});
            images[i] = Object.assign(pngFile, {
                path: filename,
                preview: URL.createObjectURL(pngFile)
            });
        }

        setStatusElementText("Upload läuft ...");
        setStatusElementDisplay("block");
        setClassName(textContent);
        setFiles(images);
        await handleUpload(images);
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
                                reject(new Error('Canvas to Blob failed'));
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
                    <p>Dateien hier droppen</p>
                ) : (
                    <p>Bilder durch Drag and Drop oder Klicken hinzufügen</p>
                )}
            </Container>
            <aside style={thumbsContainer}>
                {thumbs}
            </aside>
            <button disabled={isUploadTrainDisabled} style={{marginTop: 5, marginBottom: 8}}
                    onClick={() => loadSampleImages(className)}>Probebilder nutzen</button>
        </section>
    );

}

export default DropzoneTrain;
