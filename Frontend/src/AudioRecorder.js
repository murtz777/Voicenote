import React, { useEffect, useState } from "react";
import { ReactMic } from "react-mic";
import AudioPlayer from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";
import io from "socket.io-client";
import AudioReceiver from "./AudioReceiver";
import axios from "axios";


const socket = io("http://localhost:5000"); // Replace with your server URL

const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState("g1");
  const [audioMessages, setAudioMessages] = useState([]);
  const [textMessage, setTextMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
 
  

  const startRecording = () => {
    setIsRecording(true);
  };

  const stopRecording = () => {
    setIsRecording(false);
  };

  const onData = (recordedBlob) => {
    // Do something with recordedBlob if needed
  };

  
  const handleTextChange = (e) => {
    setTextMessage(e.target.value);
  };

  const sendTextMessage = () => {
    socket.emit("send-text", { sender: "YourName", messageText: textMessage });
    setTextMessage(""); // Clear the input field after sending
  };

 
  const handleGroupChange = (group) => {
    setSelectedGroup(group);
    socket.emit("join-group", group);
    fetchAudioMessages(group);
    console.log("Selected Group:", group);
    
  };

  const fetchAudioMessages = async (group) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/audio-messages?group=${group}`
      );
      setAudioMessages(response.data);
      console.log("audiomessage===>",audioMessages)
    } catch (error) {
      console.error("Error fetching audio messages:", error);
    }
  };
  const onStop = (recordedBlob) => {
    const audioBlob = recordedBlob.blob;
    sendAudio(audioBlob);
  };
  const sendAudio = async (audioBlob) => {
    try {
      if (audioBlob) {
        socket.emit("send-audio", { audioBlob, group: selectedGroup });
        console.log("Sending audio with group:", selectedGroup);
      } else {
        console.log("No audio to send");
      }
    } catch (error) {
      console.error("Error sending audio:", error);
    }
  };


  // Handle image selection and upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    setSelectedImage(file);
  };

  const sendImage = async () => {
    try {
      if (selectedImage) {
        const formData = new FormData();
        formData.append("image", selectedImage);

        await axios.post("http://localhost:5000/api/upload-image", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        console.log("Image sent successfully");
      } else {
        console.log("No image to send");
      }
    } catch (error) {
      console.error("Error sending image:", error);
    }
  };

  useEffect(() => {
    handleGroupChange(selectedGroup);
  }, [selectedGroup]);

  return (
    <>
      <button
        className="btn btn-primary mx-2"
        onClick={() => handleGroupChange("g1")}
      >
        G1
      </button>
      <button
        className="btn btn-secondary mx-2"
        onClick={() => handleGroupChange("g2")}
      >
        G2
      </button>
      <button
        className="btn btn-info mx-2"
        onClick={() => handleGroupChange("g3")}
      >
        G3
      </button>
      <button
        className="btn btn-warning"
        onClick={() => handleGroupChange("g4")}
      >
        G4
      </button>
      <div>
        <textarea
          rows="4"
          cols="50"
          value={textMessage}
          onChange={handleTextChange}
          placeholder="Type your message..."
        />
        <button onClick={sendTextMessage}>Send Text</button>
      </div>

      <input type="file" accept="image/*"  className="form-control"  onChange={handleImageUpload} />
        <button onClick={sendImage}>Send Image</button>
      <div>
      
        <ReactMic
          record={isRecording}
          onData={onData}
          onStop={onStop}
          className="sound-wave"
          mimeType="audio/webm"
        />
        

        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
        >
          Hold to Recordecord
        </button>

        {audioBlob && (
          <div>
            <AudioPlayer
              src={URL.createObjectURL(audioBlob)}
              autoPlay
              controls
            />
          </div>
        )}
        <AudioReceiver selectedGroup={selectedGroup} />
      </div>
    </>
  );
};

export default AudioRecorder;
