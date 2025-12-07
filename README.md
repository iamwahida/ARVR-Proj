https://hyper3d.ai/rodin for the §D obj. -> download the glp file. unzip it and move it to the models file

for game sounds -> https://www.epidemicsound.com/sound-effects/categories/games/ -> the mp3 files i downloaded from developer tools because i did not want to create an accound or pay :D

# HoloBlaster 198X  
A browser-based 3D shooter built with Babylon.js, featuring voice control, object interaction, XR support, and optional AI-powered object recognition.

---

## 🎮 Overview

HoloBlaster 198X is a fast-paced mini-shooter where waves of enemy characters move toward the player. You can shoot them, drag a Shield Orb for bonuses, use voice commands, or activate AI object recognition for an additional interactive layer.

The game runs in any modern desktop browser and supports fallback WebGL mode if XR is not available.

---

## 🚀 Features

- First-person shooting gameplay  
- Enemies spawning in waves  
- Score, lives, and wave progression  
- Shield Orb that can be dragged to restore health  
- Voice command support  
- AI-based real-world object recognition (optional)  
- Works in WebXR (if supported) or normal 3D mode  
- Simple accessibility options (Slow Mode)  
- Local high-score saving

---

## 🛠 Technologies

- **Babylon.js** – Rendering, physics, GUI, audio, XR  
- **TensorFlow.js (COCO-SSD)** – Object recognition  
- **Web Speech API** – Voice commands  
- **WebRTC (getUserMedia)** – Camera access for AI  
- **JavaScript (ES6)**

---

## ▶ How to Run the Game

You must run the project on a local server, not by double-clicking the file.

### **Option 1 — VS Code Live Server**
1. Install the extension **Live Server**  
2. Open the project folder in VS Code  
3. Right-click **index.html** → *Open with Live Server*  
4. The game opens in your browser at something like:  
   ```
   http://localhost:5501/
   ```

### **Option 2 — Node.js http-server**
```bash
npm install -g http-server
http-server
```
Then open the shown URL in your browser.

---

## 🧠 AI Object Recognition (Optional)

Press **AI: ON** in the game UI to enable real-time object detection using your webcam.  
The game will display detected objects and their confidence levels.

To turn it off, press **AI: OFF**, which stops the camera and AI model.

Requires:
- A browser that supports `getUserMedia`  
- Camera access permission  

---

## 🎙 Voice Commands

Voice control can be turned on/off using the **VOICE** button.

Available commands:

| Command | Result |
|--------|---------|
| **“Start game”** | Starts or restarts the game |
| **“Fire” / “Shoot”** | Shoots your weapon |
| **“Slow mode”** | Slows enemy movement |
| **“Normal mode”** | Returns to normal speed |

Chrome recommended for best speech recognition support.

---

## 🕹 Gameplay Controls

### **Keyboard & Mouse**
- **W / A / S / D** – Move  
- **Left Click** – Fire weapon  
- **Drag the green orb** – Gain one extra life per wave  
- **SPACE** – Start game or fire (while playing)

### **UI Buttons**
- **START** – Begin or restart the game  
- **FIRE** – Shoot  
- **Difficulty** – Toggle normal / slow mode  
- **VOICE** – Enable/disable speech recognition  
- **AI** – Enable/disable object recognition  

### **XR Controllers (if supported)**
- Trigger button → Fire weapon

---

## 🌐 Browser & Device Support

- Chrome recommended  
- Works on Windows, macOS, and Linux  
- WebXR devices supported where available  
- Falls back to normal 3D mode if XR is unavailable  
- Requires HTTPS or localhost for camera + microphone features

---

## 📁 Project Structure

```
/models
  duckChef.glb

/sounds
  ambiance.mp3
  pew.mp3
  push.mp3
  win.mp3

index.html
main.js
README.md
```

---

## 👥 Team

- Wahida  
- Arslan  
- Kardouh  
- Nemati  

---

Enjoy blasting ducks in **HoloBlaster 198X**!
