//resize the video and the canvas to fullscreen
function resizeVideo(v, c){
  v.width = window.innerWidth;
  v.height = window.innerHeight;
  c.width = window.innerWidth;
  c.height = window.innerHeight;
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
  tracking.track('#video', tracker, { camera: true }); //track video

  /************do trackers here*****************/
  tracker.on('track', function(event) {

          //clear the canvas
	        //ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "#F7B6FF"
          ctx.fillRect(0, 0, canvas.width, canvas.height); //cover the canvas in pink


          //for each tracked object:
	        event.data.forEach(function(rect) {

            //get color of rectangle to match color of tracked object:
	          if (rect.color === 'custom') {
	            rect.color = tracker.customColor;
	          }

            //draw rectangle!
	          ctx.strokeStyle = rect.color;
            ctx.fillStyle = rect.color;

            //make it pretty :)
						ctx.shadowBlur = 50;
						ctx.shadowColor = "#fff"; //make a pretty blur around the window border
						ctx.lineWidth = 5;

            //draw it
            ctx.clearRect(rect.x, rect.y, rect.width, rect.height); //create a window in the canvas
	          ctx.strokeRect(rect.x, rect.y, rect.width, rect.height); //create a border around the window

	        });
	      });

  /***********initialize GUI********************/
  initGUIControllers(tracker);



}

//create simple gui color picker, utility from tracking.js
//allows different colors to be tested!
function initGUIControllers(tracker) {
  // GUI Controllers

  var gui = new dat.GUI();

  gui.domElement.parentElement.id = 'gui'; //give the gui an id so I can give it a z index
  //the parent element is needed because the gui itself puts itself in an id

  var trackedColors = {
    custom: false
  };

  //init color picker with all colors:
  Object.keys(tracking.ColorTracker.knownColors_).forEach(function(color) {
    trackedColors[color] = true;
  });

  //for my magenta program, change to just to magenta!:


  //init custom color picker
  tracker.customColor = '#000000';

  //custom color picker:
  function createCustomColor(value) {
    var components = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(value);
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

  colorsFolder.open();
  parametersFolder.open();

  //update the colors after the GUI is setup:
  updateColors();
}
