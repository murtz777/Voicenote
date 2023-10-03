import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import AudioPlayer from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";
import axios from "axios";

const socket = io(
  // ("https://api.vcaretechnologies.net");
  "http://localhost:5000"
); // Replace with your server URL

const AudioReceiver = ({ selectedGroup }) => {
  const [audioMessages, setAudioMessages] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(""); // State to track the current group
  const [loading, setLoading] = useState(true);
  const [lastAudioIndex, setLastAudioIndex] = useState(-1);
  const [textMessages, setTextMessages] = useState([]);
  const [imageMessages, setImageMessages] = useState([]);


  const audioPlayerRef = useRef(null);

  // const fetchAudioMessages = async () => {
  //   try {
  //     const response = await axios.get(
  //       `http://localhost:5000/api/audio-messages?group=${selectedGroup}`
  //     );
  //     setAudioMessages(response.data);
  //     console.log("response===>", response.data);
  //     setLoading(false);
  //   } catch (error) {
  //     console.log("error===>", error);
  //   }
  // };
  const fetchMessages = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/messages?group=${selectedGroup}`
      );
      setAudioMessages(response.data.audioMessages);
      setTextMessages(response.data.textMessages);
      setImageMessages(response.data.imageMessages);
      console.log("Messages response ===>", response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  useEffect(() => {
    // fetchAudioMessages();
    fetchMessages();
    if (selectedGroup !== currentGroup) {
      setCurrentGroup(selectedGroup);

      if (audioPlayerRef.current) {
        audioPlayerRef.current.audio.current.pause();
      }
    }
    socket.on("received-audio", (audioPath) => {
      const newAudioMessage = {
        audio_url: audioPath,
        group_name: selectedGroup,
      };
      setAudioMessages((prevMessages) => {
        // Update the last audio index when a new audio message arrives
        setLastAudioIndex(prevMessages.length);
        return [...prevMessages, newAudioMessage];
      });
    });

    // Listen for image messages from the server
    socket.on("received-image", (imageUrl) => {
      setImageMessages((prevImages) => [...prevImages, imageUrl]);
    });

    setCurrentGroup(selectedGroup);

    socket.on("received-text", (textMessage) => {
      setTextMessages((prevMessages) => [...prevMessages, textMessage]);
    });
    return () => {
      socket.off("received-audio");
      socket.off("received-text");
      socket.off("received-image");
    };
  }, [selectedGroup, currentGroup]);

  return (
    <div>
      <p>Selected Group: {selectedGroup}</p>
      {textMessages.map((message, index) => (
        <div key={index}>
          <p>
            {message.sender}: {message.message_text}
          </p>
        </div>
      ))}

      {audioMessages.map((message, index) => {
        const audioUrl = `http://localhost:5000${message.audio_url}`;

        if (message.group_name === selectedGroup) {
          const isLastAudio = index === lastAudioIndex;

          return (
            <div key={index}>
              <AudioPlayer
                ref={audioPlayerRef}
                src={audioUrl}
                controls
                autoPlay={isLastAudio}
                autoPlayAfterSrcChange={false}
              />
            </div>
          );
        }
        return null;
      })}

      {/* {imageMessages?.map((message, index) => {
        const imageUrl = `http://localhost:5000${message.image_url}`;

        if (message.group_name === selectedGroup) {
          return (
            <div key={index}>
              <img src={imageUrl} alt={`Image ${index}`} />
            </div>
          );
        }
        return null;
      })} */}
      {/* Display received images */}

      {imageMessages?.map((imageUrl, index) => (
        <div key={index}>
          {console.log(`Image URL ${index}:`, imageUrl.image_url)}
          <img
            src={`http://localhost:5000${imageUrl.image_url}`}
            alt={`Image ${index}`}
            style={{
              maxWidth: "200px", // Adjust the maximum width as needed
              maxHeight: "200px", // Adjust the maximum height as needed
              marginBottom:"10px",
              display: "block",
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default AudioReceiver;
