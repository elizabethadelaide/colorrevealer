//resize the video and the canvas to fullscreen
function resizeVideo(v, c){
  v.width = window.innerWidth; //innerwidth is slightly oversized, workaround is in css (overflow-hidden)
  v.height = window.innerHeight;
  c.width = v.width;
  c.height = v.height;
}

//make it reponsize
window.onresize = function(){
  var video = document.getElementById('video');  //get video container
  var canvas = document.getElementById('canvas'); //get canvas container
  resizeVideo(video, canvas);
}

//startup
window.onload = function(){
  /**********initialize tracking****************/
  var video = document.getElementById('video');  //get video container
  var canvas = document.getElementById('canvas'); //get canvas container
  resizeVideo(video, canvas);
  var ctx = canvas.getContext('2d'); //use the canvas to draw 2D shapes
  var tracker = new tracking.ColorTracker(); //init color tracker
  var trackerTask = tracking.track('#video', tracker, { camera: true }); //track video
  var animator = new Animator(ctx, trackerTask); //initialize canvas animator

  /************do trackers here*****************/
  tracker.on('track', function(event) {
      animator.draw(event, tracker.customColor);
	});

  /***********initialize GUI********************/
  initGUIControllers(tracker, animator);
}

//object to handle canvas drawing
//main usage:
//tracker.on('track', function(event){animator.mydraw(event)}
function Animator(ctx, trackerTask){
    this.myTracked = []; //keep track of elements being tracked, right now just
    this.movingAverageValue = 0.8; //controls smoothness, 0.8 is good default value
    //these defaults leave a nice path of circles:
    this.brushOne = "xor"; //controls placing brush
    this.brushTwo = "destination-over"; //controls leaving brush
    this.displayText = "Some Text";
    //functions:
    this.addTracked = function(id, rect){
        //full function goals
        //check if id matches exists
        let obj = this.myTracked.find(o => o.trackid === id);
        if (obj === undefined){
              //if (this.myTracked.length < this.myMaxSize){ //keep things simple with less tracked objects
                rect.width = 1.0; //start small
                rect.height = 1.0;
                obj = {key: this.myTracked.length, trackid: id, rect: rect};
                //console.log(obj);
                this.myTracked.push(obj); //add to tracked array
              //}
        }
        else{
          //simple moving average function, can be replaced by more complicated filters
          //the goal is to create a smooth transition instead of the regular jerkiness of object tracking
          var a = this.movingAverageValue;
          var b = 1 - this.movingAverageValue;
          rect.x = a*rect.x + b*(obj.rect.x);
          rect.y = a*rect.y + b*(obj.rect.y);
          rect.width = a*rect.width + b*(obj.rect.width);
          rect.height = a*rect.height + b*(obj.rect.height);
          obj = {key: this.myTracked.length, trackid: id, rect: rect};
        }
        //TODO:
        //check if color matches
        //check if x and y are close *enough*

        return obj;
      };
    this.erase = function(){
        ctx.fillStyle = "#F7B6FF";
        ctx.globalCompositeOperation = "source-over";
        ctx.fillRect(0, 0, canvas.width, canvas.height); //cover the canvas in pink
        trackerTask.stop(); //stop tracking
        this.myTracked = []; //clean up
        setTimeout(function(){trackerTask.run()}, 1000); //wait a second to start
      }, //eraser controller
    this.animate = function(rect, customColor){
        //get color of rectangle to match color of tracked object:
        if (rect.color === 'custom') {
          rect.color = customColor;
        }
        ctx.strokeStyle = rect.color;
        ctx.fillStyle = rect.color;

        //make it pretty :)
        ctx.shadowBlur = 50;
        ctx.shadowColor = "#fff"; //make a pretty blur around the window border
        ctx.lineWidth = 5;

        //get radius
        var r = (rect.width + rect.height) / 4;
        //get center:
        var x = (rect.x + r);
        var y = (rect.y + r);

        //draw a circle to make a window (360 degree arc)
        ctx.beginPath()
        ctx.arc(x, y, r, 0, 2*Math.PI); //create an outline
        ctx.stroke();
        ctx.fill();
      },

    this.draw = function(event, customColor){
      ctx.globalCompositeOperation = this.brushTwo; //destination-over leaves a beautiful trace over

      //A message or logo
      ctx.fillStyle = "#FFFFFF"

      ctx.font = "50px Arial";
      ctx.fillText("Some Text",canvas.width/2,canvas.height/2);

      ctx.fillStyle = "#F7B6FF"
      ctx.fillRect(0, 0, canvas.width, canvas.height); //cover the canvas in pink

      //tracking doesn't really track id,
      //BUT it does seem to be consistent enough in the order of tracked objects for now
      ctx.globalCompositeOperation = this.brushOne; //xor will make a nice paint brush that reveals
      var i = 0;
      var anim = this;
      event.data.forEach(function(rect){
        //console.log(rect);
        var obj = anim.addTracked(i, rect); //add tracking object or gets smoothed object
        if (obj !== undefined){
          //console.log("Animating");
          anim.animate(obj.rect); //handle canvas drawing
        }
        i++;
      });
  };
}

