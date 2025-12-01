const STORAGE_KEY = "holoBlaster198X_state_v1";

// game state flags
let gameOver = false;
let gameStarted = false;

// voice control vars (global so we can stop on reload)
let recognition = null;
let voiceActive = false;

// Store the loaded enemy model template here
let enemyMesh = null;

window.addEventListener("DOMContentLoaded", async function () {
  const canvas = document.getElementById("renderCanvas");
  const engine = new BABYLON.Engine(canvas, true);

  const scene = await createScene(engine, canvas);

  engine.runRenderLoop(function () {
    scene.render();
  });

  window.addEventListener("resize", function () {
    engine.resize();
  });
});

async function createScene(engine, canvas) {
  const scene = new BABYLON.Scene(engine);
  // ** VIBE CHANGE: Toy Story Baby Blue Background **
  scene.clearColor = new BABYLON.Color4(0.5, 0.7, 0.9, 1);

  // ========================== AUDIO SETUP ==============================
  const audioEngine = await BABYLON.CreateAudioEngineAsync();

  const pushSound = await BABYLON.CreateSoundAsync(
    "pushSound",
    "sounds/push.mp3",
    { loop: false, autoplay: false, volume: 0.1 }
  );

  const winSound = await BABYLON.CreateSoundAsync(
    "winSound",
    "sounds/win.mp3",
    { loop: false, autoplay: false, volume: 1.0 }
  );

  const ambianceSound = await BABYLON.CreateSoundAsync(
    "ambianceSound",
    "sounds/ambiance.mp3",
    { loop: true, autoplay: false, volume: 0.4 }
  );

  const shootSound = await BABYLON.CreateSoundAsync(
    "shootSound",
    "sounds/pew.mp3",
    { loop: false, autoplay: false, volume: 0.4 }
  );

  let firstPlayed = false;
  window.addEventListener("click", async () => {
    if (firstPlayed) return;
    firstPlayed = true;

    try {
      await audioEngine.unlockAsync();
      ambianceSound.play(); // background music
    } catch (e) {
      console.error("Audio failed:", e);
    }
  });

  // ============================== CAMERA / LIGHT =======================

  const camera = new BABYLON.UniversalCamera(
    "camera",
    new BABYLON.Vector3(0, 1.7, 5),
    scene
  );
  camera.setTarget(BABYLON.Vector3.Zero());
  camera.attachControl(canvas, true);
  camera.inertia = 0.4;
  camera.speed = 3.0;

  // WASD for locomotion
  camera.keysUp.push(87); // W
  camera.keysDown.push(83); // S
  camera.keysLeft.push(65); // A
  camera.keysRight.push(68); // D

  const light = new BABYLON.HemisphericLight(
    "light",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  light.intensity = 1.0;
  // ** VIBE CHANGE: Ground color set to light tan/green for softer ambient look **
  light.groundColor = new BABYLON.Color3(0.7, 0.8, 0.6); 

  // ============================ NEON FLOOR (Converted to Carpet) =============================
  const groundSize = 60;
  const ground = BABYLON.MeshBuilder.CreateGround(
    "floor",
    { width: groundSize, height: groundSize },
    scene
  );

  const gridMat = new BABYLON.StandardMaterial("gridMat", scene);
  
  // ** VIBE CHANGE: Keep the grid for structure, but soften the colors **
  const gridTex = new BABYLON.DynamicTexture(
    "gridTex",
    { width: 1024, height: 1024 },
    scene,
    false
  );
  drawGridTexture(gridTex); // The grid function below still draws a subtle grid

  gridTex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  gridTex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
  gridTex.uScale = 20;
  gridTex.vScale = 20;

  gridMat.diffuseTexture = gridTex;
  gridMat.specularColor = new BABYLON.Color3(0, 0, 0);
  // ** VIBE CHANGE: Remove neon emissive color (was 0.1, 0.8, 0.9) **
  gridMat.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.05); 
  gridMat.alpha = 1.0; 
  ground.material = gridMat;

  // ============================ SHIELD ORB =============================
  const shieldOrb = BABYLON.MeshBuilder.CreateSphere(
    "shieldOrb",
    { diameter: 0.6 },
    scene
  );
  shieldOrb.position = new BABYLON.Vector3(0, 0.4, 2);

  const shieldMat = new BABYLON.StandardMaterial("shieldMat", scene);
  shieldMat.emissiveColor = new BABYLON.Color3(0.2, 0.9, 0.4);
  shieldMat.diffuseColor = new BABYLON.Color3(0, 0.2, 0.1);
  shieldOrb.material = shieldMat;

  const draggables = [shieldOrb];
  ground.isPickable = true;

  // ===================== SPATIAL AUDIO DISTANCE FUNCTION ==============
  function getSpatialVolume(mesh, maxVolume = 0.3, minDistance = 0.5, maxDistance = 25) {
    const dist = BABYLON.Vector3.Distance(camera.position, mesh.position);
    const t = Math.max(0, Math.min(1, (dist - minDistance) / (maxDistance - minDistance)));
    return maxVolume * (1 - t);
  }

  // =============================== GUI / HUD ===========================

  const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

  // score + lives + wave
  let score = 0;
  let highScore = 0;
  let lives = 3;
  let wave = 1;

  // load highscore from localStorage
  (function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (typeof data.highScore === "number") highScore = data.highScore;
    } catch (e) {
      console.warn("Failed to load state", e);
    }
  })();

  function saveState() {
    try {
      const data = { highScore };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to save state", e);
    }
  }

  const scoreText = new BABYLON.GUI.TextBlock();
  scoreText.text = "Score: 0  |  High: " + highScore;
  // ** VIBE CHANGE: Changed score color from neon green to a softer, visible color **
  scoreText.color = "#008cffff"; 
  scoreText.fontSize = 24;
  scoreText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  scoreText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  scoreText.paddingTop = "10px";
  scoreText.paddingLeft = "10px";
  ui.addControl(scoreText);

  const livesText = new BABYLON.GUI.TextBlock();
  livesText.text = "Lives: 3  |  Wave: 1";
  // ** VIBE CHANGE: Changed lives color from neon red to a softer, visible color **
  livesText.color = "#f72727ff"; 
  livesText.fontSize = 24;
  livesText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
  livesText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  livesText.paddingTop = "10px";
  livesText.paddingRight = "10px";
  ui.addControl(livesText);

  const statusText = new BABYLON.GUI.TextBlock();
  statusText.text =
    "HoloBlaster 198X\nClick START or press SPACE.\nFire: left click / FIRE button.\nDrag green orb.\nVoice: say 'fire', 'start game', 'slow mode'.";
  statusText.color = "#000000"; // Black text is better contrast on light background
  statusText.fontSize = 20;
  statusText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
  statusText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
  statusText.paddingBottom = "20px";
  ui.addControl(statusText);

  // Crosshair
  const crosshair = new BABYLON.GUI.TextBlock();
  crosshair.text = "+";
  crosshair.color = "#FF0000"; // Red crosshair for visibility on light background
  crosshair.fontSize = 32;
  crosshair.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
  crosshair.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
  ui.addControl(crosshair);

  // FIRE button (UI interaction #1)
  const fireButton = BABYLON.GUI.Button.CreateSimpleButton("fireBtn", "FIRE");
  fireButton.width = "120px";
  fireButton.height = "60px";
  fireButton.cornerRadius = 10;
  fireButton.thickness = 2;
  fireButton.color = "#ffffff";
  fireButton.background = "#ff0066";
  fireButton.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
  fireButton.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
  fireButton.paddingRight = "20px";
  fireButton.paddingBottom = "20px";
  fireButton.onPointerUpObservable.add(() => {
    fireWeapon();
  });
  ui.addControl(fireButton);

  // START / RESTART button
  const startButton = BABYLON.GUI.Button.CreateSimpleButton("startBtn", "START");
  startButton.width = "120px";
  startButton.height = "50px";
  startButton.cornerRadius = 10;
  startButton.thickness = 2;
  startButton.color = "#000000";
  startButton.background = "#00ff99";
  startButton.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  startButton.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
  startButton.paddingLeft = "20px";
  startButton.paddingBottom = "20px";
  startButton.onPointerUpObservable.add(() => {
    startGame();
  });
  ui.addControl(startButton);

  // Difficulty / accessibility button
  let difficultyMultiplier = 1.0;
  const difficultyButton = BABYLON.GUI.Button.CreateSimpleButton("difficultyBtn", "Difficulty: NORMAL");
  difficultyButton.width = "180px";
  difficultyButton.height = "40px";
  difficultyButton.cornerRadius = 10;
  difficultyButton.thickness = 1;
  difficultyButton.color = "#000000"; // Black text on light button
  difficultyButton.background = "#CCCCCC";
  difficultyButton.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  difficultyButton.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  difficultyButton.paddingLeft = "10px";
  difficultyButton.paddingTop = "40px";
  difficultyButton.onPointerUpObservable.add(() => {
    if (difficultyMultiplier === 1.0) {
      difficultyMultiplier = 0.5;
      difficultyButton.textBlock.text = "Difficulty: SLOW MODE";
      statusText.text = "Slow Mode ON (Accessibility). Enemies move slower.";
    } else {
      difficultyMultiplier = 1.0;
      difficultyButton.textBlock.text = "Difficulty: NORMAL";
      statusText.text = "Normal difficulty.";
    }
  });
  ui.addControl(difficultyButton);

  // Voice control button
  const voiceButton = BABYLON.GUI.Button.CreateSimpleButton("voiceBtn", "Voice: OFF");
  voiceButton.width = "150px";
  voiceButton.height = "40px";
  voiceButton.cornerRadius = 10;
  voiceButton.thickness = 1;
  voiceButton.color = "#000000"; // Black text on light button
  voiceButton.background = "#CCCCFF";
  voiceButton.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
  voiceButton.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  voiceButton.paddingRight = "10px";
  voiceButton.paddingTop = "40px";
  ui.addControl(voiceButton);

  // ========================= VOICE RECOGNITION =========================

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition || null;

  if (!SpeechRecognition) {
    statusText.text += "\nVoice control not supported in this browser.";
  } else {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const transcript = last[0].transcript.trim().toLowerCase();
      handleVoiceCommand(transcript);
    };

    recognition.onerror = (e) => {
      console.error("Voice error:", e);
      statusText.text = "Voice error. Try turning Voice OFF and ON again.";
      voiceActive = false;
      voiceButton.textBlock.text = "Voice: OFF";
    };

    voiceButton.onPointerUpObservable.add(() => {
      if (!voiceActive) {
        try {
          recognition.start();
          voiceActive = true;
          voiceButton.textBlock.text = "Voice: ON";
          statusText.text = "Voice ON. Try saying: 'fire', 'start game', 'slow mode'.";
        } catch (e) {
          console.error("Failed to start voice:", e);
        }
      } else {
        recognition.stop();
        voiceActive = false;
        voiceButton.textBlock.text = "Voice: OFF";
        statusText.text = "Voice OFF.";
      }
    });
  }

  function handleVoiceCommand(text) {
    console.log("Voice:", text);

    if (text.includes("start")) {
      startGame();
    }
    if (text.includes("fire") || text.includes("shoot")) {
      fireWeapon();
    }
    if (text.includes("slow")) {
      difficultyMultiplier = 0.5;
      difficultyButton.textBlock.text = "Difficulty: SLOW MODE";
      statusText.text = "Slow Mode ON from voice command.";
    }
    if (text.includes("normal") || text.includes("fast")) {
      difficultyMultiplier = 1.0;
      difficultyButton.textBlock.text = "Difficulty: NORMAL";
      statusText.text = "Normal difficulty from voice command.";
    }
  }

  // ======================= 3D MODEL LOADING ======================
  try {
    const result = await BABYLON.SceneLoader.ImportMeshAsync(
      "", // mesh names (empty string loads all)
      "models/",
      "duckChef.glb",
      scene
    );

    const rootMesh = result.meshes[0];

    enemyMesh = rootMesh;
    enemyMesh.name = "DuckEnemyTemplate";

    enemyMesh.isVisible = false; // Hide the template mesh
    enemyMesh.isPickable = false; // Make the template unpickable

    enemyMesh.scaling.setAll(0.5);

    enemyMesh.createBoundingBox = true;

    // Set the initial rotation mode to use Euler angles
    enemyMesh.rotationQuaternion = null; 

    console.log("DuckChef model loaded successfully.");

  } catch (error) {
    console.error("Failed to load models/duckChef.glb:", error);
    // Fallback to a simple box if the model fails to load
    const fallbackBox = BABYLON.MeshBuilder.CreateBox("fallbackBox", { size: 0.5 }, scene);
    fallbackBox.isVisible = false;
    // ensure fallback mesh also uses rotation property
    fallbackBox.rotationQuaternion = null; 
    fallbackBox.rotation = new BABYLON.Vector3(0, 0, 0); 
    enemyMesh = fallbackBox;
    console.log("Using fallback box for enemies.");
  }

  // ============================ ENEMY SYSTEM ===========================

  const enemies = [];
  let spawnTimer = 0;
  let spawnInterval = 2000; // ms

  function createEnemy() {
    if (!enemyMesh) return; // safety check if loading failed

    // Clone the loaded GLB mesh
    const enemy = enemyMesh.clone("enemy", null);
    enemy.isVisible = true;
    enemy.isPickable = true;
    enemy.metadata = {};
    
    // Ensure rotation is initialized for the smoothing logic
    enemy.rotation = enemyMesh.rotation.clone();

    const angle = Math.random() * Math.PI * 2;
    const dist = 12 + Math.random() * 8;
    const height = 1 + Math.random() * 2;

    enemy.position = new BABYLON.Vector3(
      camera.position.x + Math.cos(angle) * dist,
      height,
      camera.position.z + Math.sin(angle) * dist
    );

    enemy.metadata.speed = 0.02 + Math.random() * 0.015;

    enemies.push(enemy);
  }

  function handleEnemyHit(enemy) {
    const idx = enemies.indexOf(enemy);
    if (idx !== -1) enemies.splice(idx, 1);

    // small scale animation instead of particles
    const startScale = enemy.scaling.clone();
    const endScale = startScale.scale(2.5);
    const anim = new BABYLON.Animation(
      "explode",
      "scaling",
      60,
      BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    const keys = [
      { frame: 0, value: startScale },
      { frame: 10, value: endScale },
      { frame: 15, value: BABYLON.Vector3.Zero() },
    ];
    anim.setKeys(keys);
    enemy.animations = [anim];
    scene.beginAnimation(enemy, 0, 15, false, 1, () => {
      enemy.dispose();
    });

    pushSound.stop();
    pushSound.setVolume(getSpatialVolume(enemy, 0.4));
    pushSound.play();

    score += 10;
    if (score > highScore) {
      highScore = score;
      saveState();
    }
    scoreText.text = `Score: ${score}  |  High: ${highScore}`;
  }

  function damagePlayer() {
    lives -= 1;
    livesText.text = `Lives: ${lives}  |  Wave: ${wave}`;

    statusText.text = "You got hit! Stay sharp, pilot.";

    if (lives <= 0) {
      endGame();
    }
  }

  function endGame() {
    if (gameOver) return;
    gameOver = true;
    gameStarted = false;

    winSound.stop();
    winSound.play();

    statusText.text =
      "GAME OVER.\nClick START or press SPACE to play again.\nYou can also say 'start game'.";
  }

  function resetGameState() {
    enemies.forEach((e) => e.dispose());
    enemies.length = 0;

    score = 0;
    lives = 3;
    wave = 1;
    spawnInterval = 2000;
    spawnTimer = 0;
    gameOver = false;

    scoreText.text = `Score: ${score}  |  High: ${highScore}`;
    livesText.text = `Lives: ${lives}  |  Wave: ${wave}`;
  }

  function startGame() {
    resetGameState();
    gameStarted = true;
    statusText.text =
      "Wave 1 started.\nFire with left click or FIRE button.\nDrag the green orb near you for an extra life once per wave.";
  }

  // Give shield orb a simple one-time buff per wave
  let shieldUsedThisWave = false;

  function useShieldOrb() {
    if (shieldUsedThisWave) {
      statusText.text = "Shield already used this wave.";
      return;
    }
    shieldUsedThisWave = true;
    lives += 1;
    livesText.text = `Lives: ${lives}  |  Wave: ${wave}`;
    statusText.text = "Shield orb activated: +1 Life!";
    shieldMat.emissiveColor = new BABYLON.Color3(0.7, 1, 0.7);
    setTimeout(() => {
      shieldMat.emissiveColor = new BABYLON.Color3(0.2, 0.9, 0.4);
    }, 1000);
  }

  // ============================= SHOOTING ==============================

  let canShoot = true;
  const shootCooldownMs = 250;

  function fireWeapon() {
    if (!gameStarted || gameOver) return;
    if (!canShoot) return;

    canShoot = false;
    setTimeout(() => (canShoot = true), shootCooldownMs);

    shootSound.stop();
    shootSound.setVolume(0.5);
    shootSound.play();

    const origin = camera.position.clone();
    const forward = camera.getDirection(BABYLON.Axis.Z);
    const ray = new BABYLON.Ray(origin, forward, 100);

    // Ray picking logic for complex 3D models
    const pickInfo = scene.pickWithRay(ray, (m) => {
      // Check if the mesh itself or one of its ancestors is in the enemies array
      let currentMesh = m;
      while (currentMesh) {
        if (enemies.includes(currentMesh)) {
          return true; // Found an enemy
        }
        currentMesh = currentMesh.parent;
      }
      return false; // Not an enemy
    });

    if (pickInfo.hit && pickInfo.pickedMesh) {
      // Find the actual root enemy mesh that was hit
      let enemyRoot = pickInfo.pickedMesh;
      while (enemyRoot && !enemies.includes(enemyRoot)) {
        enemyRoot = enemyRoot.parent;
      }

      if (enemyRoot) {
        handleEnemyHit(enemyRoot);
      }
    }
  }

  // Mouse / touch gesture shooting (interaction #2)
  let selectedMesh = null;
  let dragOffset = new BABYLON.Vector3();
  let selectedHeight = 0;

  scene.onPointerDown = function () {
    // First, see if we clicked on the shield orb (object interaction)
    const pick = scene.pick(
      scene.pointerX,
      scene.pointerY,
      (m) => draggables.includes(m)
    );

    if (pick.hit && pick.pickedMesh) {
      selectedMesh = pick.pickedMesh;
      selectedHeight = selectedMesh.position.y;
      dragOffset = selectedMesh.position.subtract(pick.pickedPoint);

      // small audio feedback when grabbing orb
      pushSound.stop();
      pushSound.setVolume(getSpatialVolume(selectedMesh, 0.3));
      pushSound.play();
      return;
    }

    // If not dragging any object, this is a "gesture shot"
    fireWeapon();
  };

  scene.onPointerMove = function () {
    if (!selectedMesh) return;

    const pick = scene.pick(
      scene.pointerX,
      scene.pointerY,
      (m) => m === ground
    );
    if (pick.hit) {
      const target = pick.pickedPoint.add(dragOffset);
      selectedMesh.position.set(target.x, selectedHeight, target.z);

      if (pushSound.isPlaying) {
        pushSound.setVolume(getSpatialVolume(selectedMesh, 0.3));
      }
    }
  };

  scene.onPointerUp = function () {
    if (selectedMesh) {
      pushSound.setVolume(0, 0.2);
      setTimeout(() => pushSound.stop(), 250);

      // If orb is dropped close to player, trigger shield effect
      const dist = BABYLON.Vector3.Distance(selectedMesh.position, camera.position);
      if (selectedMesh === shieldOrb && dist < 2.0) {
        useShieldOrb();
      }
    }
    selectedMesh = null;
  };

  // Keyboard: SPACE to start, R to restart, also for locomotion requirement we have WASD already
  window.addEventListener("keydown", (ev) => {
    if (ev.code === "Space") {
      if (!gameStarted || gameOver) {
        startGame();
      } else {
        fireWeapon();
      }
    }
  });

  // ============================ GAME LOOP ==============================
  // A smoothing factor for slow rotation (lower is slower)
  const rotationSmoothing = 0.05; 

  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime();
    if (!gameStarted || gameOver) return;

    // spawn enemies over time
    spawnTimer += dt;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      createEnemy();
    }

    // move enemies and check collision with player
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      if (!enemy || enemy.isDisposed()) {
        enemies.splice(i, 1);
        continue;
      }

      const toPlayer = camera.position.subtract(enemy.position);
      const dist = toPlayer.length();
      const dir = toPlayer.normalize();

      const speed = enemy.metadata.speed * difficultyMultiplier;
      enemy.position.addInPlace(dir.scale(speed));
      
      // Smooth rotation (slowly turn to face the player)
      // 1. Calculate the target angle (Yaw/Y-axis)
      const targetYRotation = Math.atan2(dir.x, dir.z) + Math.PI;
      
      // 2. Smoothly interpolate the current angle towards the target angle
      let currentYRotation = enemy.rotation.y;
      
      // Handle the 360/0 degree wrap-around
      let diff = targetYRotation - currentYRotation;
      if (diff > Math.PI) diff -= 2 * Math.PI;
      else if (diff < -Math.PI) diff += 2 * Math.PI;

      // Apply smoothing
      currentYRotation += diff * rotationSmoothing;
      
      enemy.rotation.y = currentYRotation;


      // Check collision with player
      if (dist < 1.0) {
        // enemy reached player
        enemy.dispose();
        enemies.splice(i, 1);
        damagePlayer();
      }
    }

    // simple wave scaling based on score
    const expectedWave = 1 + Math.floor(score / 50);
    if (expectedWave !== wave) {
      wave = expectedWave;
      livesText.text = `Lives: ${lives}  |  Wave: ${wave}`;
      // spawn faster as waves go up
      spawnInterval = Math.max(600, 2000 - (wave - 1) * 200);
      shieldUsedThisWave = false;
      statusText.text = `Wave ${wave} begins. Shield orb reset.`;
    }
  });

  // ============================= WEBXR AR/VR ===========================

  // Enable WebXR. If AR isn't supported, this still works as normal 3D on laptop.
  try {
    const xr = await scene.createDefaultXRExperienceAsync({
      uiOptions: {
        sessionMode: "immersive-ar", // try AR
      },
      optionalFeatures: true,
    });

    // Controller shooting (gesture #3 for XR controllers)
    if (xr && xr.input) {
      xr.input.onControllerAddedObservable.add((controller) => {
        controller.onMotionControllerInitObservable.add((motionController) => {
          const trigger = motionController.getComponent("xr-standard-trigger");
          if (!trigger) return;
          trigger.onButtonStateChangedObservable.add(() => {
            if (trigger.changes.pressed && trigger.pressed) {
              fireWeapon();
            }
          });
        });
      });
    }

    // AR support check + user guidance
    if (xr && xr.baseExperience && xr.baseExperience.sessionManager) {
      const isARSupported =
        await xr.baseExperience.sessionManager.isSessionSupportedAsync(
          "immersive-ar"
        );
      if (!isARSupported) {
        statusText.text =
          "AR/WebXR not supported here. Running as classic 3D game.\nYou can still play with mouse/keyboard + voice.";
      } else {
        statusText.text += "\nAR/WebXR available. Use the headset/glasses icon to enter XR.";
      }
    }
  } catch (e) {
    console.warn("WebXR init failed, running in normal 3D mode:", e);
    statusText.text =
      "WebXR failed to initialize. Running in normal 3D mode.\nThis is fine for the demo video.";
  }

  return scene;
}

// ======================== GRID TEXTURE FUNCTION (Softened) =======================

function drawGridTexture(dynamicTexture) {
  const ctx = dynamicTexture.getContext();
  const W = dynamicTexture.getSize().width;
  const H = dynamicTexture.getSize().height;

  ctx.fillStyle = "#E0E0D8"; 
  ctx.fillRect(0, 0, W, H);

  const minor = 64;
  const major = 256;

  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(0,0,0,0.05)"; 

  for (let x = 0; x <= W; x += minor) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += minor) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(0,0,0,0.15)"; 

  for (let x = 0; x <= W; x += major) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += major) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  dynamicTexture.update();
}