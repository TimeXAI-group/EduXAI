import React, {useState} from 'react';
import {useDropzone} from 'react-dropzone';
import styled from 'styled-components';
import axios from 'axios';
import "./Dropzone.css"


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

const thumbInner = {
    display: 'flex',
    minWidth: 0,
    overflow: 'hidden'
};

const img = {
    display: 'block',
    width: '100%',
    aspectRatio: '1/1'
    // height: ''
};

const button = {
    marginTop: 10,
};

const DropzoneTrain = ({ setButtonState, className, visitorId }) => {
    const asideID = "aside"+className.slice(-1);
    const [files, setFiles] = useState([]);
    const {
        getRootProps,
        getInputProps,
        isFocused,
        isDragAccept,
        isDragReject,
        isDragActive
    } = useDropzone({
        accept: {
            'image/heic': ['.heic'],
            'image/png': ['.png'],
            'image/jpg': [".jpg", '.jpeg']
        },
        onDrop: async acceptedFiles => {

            let statusElement;
            // let countOfFilesInOtherDropzone;
            if (className === "class1") {
                statusElement = document.getElementById('uploadStatus1');
                // countOfFilesInOtherDropzone = document.getElementById("aside2").childElementCount;
            }
            else {
                statusElement = document.getElementById('uploadStatus2');
                // countOfFilesInOtherDropzone = document.getElementById("aside1").childElementCount;
            }

            if (acceptedFiles.length < 10) {
                setFiles([])

                statusElement.textContent = "Mindestens 10 Dateien hochladen!";
                statusElement.style.display = "block";
                setButtonState(true)
                return;
            }

            statusElement.textContent = "Upload läuft ...";
            statusElement.style.display = "block";
            setButtonState(true)

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
                const pngFile = new File([buffer], 'HEIC_demo.'+String(i)+'png', { type: 'image/png'});
                previewHEICImages[i] = Object.assign(pngFile, {
                    path: "HEIC_demo.png",
                    preview: URL.createObjectURL(pngFile)
                });
            }
            setFiles(validNotHEICImages.concat(previewHEICImages));
            
            await handleUpload(validNotHEICImages.concat(validHEICImages));
        }
    });

    const handleUpload = async (acceptedFiles) => {
        // setButtonState(true)
        let statusElement;
        let otherStatusElement;
        if (className === "class1") {
            statusElement = document.getElementById('uploadStatus1');
            otherStatusElement = document.getElementById('uploadStatus2');
        }
        else {
            statusElement = document.getElementById('uploadStatus2');
            otherStatusElement = document.getElementById('uploadStatus1');
        }
        // statusElement.textContent = "Upload läuft ...";
        // statusElement.style.display = "block";
        const formData = new FormData();
        formData.append('className', className);
        formData.append('visitorId', visitorId);
        acceptedFiles.forEach(file => {
            formData.append('files[]', file);
        });

        try {
            const response = await axios.post('http://localhost:5000/uploadTrain', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            console.log(response.data);
            if (response.data['message']==='Success') {
                statusElement.textContent = "Upload abgeschlossen";
                if (otherStatusElement.textContent === "Upload abgeschlossen") {
                    setButtonState(false)
                }
            }
        } catch (error) {
            console.error('Error uploading file: ', error);
            statusElement.textContent = "Upload fehlgeschlagen";
            setButtonState(true)
        }
    };

    // useEffect(() => {
    //     // Clean up previews when component unmounts
    //     return () => {
    //         files.forEach(file => URL.revokeObjectURL(file.preview));
    //     };
    // }, [files]);

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

    return (
        <section className="container">
            <Container {...getRootProps({className: 'dropzone', isFocused, isDragAccept, isDragReject})}>
                <input {...getInputProps()} />
                {isDragActive ? (
                    <p>Dateien hier droppen</p>
                ) : (
                    <p>Bilder durch Drag and Drop oder Klicken hinzufügen</p>
                )}
            </Container>
            <aside id={asideID} style={thumbsContainer}>
                {thumbs}
            </aside>
            {/*<button style={button} onClick={handleUpload}>Bilder hochladen</button>*/}
        </section>
    );
}

export default DropzoneTrain;
