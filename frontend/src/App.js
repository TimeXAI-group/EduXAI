import './App.css';
import DropzoneTrain from "./DropzoneTrain";
import DropzoneTest from "./DropzoneTest";
import React, { useState, useEffect } from 'react';
import axios from "axios";
import arrow from "./arrow.svg"
import logo from "./EduXAI.png"
import FingerprintJS from '@fingerprintjs/fingerprintjs'


function App() {
    const [visitorId, setVisitorId] = useState(null);
    const [className1, setClassName1] = useState('Klasse1');
    const [className2, setClassName2] = useState('Klasse2');
    const [epochs, setEpochs] = useState('3')
    const [batchSize, setBatchSize] = useState('4')
    const [learnRate, setLearnRate] = useState('0.0001')
    const [pretrained, setPretrained] = useState('vgg16')
    const [trainStatus, setTrainStatus] = useState('')
    // const [method, setMethod] = useState('gradCam')
    const [isTrainButtonDisabled, setIsTrainButtonDisabled] = useState(true);
    const [isResultsButtonDisabled, setIsResultsButtonDisabled] = useState(true);
    const [resultsButtonText, setResultsButtonText] = useState("Trainingsverlauf einblenden")
    const [isOwnPretrainedModelDisabled, setIsOwnPretrainedModelDisabled] = useState(true);

    useEffect(() => {
        const initializeFingerprint = () => {
            FingerprintJS.load()
                .then(fp => fp.get())
                .then(result => {
                    setVisitorId(result.visitorId);
                })
                .catch(error => {
                    console.error('Error getting visitorId:', error);
                });
            removeListeners();
        }
        const events = ['click', 'keydown', 'touchstart', 'scroll'];

        const removeListeners = () => {
            events.forEach(event => {
                window.removeEventListener(event, initializeFingerprint);
            });
        };

        events.forEach(event => {
            window.addEventListener(event, initializeFingerprint, { once: true });
        });

        return () => {
            removeListeners();
        };
    }, []);

    const setTrainButtonState = (value) => {
        setIsTrainButtonDisabled(value);
    };

    // const button = {
    //     margin: "10px 0 0 0"
    // }
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
    };
    const resultsContainerStyle = {
        display: 'none',
    }

    const showOrHideResults = () => {
        const resultsContainer = document.getElementById("resultsContainer");
        if (resultsContainer.style.display === "block") {
            resultsContainer.style.display = "none";
            setResultsButtonText("Trainingsverlauf einblenden")
        }
        else {
            resultsContainer.style.display = "block";
            setResultsButtonText("Trainingsverlauf ausblenden")
        }
    }

    const startTraining = async () => {
        const resultsContainer = document.getElementById("resultsContainer");
        resultsContainer.style.display = "none";
        setResultsButtonText("Trainingsverlauf einblenden")
        setIsResultsButtonDisabled(true)

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
            setTrainStatus(response.data['message']);

            const resultsTableBody = document.getElementById("resultsTableBody");
            resultsTableBody.innerHTML = ""
            const tr = document.createElement("tr")
            const thEpoch = document.createElement("td")
            thEpoch.textContent = "Epoche"
            tr.appendChild(thEpoch)
            const thAcc = document.createElement("td")
            thAcc.textContent = "Acc"
            tr.appendChild(thAcc)
            const thLoss = document.createElement("td")
            thLoss.textContent = "Loss"
            tr.appendChild(thLoss)
            const thValAcc = document.createElement("td")
            thValAcc.textContent = "ValAcc"
            tr.appendChild(thValAcc)
            const thValLoss = document.createElement("td")
            thValLoss.textContent = "ValLoss"
            tr.appendChild(thValLoss)
            resultsTableBody.appendChild(tr)
            for (let i=0;i<response.data['accuracy'].length;i++) {
                const tr = document.createElement("tr")
                const thEpoch = document.createElement("td")
                thEpoch.textContent = String(i+1)
                tr.appendChild(thEpoch)
                const thAcc = document.createElement("td")
                thAcc.textContent = response.data['accuracy'][i]
                tr.appendChild(thAcc)
                const thLoss = document.createElement("td")
                thLoss.textContent = response.data['loss'][i]
                tr.appendChild(thLoss)
                const thValAcc = document.createElement("td")
                thValAcc.textContent = response.data['val_accuracy'][i]
                tr.appendChild(thValAcc)
                const thValLoss = document.createElement("td")
                thValLoss.textContent = response.data['val_loss'][i]
                tr.appendChild(thValLoss)
                resultsTableBody.appendChild(tr)
            }
            setIsResultsButtonDisabled(false)
            setIsOwnPretrainedModelDisabled(false)
        } catch (error) {
            if (error.response) {
                console.error('Fehler:', error.response.data['message']);
                console.error('Status:', error.response.status);
                if (error.response.data['exception'] !== undefined) {
                    console.error('Exception:', error.response.data['exception']);
                }
                setTrainStatus(error.response.data['message']);
            } else if (error.request) {
                console.error('Keine Antwort vom Server erhalten:', error.request);
                setTrainStatus("Server nicht erreichbar");
            } else {
                console.error('Ein Fehler ist aufgetreten:', error.message);
                setTrainStatus("Training fehlgeschlagen");
            }
        }
    };

    // const requestHeatmap = async () => {
    //     const statusElement = document.getElementById('testStatus');
    //     axios.get('https://xai.mnd.thm.de:3000/requestHeatmap', {
    //         params: {
    //             method: 'gradCam',
    //             visitorId: visitorId
    //         },
    //         responseType: 'blob'
    //     })
    //         .then(response => {
    //             const imgUrl = URL.createObjectURL(response.data);
    //             const imgElement = document.getElementById('heatmap');
    //             imgElement.src = imgUrl;
    //             const imgContainerElement = document.getElementById('heatmapContainer');
    //             imgContainerElement.style.display = "flex";
    //             // const imgButtonElement = document.getElementById('heatmapButton');
    //             // imgButtonElement.style.margin = "10px 0 10px 0"
    //         })
    //         .catch(error => {
    //             if (error.response && error.response.data) {
    //                 const blob = error.response.data;
    //                 const reader = new FileReader();
    //                 reader.onload = () => {
    //                     const text = reader.result;
    //                     try {
    //                         const json = JSON.parse(text);
    //                         console.error('Fehler:', json['message']);
    //                         console.error('Status:', error.response.status);
    //                         if (json['exception'] !== undefined) {
    //                             console.error('Exception:', json['exception']);
    //                         }
    //                         statusElement.textContent = json['message'];
    //                     } catch (e) {
    //                         console.error('Fehler beim Parsen der Fehlermeldung:', text);
    //                     }
    //                 };
    //                 reader.readAsText(blob);
    //             } else if (error.request) {
    //                 console.error('Keine Antwort vom Server erhalten:', error.request);
    //                 statusElement.textContent = "Server nicht erreichbar";
    //             } else {
    //                 console.error('Ein Fehler ist aufgetreten:', error.message);
    //                 statusElement.textContent = "Heatmap anfordern fehlgeschlagen";
    //             }
    //         });
    // };

    return (
        <div id="flexbox" className="flexbox">
            <div className="kiteContainer">
                <img className="kite" src={logo} alt="EduXAI Logo" />
            </div>
            <div className="classesContainer">
                <div className="classFlexboxContainer">
                    <div className="classContainer">
                        <label className="classLabel">
                            <b>Name der Klasse: </b>
                            <input
                                className="classNameInput"
                                id="className1"
                                value={className1} // Binden Sie den Wert des Input-Felds an den Zustand
                                onChange={e => setClassName1(e.target.value)} // Event-Handler für Änderungen im Input-Feld
                            />
                        </label>
                        <DropzoneTrain setTrainButtonState={setTrainButtonState} className="class1" visitorId={visitorId} />
                        <div className="status" id="uploadStatus1" style={status}></div>
                    </div>
                </div>
                <div className="classFlexboxContainer">
                    <div className="classContainer">
                        <label className="classLabel">
                            <b>Name der Klasse: </b>
                            <input
                                className="classNameInput"
                                id="className2"
                                value={className2} // Binden Sie den Wert des Input-Felds an den Zustand
                                onChange={e => setClassName2(e.target.value)} // Event-Handler für Änderungen im Input-Feld
                            />
                        </label>
                        <DropzoneTrain setTrainButtonState={setTrainButtonState} className="class2" visitorId={visitorId}/>
                        <div className="status" id="uploadStatus2" style={status}></div>
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
                            <option disabled={isOwnPretrainedModelDisabled} value="own">Eigenes</option>
                            <option value="vgg16">VGG16</option>
                            <option value="fruits360">Fruits360</option>
                            <option value="vgg16fruits360">VGG16+Fruits360</option>
                            <option value="false">Nein</option>
                        </select>
                    </label>
                    <button disabled={isTrainButtonDisabled} id="startTraining" onClick={startTraining}>Training starten</button>
                    <div className="status" id="trainStatus" style={status}>{trainStatus}</div>
                    <button disabled={isResultsButtonDisabled} id="showResults" onClick={showOrHideResults}>{resultsButtonText}</button>
                    <div id="resultsContainer" style={resultsContainerStyle}>
                        <table id="resultsTable">
                            <tbody id="resultsTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div className="arrowFlexboxContainer arrowFlexboxContainerB">
                <img className="arrow" src={arrow} alt="Arrow" />
            </div>
            <div className="testFlexboxContainer">
                <div className="testContainer">
                    <b className="header">Test</b>
                    <DropzoneTest className1={className1} className2={className2} visitorId={visitorId}/>
                    <div className="status" id="testStatus" style={status}></div>
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
            <div className="impressContainer">
                <a href="https://www.thm.de/mnd/impressum">Impressum</a>
            </div>
        </div>
    );
}

export default App;
