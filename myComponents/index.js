import './libs/webaudio-controls.js';

const getBaseURL = () => {
    return new URL('.', import.meta.url);
};

const template = document.createElement("template");
template.innerHTML = /*html*/`
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta2/css/all.min.css" integrity="sha512-YWzhKL2whUzgiheMoBFwW8CKV4qpHQAEuvilg9FAn5VJUDwKZZxkJNuGM4XkWuk94WCrrwslk8yWNGmY1EduTA==" crossorigin="anonymous" referrerpolicy="no-referrer">


  <style>

  .frequence_label{
    font-size:14.5px;
    margin-left:7px;
    color: white;
    font-weight: 700;
    padding-left:5px;
    text-transform : uppercase;

  }

  .vitesse_label{
    font-size:14.5px;
    text-align: center;
    color: white;
    font-weight: 700;
    text-transform : uppercase;
    padding-left:5px;
  
  }
  .progression_label{
    font-size:14.5px;
    color: white;
    font-weight: 700;
    text-transform : uppercase;
    padding-left:5px;
  }

  <div class="container">

  canvas {
      border:1px solid black;
  }
  </style>
  <canvas id="myCanvas" width=400></canvas>
  <br>
  <audio id="myPlayer" crossorigin="anonymous"></audio>
    <br>

    <webaudio-knob id="volumeKnob" 
      src="./assets/imgs/LittlePhatty.png" 
      value=5 min=0 max=20 step=0.01 
      diameter="50" 
      tooltip="Volume: %d">
    </webaudio-knob>

    <br>
    <br>

    <span class="progression_label"> Progression : </span><br><br>
    <div><input id="progress" type="range" value=0></div>
    </br>
    <br>

    <button id="back10" class="fas fa-backward" ></button>
  <button id="play" class="fas fa-play"></button> 
  <button id="pause" class="fas fa-pause"></button>
  <button id="avance10" class="fas fa-forward" ></button>
  <button id="loop"><i class="fas fa-redo"></i></button>

  <br>

  <br>
  <label class="vitesse_label">Vitesse de lecture <br><br>
     <div>0 <input id="vitesseLecture" type="range" min=0.2 max=4 step=0.1 value=1> 4</div>
  </label>

  <br>
  <br>
  <span id="gains">
  <webaudio-knob id="gain_0" 
      src="./assets/imgs/Vintage_Knob.png" 
      value="0" step="1" min="-30" max="30" 
      diameter="55" 
      tooltip="60Hz: %d">
    </webaudio-knob>
    <webaudio-knob id="gain_1" 
      src="./assets/imgs/Vintage_Knob.png" 
      value="0" step="1" min="-30" max="30" 
      diameter="55" 
      tooltip="170Hz: %d">
    </webaudio-knob>
    <webaudio-knob id="gain_2" 
      src="./assets/imgs/Vintage_Knob.png" 
      value="0" step="1" min="-30" max="30" 
      diameter="55" 
      tooltip="350Hz: %d">
    </webaudio-knob>
    <webaudio-knob id="gain_3" 
      src="./assets/imgs/Vintage_Knob.png" 
      value="0" step="1" min="-30" max="30" 
      diameter="55" 
      tooltip="1000Hz: %d">
    </webaudio-knob>
    <webaudio-knob id="gain_4" 
      src="./assets/imgs/Vintage_Knob.png" 
      value="0" step="1" min="-30" max="30" 
      diameter="55" 
      tooltip="3500Hz: %d">
    </webaudio-knob>
    <webaudio-knob id="gain_5" 
      src="./assets/imgs/Vintage_Knob.png" 
      value="0" step="1" min="-30" max="30" 
      diameter="55" 
      tooltip="10000Hz: %d">
    </webaudio-knob>
    <div style="margin-bottom:100px;">
    <label class="frequence_label">60Hz</label>
    <label class="frequence_label">170Hz</label>
    <label class="frequence_label">350Hz</label>
    <label class="frequence_label">1000Hz</label>
    <label class="frequence_label">3500Hz</label>
    <label class="frequence_label">10000Hz</label>
</div>
</span >
  <div/>
  `;

var filters = [];

class MyAudioPlayer extends HTMLElement {
    constructor() {
        super();
        // Récupération des attributs HTML
        //this.value = this.getAttribute("value");

        // On crée un shadow DOM
        this.attachShadow({ mode: "open" });

        console.log("URL de base du composant : " + getBaseURL())
    }

    connectedCallback() {
        // Appelée automatiquement par le browser
        // quand il insère le web component dans le DOM
        // de la page du parent..

        // On clone le template HTML/CSS (la gui du wc)
        // et on l'ajoute dans le shadow DOM
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // fix relative URLs
        this.fixRelativeURLs();

        this.player = this.shadowRoot.querySelector("#myPlayer");
        this.player.src = this.getAttribute("src");

        // récupérer le canvas
        this.canvas = this.shadowRoot.querySelector("#myCanvas");
        this.ctx = this.canvas.getContext("2d");

        // Récupération du contexte WebAudio
        this.audioCtx = new AudioContext();

        // on définit les écouteurs etc.
        this.defineListeners();

        // On construit un graphe webaudio pour capturer
        // le son du lecteur et pouvoir le traiter
        // en insérant des "noeuds" webaudio dans le graphe
        this.buildAudioGraph();

        // on démarre l'animation
        requestAnimationFrame(() => {
            this.animationLoop();
        });
    }

