import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import AudioPlayer from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";
import axios from "axios";

const socket = io("https://api.vcaretechnologies.net");
// ("http://localhost:5000"); // Replace with your server URL

const AudioReceiver = ({ selectedGroup }) => {
  const [audioMessages, setAudioMessages] = useState([]);
  const [currentGroup, setCurrentGroup] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [lastAudioIndex, setLastAudioIndex] = useState(-1);
  const [textMessages, setTextMessages] = useState([]);
  const [imageMessages, setImageMessages] = useState([]);

  const audioPlayerRef = useRef(null);

  const fetchAudioMessages = async () => {
    try {
      const response = await axios.get(
        `https://api.vcaretechnologies.net/api/audio-messages?group=${selectedGroup}`
      );
      setAudioMessages(response.data);
      setTextMessages(response?.data?.textMessages);
      setImageMessages(response?.data?.imageMessages);
      console.log("res====>", response);
      setLoading(false);
    } catch (error) {
      console.log("error===>", error);
    }
  };
  console.log("audioMessages===--->", audioMessages);

  useEffect(() => {
    fetchAudioMessages();
    if (selectedGroup !== currentGroup) {
      setCurrentGroup(selectedGroup);

      if (audioPlayerRef.current) {
        audioPlayerRef.current.audio.current.pause();
      }
    }
    socket.on("received-audio", (audioPath) => {
      //   setAudioMessages((prevMessages) => [
      //     ...prevMessages,
      //     { audio_url: audioPath },
      //   ]);
      // });
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

    socket.on("received-text", (textMessage) => {
      setTextMessages((prevMessages) => [...prevMessages, textMessage]);
    });
    setCurrentGroup(selectedGroup);

    return () => {
      socket.off("received-audio");
      socket.off("received-text");
      socket.off("received-image");
    };
  }, [selectedGroup, currentGroup]);
  useEffect(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval); // Clear the previous interval
    }

    // Start a new interval that fetches audio messages every 2 seconds
    const newInterval = setInterval(fetchAudioMessages, 1000);

    setRefreshInterval(newInterval); // Store the new interval in state

    return () => {
      if (newInterval) {
        clearInterval(newInterval); // Clear the interval when the component unmounts
      }
    };
  }, [selectedGroup]);

  //   return (
  //     <div>
  //       {audioMessages.map((message, index) => (

  //         <div key={index}>
  //           {console.log("Audio src:", `/audio/${message.audio_url}`)}
  //           <AudioPlayer src={`/audio/${message.audio_url}`} autoPlay controls />
  //         </div>

  //       ))}
  //     </div>

  //   );
  // };

  // // Function to handle group change
  // const handleGroupChange = (group) => {
  //   // setSelectedGroup(group);
  //   // Clear the audio messages when changing groups
  //   setAudioMessages([]);
  //   console.log("Selected Group:", group);
  //   socket.emit("join-group", group);
  // };
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
        const audioUrl = `https://api.vcaretechnologies.net${message.audio_url}`;

        console.log("Audio URL====:", audioUrl);
        if (message.group_name === selectedGroup) {
          const isLastAudio = index === lastAudioIndex;
          return (
            <div key={index}>
              <AudioPlayer
                ref={audioPlayerRef}
                src={audioUrl}
                controls
                autoPlayAfterSrcChange={false}
                autoPlay={isLastAudio}
              />
            </div>
          );
        }
        return null;
      })}

      {imageMessages?.map((imageUrl, index) => (
        <div key={index}>
          {console.log(`Image URL ${index}:`, imageUrl.image_url)}
          <img
            src={`https://api.vcaretechnologies.net${imageUrl.image_url}`}
            alt={`Image ${index}`}
            style={{
              maxWidth: "200px", // Adjust the maximum width as needed
              maxHeight: "200px", // Adjust the maximum height as needed
              marginBottom: "10px",
              display: "block",
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default AudioReceiver;
