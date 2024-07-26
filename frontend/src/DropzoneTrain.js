import React, {useState} from 'react';
import {useDropzone} from 'react-dropzone';
import styled from 'styled-components';
import axios from 'axios';
import "./Dropzone.css"
import heic2any from 'heic2any';

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
            if (className === "class1") {
                statusElement = document.getElementById('uploadStatus1');
            }
            else {
                statusElement = document.getElementById('uploadStatus2');
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

            //Option 1
            //Todo: viel zu langsam --> 5 Sek pro Heic Bild
            const convertedFiles = await Promise.all(acceptedFiles.map(async file => {
                const lowerCaseName = file.name.toLowerCase();
                if (lowerCaseName.endsWith('.heic')) {
                    try {
                        const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg' });
                        const convertedFile = new File([convertedBlob], lowerCaseName.replace('.heic', '.jpg'), { type: 'image/jpeg' });
                        return Object.assign(convertedFile, {
                            preview: URL.createObjectURL(convertedFile)
                        });
                    } catch (e) {
                        console.error('Error converting HEIC to JPG:', e);
                        return null;
                    }
                } else {
                    return Object.assign(file, {
                        preview: URL.createObjectURL(file)
                    });
                }
            }));
            const validFiles = convertedFiles.filter(file => file !== null);
            setFiles(validFiles);
            handleUpload(validFiles);

            //Option 0
            // const updatedFiles = acceptedFiles.map(file => Object.assign(file, {
            //     preview: URL.createObjectURL(file)
            // }));
            // setFiles(updatedFiles);
            // handleUpload(acceptedFiles);
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
            const response = await axios.post('https://xai.mnd.thm.de:3000/uploadTrain', formData, {
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
            <aside style={thumbsContainer}>
                {thumbs}
            </aside>
            {/*<button style={button} onClick={handleUpload}>Bilder hochladen</button>*/}
        </section>
    );
}

export default DropzoneTrain;