    buildAudioGraph() {
        let audioContext = this.audioCtx;

        let playerNode = audioContext.createMediaElementSource(this.player);

        // Create an analyser node
        this.analyserNode = audioContext.createAnalyser();

        // Try changing for lower values: 512, 256, 128, 64...
        this.analyserNode.fftSize = 256;
        this.bufferLength = this.analyserNode.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);


        // Set filters // les filtres : travail de prof
        [60, 170, 350, 1000, 3500, 10000].forEach(function (freq, i) {
            var eq = audioContext.createBiquadFilter();
            eq.frequency.value = freq;
            eq.type = "peaking";
            eq.gain.value = 0;
            filters.push(eq);
        });

        // Connect filters in serie
        playerNode.connect(filters[0]);
        for (var i = 0; i < filters.length - 1; i++) {
            filters[i].connect(filters[i + 1]);
        }

        // Master volume is a gain node
        this.masterGain = audioContext.createGain();
        this.masterGain.value = 1;


        // connect the last filter to the speakers
        filters[filters.length - 1].connect(this.masterGain);

        // for stereo balancing, split the signal

        this.stereoPanner = audioContext.createStereoPanner();

        // lecteur audio -> analyser -> haut parleurs
        this.masterGain.connect(this.stereoPanner)
        playerNode.connect(this.stereoPanner);
        this.stereoPanner.connect(this.analyserNode);
        this.analyserNode.connect(audioContext.destination);
    }


    animationLoop() {
        // 1 on efface le canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 2 on dessine les objets
        //this.ctx.fillRect(10+Math.random()*20, 10, 100, 100);
        // Get the analyser data
        this.analyserNode.getByteFrequencyData(this.dataArray);

        let barWidth = this.canvas.width / this.bufferLength;
        let barHeight;
        let x = 0;

        // values go from 0 to 256 and the canvas heigt is 100. Let's rescale
        // before drawing. This is the scale factor
        let heightScale = this.canvas.height / 128;

        for (let i = 0; i < this.bufferLength; i++) {
            barHeight = this.dataArray[i];

            this.ctx.fillStyle = 'white';
            barHeight *= heightScale;
            this.ctx.fillRect(x, this.canvas.height - barHeight / 2, barWidth, barHeight / 2);

            // 2 is the number of pixels between bars
            x += barWidth + 1;
        }
        // 3 on deplace les objets

        // 4 On demande au navigateur de recommencer l'animation
        requestAnimationFrame(() => {
            this.animationLoop();
        });
    }
    fixRelativeURLs() {
        const elems = this.shadowRoot.querySelectorAll("webaudio-knob, webaudio-slider, webaudio-switch, img");
        elems.forEach(e => {
            const path = e.src;
            if (path.startsWith(".")) {
                e.src = getBaseURL() + path;
            }
        });
    }
    defineListeners() {
        this.shadowRoot.querySelector("#play").onclick = () => {
            this.player.play();
            this.audioCtx.resume();
        }

        this.shadowRoot.querySelector("#pause").onclick = () => {
            this.player.pause();
        }

        this.shadowRoot.querySelector("#avance10").onclick = () => {
            this.player.currentTime += 10;
        }
        this.shadowRoot.querySelector("#back10").onclick = () => {
            this.player.currentTime -= 10;
        }
        this.shadowRoot.querySelector("#vitesseLecture").oninput = (event) => {
            this.player.playbackRate = parseFloat(event.target.value);
            console.log("vitesse =  " + this.player.playbackRate);
        }


        this.shadowRoot.querySelector("#volumeKnob").addEventListener("input", (event) => {
            this.setVolume(event.target.value);
        });

        this.shadowRoot.querySelector("#loop").onclick = () => {
            this.player.currentTime = 0
            this.player.play()
        }


        this.shadowRoot.querySelector("#progress").onchange = (event) => {
            this.player.currentTime = parseFloat(event.target.value);
        }

        this.player.ontimeupdate = (event) => {
            let progressSlider = this.shadowRoot.querySelector("#progress");
            progressSlider.max = this.player.duration;
            progressSlider.min = 0;
            progressSlider.value = this.player.currentTime;
        }


        this.shadowRoot.querySelector("#gain_4").oninput = (event) => {
            var value = parseFloat(event.target.value);
            filters[4].gain.value = value;
            console.log("gain3500hz =  " + value);
        }
        this.shadowRoot.querySelector("#gain_3").oninput = (event) => {
            var value = parseFloat(event.target.value);
            filters[3].gain.value = value;
            console.log("gain1000hz =  " + value);
        }

        this.shadowRoot.querySelector("#gain_5").oninput = (event) => {
            var value = parseFloat(event.target.value);
            filters[5].gain.value = value;
            console.log("gain10000hz =  " + value);
        }
        this.shadowRoot.querySelector("#gain_2").oninput = (event) => {
            var value = parseFloat(event.target.value);
            filters[2].gain.value = value;
            console.log("gain350 =  " + value);
        }
        this.shadowRoot.querySelector("#gain_1").oninput = (event) => {
            var value = parseFloat(event.target.value);
            filters[1].gain.value = value;
            console.log("gain170hz =  " + value);
        }
        this.shadowRoot.querySelector("#gain_0").oninput = (event) => {
            var value = parseFloat(event.target.value);
            filters[0].gain.value = value;
            console.log("gain60hz =  " + value);
        }
    }

    setVolume(val) {
        this.player.volume = val / 100;
    }

}

customElements.define("my-player", MyAudioPlayer);
