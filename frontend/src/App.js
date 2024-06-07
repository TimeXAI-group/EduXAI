import './App.css';
import DropzoneTrain from "./DropzoneTrain";
import DropzoneTest from "./DropzoneTest";
import React, { useState, useEffect } from 'react';
import axios from "axios";
import arrow from "./arrow.svg"
import logo from "./EduXAI.png"
import FingerprintJS from '@fingerprintjs/fingerprintjs'


function App() {

    // Initialize the agent at application startup.
    const fpPromise = FingerprintJS.load()

    const [visitorId, setVisitorId] = useState(null);
    const [className1, setClassName1] = useState('Klasse1');
    const [className2, setClassName2] = useState('Klasse2');
    const [epochs, setEpochs] = useState('3')
    const [batchSize, setBatchSize] = useState('4')
    const [learnRate, setLearnRate] = useState('0.0001')
    const [pretrained, setPretrained] = useState('vgg16')
    const [trainStatus, setTrainStatus] = useState('')
    const [method, setMethod] = useState('gradCam')
    const [isButtonDisabled, setIsButtonDisabled] = useState(true);

    useEffect(() => {
        fpPromise
            .then(fp => fp.get())
            .then(result => {
                setVisitorId(result.visitorId);
            })
            .catch(error => {
                console.error('Error getting visitorId:', error);
            });
    }, []);

    const setButtonState = (value) => {
        setIsButtonDisabled(value);
    };

    const button = {
        margin: "10px 0 0 0"
    }
    const thumbsContainer = {
        display: 'none',
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
    const status = {
        display: 'none',
        backgroundColor: '#FF0000',
        color: '#00FF00',
        width: '96%',
        padding: '5px 2% 5px 2%'
    };

    const startTraining = async () => {
        const statusElement = document.getElementById('trainStatus');
        statusElement.style.display = "block";
        setTrainStatus("Training läuft ...");
        const formData = new FormData();
        formData.append("epochs", epochs)
        formData.append("batchSize", batchSize)
        formData.append("learnRate", learnRate)
        formData.append("pretrained", pretrained)
        formData.append('visitorId', visitorId);

        try {
            const response = await axios.post('https://xai.mnd.thm.de:3000/startTraining', formData, {
            });
            console.log(response.data);
            if (response.data['message']==='Success') {
                setTrainStatus("Training abgeschlossen");
            }
        } catch (error) {
            console.error('Error uploading file: ', error);
            setTrainStatus("Training fehlgeschlagen");
        }
    };

    const requestHeatmap = async () => {
        fetch('https://xai.mnd.thm.de:3000/requestHeatmap?method=' + method + '&visitorId='+ visitorId)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.blob(); // Lese die Antwort als Blob (Bild)
            })
            .then(blob => {
                // Erstelle ein URL-Objekt für das Bild
                const imgUrl = URL.createObjectURL(blob);

                // Setze das Bild in ein HTML-Element mit der ID "heatmapImage"
                const imgElement = document.getElementById('heatmap');
                imgElement.src = imgUrl;
                const imgContainerElement = document.getElementById('heatmapContainer');
                imgContainerElement.style.display = "flex";
                const imgButtonElement = document.getElementById('heatmapButton');
                imgButtonElement.style.margin = "10px 0 10px 0"
            })
            .catch(error => {
                console.error('Error fetching heatmap image:', error);
            });
    };

    return (
        <body>
        <div className="flexbox">
            <div className="kiteContainer">
                <img className="kite" src={logo} alt="EduXAI Logo" />
            </div>
            <div className="classesContainer">
                <div className="classFlexboxContainer">
                    <div className="classContainer">
                        <label>
                            <b>Name der Klasse: </b>
                            <input
                                id="className1"
                                value={className1} // Binden Sie den Wert des Input-Felds an den Zustand
                                onChange={e => setClassName1(e.target.value)} // Event-Handler für Änderungen im Input-Feld
                            />
                        </label>
                        <DropzoneTrain setButtonState={setButtonState} className="class1" visitorId={visitorId} />
                        <div id="uploadStatus1" style={status}></div>
                    </div>
                </div>
                <div className="classFlexboxContainer">
                    <div className="classContainer">
                        <label>
                            <b>Name der Klasse: </b>
                            <input
                                id="className2"
                                value={className2} // Binden Sie den Wert des Input-Felds an den Zustand
                                onChange={e => setClassName2(e.target.value)} // Event-Handler für Änderungen im Input-Feld
                            />
                        </label>
                        <DropzoneTrain setButtonState={setButtonState} className="class2" visitorId={visitorId}/>
                        <div id="uploadStatus2" style={status}></div>
                    </div>
                </div>
            </div>
            <div className="arrowFlexboxContainer arrowFlexboxContainerA">
                <img className="arrow" src={arrow} alt="Arrow" />
                <img className="arrow" src={arrow} alt="Arrow" />
            </div>
            <div className="trainFlexboxContainer">
                <div className="trainContainer">
                    <b className="header">Training</b>
                    <label>
                        <b>Epochen: </b>
                        <select value={epochs} onChange={e => setEpochs(e.target.value)}>
                            <option value="3">3</option>
                            <option value="5">5</option>
                            <option value="10">10</option>
                            {/*<option value="15">15</option>*/}
                            {/*<option value="20">20</option>*/}
                        </select>
                    </label>
                    <label>
                        <b>Batch-Size: </b>
                        <select value={batchSize} onChange={e => setBatchSize(e.target.value)}>
                            <option value="4">4</option>
                            <option value="8">8</option>
                            <option value="16">16</option>
                            {/*<option value="32">32</option>*/}
                            {/*<option value="64">64</option>*/}
                        </select>
                    </label>
                    <label>
                        <b>Lernrate: </b>
                        <select value={learnRate} onChange={e => setLearnRate(e.target.value)}>
                            <option value="0.0001">0,01%</option>
                            <option value="0.001">0,1%</option>
                            <option value="0.01">1,0%</option>
                        </select>
                    </label>
                    <label>
                        <b>Vortrainiertes Modell: </b>
                        <select value={pretrained} onChange={e => setPretrained(e.target.value)}>
                            <option value="vgg16">VGG16</option>
                            <option value="fruits360">Fruits360</option>
                            <option value="vgg16fruits360">VGG16+Fruits360</option>
                            <option value="false">Nein</option>
                        </select>
                    </label>
                    <button disabled={isButtonDisabled} id="startTraining" onClick={startTraining}>Training starten</button>
                    <div id="trainStatus" style={status}>{trainStatus}</div>
                </div>
            </div>
            <div className="arrowFlexboxContainer arrowFlexboxContainerB">
                <img className="arrow" src={arrow} alt="Arrow" />
            </div>
            <div className="testFlexboxContainer">
                <div className="testContainer">
                    <b className="header">Test</b>
                    <DropzoneTest className1={className1} className2={className2} visitorId={visitorId}/>
                    <div id="testStatus" style={status}></div>
                    {/*<label>*/}
                    {/*    <b>Methode: </b>*/}
                    {/*    <select style={button} value={method} onChange={e => setMethod(e.target.value)}>*/}
                    {/*        <option value="signX">SignX</option>*/}
                    {/*        <option value="gradCam">Grad CAM</option>*/}
                    {/*    </select>*/}
                    {/*</label>*/}
                    {/*<button id="heatmapButton" style={button} onClick={requestHeatmap}>Heatmap anfordern</button>*/}
                    <aside id="heatmapContainer" style={thumbsContainer}>
                        <div style={thumb}>
                            <div style={thumbInner}>
                                <img
                                    id="heatmap"
                                    src=""
                                    style={img}
                                    alt={"Heatmap"}
                                />
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
        </body>
    );
}

export default App;
