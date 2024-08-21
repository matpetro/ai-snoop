import React from 'react';
import { getImageUrl } from './utils';

function App() {
  const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");


  const audioRef = React.useRef(null);
  const [audioUrl, setAudioUrl] = React.useState("");
  const [currentMouth, setCurrentMouth] = React.useState(0);
  const [message, setMessage] = React.useState("");
  const [chatHistory, setChatHistory] = React.useState([]);
  const analyserRef = React.useRef(null);
  const dataArrayRef = React.useRef(null);
  const audioContextRef = React.useRef(null);
  const sourceRef = React.useRef(null);
  const intervalRef = React.useRef(null);

  const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
  const url = 'https://text-to-speech-neural-google.p.rapidapi.com/generateAudioFiles';

  const handleAudioProcess = () => {
    analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
    let sum = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      sum += Math.abs(dataArrayRef.current[i] - 128);
    }
    const average = sum / dataArrayRef.current.length;
    const mouthIndex = Math.min(Math.floor(average / 10), 21);
    setCurrentMouth(mouthIndex);
  };

  const startAnimation = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }
    intervalRef.current = setInterval(handleAudioProcess, 50);
  };

  const stopAnimation = () => {
    clearInterval(intervalRef.current);
    setCurrentMouth(0);
  };

  async function sendMessage() {
    if (message.length > 0){
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const chat = model.startChat({
        history: chatHistory
      })

      const result = await chat.sendMessage(message);
      const response = await result.response;
      console.log(response.text());
      setChatHistory(oldChatHistory => [...oldChatHistory, {
        role: "user",
        parts: [{text: message}]
      }, {
        role: "model",
        parts: [{text: response.text()}]
      }])
      setMessage("");
      getAudio(response.text());
    }
  }

  function base64ToBlob(base64, mime) {
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mime });
  }

  function getAudio(text){
    const options = {
      method: 'POST',
      headers: {
        'x-rapidapi-key': process.env.REACT_APP_AUDIO_API_KEY,
        'x-rapidapi-host': 'text-to-speech-neural-google.p.rapidapi.com',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audioFormat: 'mp3',
        paragraphChunks: [
          text
        ],
        voiceParams: {
          name: 'snoop',
          engine: 'resemble',
          languageCode: 'en-US'
        }
      })
    };
    fetch(url, options)
        .then(r => r.json())
        .then(data =>{
          console.log(data);
          const blob = base64ToBlob(data["audioStream"], 'audio/mp3');
          const blobUrl = URL.createObjectURL(blob);
          setAudioUrl(blobUrl);
        }).catch((error) => {
          console.log("Error Occured");
          console.log(error);
        });
  }

  React.useEffect(() => {
    const audioElement = audioRef.current;
    if (audioElement) {
      audioElement.addEventListener('play', startAnimation);
      audioElement.addEventListener('pause', stopAnimation);
      audioElement.addEventListener('ended', stopAnimation);

      return () => {
        audioElement.removeEventListener('play', startAnimation);
        audioElement.removeEventListener('pause', stopAnimation);
        audioElement.removeEventListener('ended', stopAnimation);
        clearInterval(intervalRef.current);
      };
    }
  }, [audioRef]);

  React.useEffect(() => {
    async function setUpAi() {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash",
        safety_settings: [
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
        ],
       });
      const chat = model.startChat({
        history: chatHistory
      })

      const result = await chat.sendMessage("Pretend you are snoop dog for the rest of this conversation. Keep responses to at most 3 sentences.");
      const response = await result.response;
      console.log(response.text());
      setChatHistory(oldChatHistory => [...oldChatHistory, {
        role: "user",
        parts: [{text: message}]
      }, {
        role: "model",
        parts: [{text: response.text()}]
      }])
    }
    setUpAi();
  }, []);

  React.useEffect(() => {
    console.log(audioUrl);
    if (audioUrl && audioRef.current) {
      const audioElement = audioRef.current;
      audioElement.src = audioUrl;
      audioElement.play()
        .then(() => {
          console.log('Audio is playing');
        })
        .catch(error => {
          console.error('Error playing audio:', error);
        });
    }
  }, [audioUrl]);

  return (
    <div className="holder">
      <div className="chat">
        <div className='image-container'>
          <img src={process.env.PUBLIC_URL + "/avatar/snoop.png"} alt="Snoop" className="image-avatar"/>
          <img src={getImageUrl(currentMouth)} alt="Talking mouth" className="image-mouth"/>
        </div>
        
        <audio ref={audioRef} controls style={{ display: 'none' }}>
            <source src={audioUrl} />
        </audio>
        
        <div className="send">
          
          <input
            placeholder="Enter message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
          ></input>
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default App;


// : 
// avatarImage
// : 
// "https://storage.googleapis.com/speechify-ai-api-prod-centralized-voice-list/shared/avatars/en-US-mrbeast-speechify.webp"
// deprecated
// : 
// false
// description
// : 
// "Biggest YouTuber"
// displayName
// : 
// "MrBeast"
// engine
// : 
// "speechify"
// gender
// : 
// "male"
// labels
// : 
// ['celebrity']
// language
// : 
// "en-US"
// localizedDisplayName
// : 
// {}
// name
// : 
// "mrbeast"
// partners
// : 
// ['Speechify']
// previewAudio
// : 
// "https://storage.googleapis.com/speechify-ai-api-prod-centralized-voice-list/shared/previews/en-US-mrbeast-speechify.mp3"
// [[Prototype]]
// : 
// Object
// 2
// : 
// avatarImage
// : 
// "https://storage.googleapis.com/speechify-ai-api-prod-centralized-voice-list/shared/avatars/en-US-snoop-resemble.webp"
// deprecated
// : 
// false
// description
// : 
// "American rapper"
// displayName
// : 
// "Snoop Dogg"
// engine
// : 
// "resemble"
// gender
// : 
// "male"
// labels
// : 
// ['celebrity']
// language
// : 
// "en-US"
// localizedDisplayName
// : 
// {}
// name
// : 
// "snoop"
// partners
// : 
// ['Speechify']
// previewAudio
// : 
// "https://storage.googleapis.com/speechify-ai-api-prod-centralized-voice-list/shared/previews/en-US-snoop-resemble.mp3"
// [[Prototype]]
// : 
// Object
// 3
// : 
// avatarImage
// : 
// "https://storage.googleapis.com/speechify-ai-api-prod-centralized-voice-list/shared/avatars/en-US-gwyneth-speechify.webp"
// deprecated
// : 
// false
// description
// : 
// "Hollywood actress"
// displayName
// : 
// "Gwyneth Paltrow"
// engine
// : 
// "speechify"
// gender
// : 
// "female"
// labels
// : 
// ['celebrity']
// language
// : 
// "en-US"
// localizedDisplayName
// : 
// {}
// name
// : 
// "gwyneth"
// partners
// : 
// ['Speechify']
// previewAudio
// : 
// "https://storage.googleapis.com/speechify-ai-api-prod-centralized-voice-list/shared/previews/en-US-gwyneth-speechify.mp3"
// [[Prototype]]
// : 
// Object
// 4
// : 
// avatarImage
// : 
// "https://storage.googleapis.com/speechify-ai-api-prod-centralized-voice-list/shared/avatars/en-US-nate-speechify.webp"
// deprecated
// : 
// false
// displayName
// : 
// "Nate"
// engine
// : 
// "speechify"
// gender
// : 
// "male"
// labels
// : 
// ['ai-enhanced']
// language
// : 
// "en-US"
// localizedDisplayName
// : 
// {}
// name
// :