//create simple gui color picker, utility based from tracking.js
//allows different colors to be tested!
function initGUIControllers(tracker, animator) {
  // GUI Controllers

  var gui = new dat.GUI();

  gui.domElement.parentElement.id = 'gui'; //give the gui an id so I can give it a z index
  //the parent element is needed because the gui itself puts itself in an id

  var trackedColors = {
    custom: false
  };

  //init color picker with all colors:
  /*Object.keys(tracking.ColorTracker.knownColors_).forEach(function(color) {
    trackedColors[color] = true;
  });*/

  //for my magenta program, change to just to magenta!:
  Object.keys(tracking.ColorTracker.knownColors_).forEach(function(color) {
    if (color == 'magenta'){
      trackedColors[color] = true;
    }
    else{
      trackedColors[color] = false;
    }
  });

  //init custom color picker
  tracker.customColor = '#000000';

  //custom color picker:
  function createCustomColor(value) {
    //regex and rgb value from color selector
    var components = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(value);
    //get color components
    var customColorR = parseInt(components[1], 16);
    var customColorG = parseInt(components[2], 16);
    var customColorB = parseInt(components[3], 16);

    var colorTotal = customColorR + customColorG + customColorB;

    if (colorTotal === 0) {
      tracking.ColorTracker.registerColor('custom', function(r, g, b) {
        return r + g + b < 10;
      });
    } else {
      var rRatio = customColorR / colorTotal;
      var gRatio = customColorG / colorTotal;

      tracking.ColorTracker.registerColor('custom', function(r, g, b) {
        var colorTotal2 = r + g + b;

        if (colorTotal2 === 0) {
          if (colorTotal < 10) {
            return true;
          }
          return false;
        }

        var rRatio2 = r / colorTotal2,
          gRatio2 = g / colorTotal2,
          deltaColorTotal = colorTotal / colorTotal2,
          deltaR = rRatio / rRatio2,
          deltaG = gRatio / gRatio2;

        return deltaColorTotal > 0.9 && deltaColorTotal < 1.1 &&
          deltaR > 0.9 && deltaR < 1.1 &&
          deltaG > 0.9 && deltaG < 1.1;
      });
    }

    updateColors();
  }

  //on color change:
  function updateColors() {
    var colors = [];

    for (var color in trackedColors) {
      if (trackedColors[color]) {
        colors.push(color);
      }
    }

    tracker.setColors(colors);
  }

  //GUI setup:
  //create folder for colors (three check boxes of 'known' colors: cyan, magenta and yellow, and then custom)
  var colorsFolder = gui.addFolder('Colors');

  Object.keys(trackedColors).forEach(function(color) {
    if (color !== 'custom') {
      colorsFolder.add(trackedColors, color).onFinishChange(updateColors);
    }
  });



  colorsFolder.add(trackedColors, 'custom').onFinishChange(function(value) {
    if (value) {
      this.customColorElement = colorsFolder.addColor(tracker, 'customColor').onChange(createCustomColor);
    } else {
      colorsFolder.remove(this.customColorElement);
    }
  });

  //parameters adjust the minimum and maximum allowed size:
  var parametersFolder = gui.addFolder('Parameters');

  parametersFolder.add(tracker, 'minDimension', 1, 100);
  parametersFolder.add(tracker, 'minGroupSize', 1, 100);

  //details to change this specific app, display settings
  var detailsFolder = gui.addFolder('Details');

  //list of various global composite operations
  //for different canvas effects
  //from https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Compositing
  var globalCompositeOperationList =  ['source-over','source-in','source-out','source-atop',
            'destination-over','destination-in','destination-out','destination-atop',
            'lighter', 'copy','xor', 'multiply', 'screen', 'overlay', 'darken',
            'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light',
            'difference', 'hue', 'saturation', 'color', 'luminosity'
          ];

  //Note: 'exclusion' is an operation, however:
  //it can create flashing lights in this context
  //it's exlcuded for now.

  detailsFolder.add(animator, 'movingAverageValue', 0.0, 1.0);
  detailsFolder.add(animator, 'brushOne', globalCompositeOperationList);
  detailsFolder.add(animator, 'brushTwo', globalCompositeOperationList);
  detailsFolder.add(animator, 'displayText')
  detailsFolder.add(animator, 'erase');
  colorsFolder.open();
  parametersFolder.open();
  detailsFolder.open();
  //update the colors after the GUI is setup:
  updateColors();
}
