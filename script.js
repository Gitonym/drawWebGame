if (typeof window !== "undefined") {
  window.addEventListener("load", (e) => {
    const socket = io('http://localhost:3000');
    const canvas = document.getElementById("canvas");
    const moveTool = document.getElementById("move");
    const drawTool = document.getElementById("draw");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.addEventListener("resize", (e) => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
    if (canvas.getContext) {
      //Canvas is supported
      const ctx = canvas.getContext("2d");
      let currentTool = "move";
      let camera = {
        x: -canvas.width / 2,
        y: -canvas.height + 100,
      };
      let dragStart = {
        x: 0,
        y: 0,
        dragging: false,
      };
      let frameCount = 0;
      let strokes = [];
      let currentStroke = [];
      let stroking = false;
      let gridSpace = 50;
      const strokeResolution = 10;
      let pressed = {
        65: false, //a
        68: false, //d
        83: false, //s
        87: false, //w
        17: false, //ctrl
      };

      let player = {
        x: 0,
        y: -200,
        height: 25,
        width: 25,
        xspeed: 0,
        yspeed: 0,
        acceleration: 1,
        friction: 0.85,
        gravity: 0.7,
        onground: false,
        jumpforce: 3,
        jumpframe: -10000,
        jumpduration: 15,
      };

      window.addEventListener("resize", draw);
      drawTool.addEventListener("click", (e) => {
        changeTool(e, "draw");
      });
      moveTool.addEventListener("click", (e) => {
        changeTool(e, "move");
      });
      window.addEventListener("mouseup", (e) => {
        if (currentTool == "move") {
          endCameraDrag(e);
        } else if (currentTool == "draw") {
          endStroke();
        }
      });
      canvas.addEventListener("mousedown", (e) => {
        if (currentTool == "move") {
          startCameraDrag(e);
        } else if (currentTool == "draw") {
          beginStroke(e);
        }
      });
      canvas.addEventListener("mousemove", (e) => {
        if (currentTool == "move") {
          dragCamera(e);
        } else if (currentTool == "draw") {
          extendStroke(e);
        }
      });
      window.addEventListener("keydown", (e) => {
        pressed[e.keyCode] = true;
        if (e.keyCode == 90 && pressed[17] && currentTool === 'draw') {
          strokes.pop();
          socket.emit('undo');
        }
        if (e.keyCode == 32) {
          strokes = [];
        }
      });
      window.addEventListener("keyup", (e) => {
        pressed[e.keyCode] = false;
      });
      //canvas.addEventListener('wheel', changeZoomLevel);
      loop();
      setInterval(loop, 10);

      socket.on('newStroke', newStroke => {
        console.log('new Stroke received');
        strokes.push(newStroke);
      })

      socket.on('playerState', newPlayer => {
        if (currentTool === 'draw') {
          player = newPlayer;
        }
      })

      socket.on('cameraPos', newCamera => {
        if (currentTool === 'draw') {
          camera = newCamera;
        }
      })

      socket.on('undo', () => {
        strokes.pop();
      })

      function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        //draw background
        drawGrid();
        drawStrokes();
        drawCurrentStroke();

        //logic
        accelPlayer();
        movePlayer();

        
        if (currentTool === 'move') {
          socket.emit('playerState', player);
          socket.emit('cameraPos', camera);
        }

        //draw player
        drawPLayer();
        frameCount++;
      }

      function drawPLayer() {
        ctx.fillStyle = "rgb(255, 255, 255)";
        ctx.fillRect(
          player.x - camera.x,
          player.y - camera.y,
          player.width,
          player.height
        );
      }

      function accelPlayer(keyCode) {
        //gravity
        player.yspeed += player.gravity;

        if (currentTool === 'move') {
          //movekeys
          if (pressed[87]) {
            if (
              player.onground &&
              (!isFree(player.x, player.y + 1) || player.y + player.height == 0)
            ) {
              //just jumped
              player.onground = false;
              player.jumpframe = frameCount;
            }
            //if recently jumped
            if (frameCount - player.jumpframe < player.jumpduration) {
              player.yspeed -= player.jumpforce;
            }
          }
          if (pressed[65]) {
            player.xspeed -= player.acceleration;
          }
          if (pressed[83]) {
            player.yspeed += player.acceleration;
          }
          if (pressed[68]) {
            player.xspeed += player.acceleration;
          }
        }
        //if recently jumped accelerate up
        player.xspeed *= player.friction;
        player.yspeed *= player.friction;
      }

      function movePlayer() {
        let xblocked = true;
        if (isFree(player.x, player.y + player.yspeed)) {
          player.y += player.yspeed;
        } else {
          if (player.yspeed > 0) {
            player.onground = true;
          }
          player.yspeed = 0;
        }

        for (let offset = 0; offset < 10; offset++) {
          if (isFree(player.x + player.xspeed, player.y - offset)) {
            player.x += player.xspeed;
            xblocked = false;
            player.y -= offset;
            break;
          }
        }

        if (xblocked) {
          player.xspeed = 0;
        }

        //bootom of world
        if (player.y + player.height > 0) {
          player.y = -player.height;
          player.onground = true;
          if (player.yspeed > 0) {
            player.yspeed = 0;
          }
        }
      }

      function isFree(x, y) {
        x -= camera.x;
        y -= camera.y;
        if (canvas.width < x || x < 0) {
          return false;
        }
        if (canvas.height < y || y < 0) {
          return false;
        }
        for (let yoffset = 0; yoffset < player.height; yoffset += 3) {
          for (let xoffset = 0; xoffset < player.width; xoffset += 3) {
            if (
              ctx.getImageData(x + xoffset, y + yoffset, 1, 1).data[0] == 255
            ) {
              return false;
            }
          }
        }
        return true;
      }

      function drawGrid() {
        ctx.lineWidth = "1";
        ctx.strokeStyle = "rgb(50, 50, 50, 0.3)";
        //draw vertical lines
        for (let x = 0; x < canvas.width + gridSpace; x += gridSpace) {
          ctx.beginPath();
          ctx.moveTo(x - (camera.x % gridSpace), 0);
          ctx.lineTo(x - (camera.x % gridSpace), canvas.height);
          ctx.stroke();
        }

        //draw horizontal lines
        for (let y = 0; y < canvas.height + gridSpace; y += gridSpace) {
          ctx.beginPath();
          ctx.moveTo(0, y - (camera.y % gridSpace));
          ctx.lineTo(canvas.width, y - (camera.y % gridSpace));
          ctx.stroke();
        }

        //draw X-axis
        if (0 <= -camera.y && -camera.y <= canvas.height) {
          ctx.lineWidth = "3";
          ctx.strokeStyle = "rgb(0, 255, 0, 1)";
          ctx.beginPath();
          ctx.moveTo(0, -camera.y);
          ctx.lineTo(canvas.width, -camera.y);
          ctx.stroke();
        }

        //draw Y-axis
        if (0 <= -camera.x && -camera.x <= canvas.width) {
          ctx.lineWidth = "3";
          ctx.strokeStyle = "rgb(0, 0, 255, 1)";
          ctx.beginPath();
          ctx.moveTo(-camera.x, 0);
          ctx.lineTo(-camera.x, canvas.height);
          ctx.stroke();
        }

        ctx.fillStyle = "rgb(0, 0, 0, 1)";
        //draw X-axis numbering
        for (let x = -1; x < canvas.width / gridSpace; x++) {
          ctx.font = "15px sans-serif";
          //black math magic. barely understand it as i write. good luck future me
          ctx.fillText(
            Math.round(
              (-camera.x +
                x * gridSpace +
                camera.x +
                (camera.x - (camera.x % gridSpace))) /
                gridSpace
            ),
            x * gridSpace - (camera.x % gridSpace) - 4,
            -camera.y + 15,
            gridSpace
          );
        }

        //draw Y-axis numbering
        for (let y = -1; y < canvas.height / gridSpace; y++) {
          ctx.font = "15px sans-serif";
          ctx.fillText(
            Math.round(
              (-camera.y +
                y * gridSpace +
                camera.y +
                (camera.y - (camera.y % gridSpace))) /
                gridSpace
            ),
            -camera.x - gridSpace,
            y * gridSpace - (camera.y % gridSpace),
            gridSpace
          );
        }
      }

      function drawFunction() {
        ctx.fillStyle = "rgb(255, 0, 0, 1)";
        ctx.lineWidth = "1";
        for (let x = camera.x; x < camera.x + canvas.width; x++) {
          let y = Math.sin(x / gridSpace) * gridSpace;
          //let y = 5*x/gridSpace + 10
          ctx.fillRect(x - camera.x, y - camera.y, 1, 1);
        }
      }

      function startCameraDrag(e) {
        dragStart.x = e.clientX;
        dragStart.y = e.clientY;
        dragStart.dragging = true;
      }

      function dragCamera(e) {
        if (dragStart.dragging) {
          camera.x += dragStart.x - e.clientX;
          camera.y += dragStart.y - e.clientY;
          dragStart.x = e.clientX;
          dragStart.y = e.clientY;
        }
      }

      function endCameraDrag(e) {
        dragStart.dragging = false;
      }

      function changeZoomLevel(e) {
        if (e.wheelDelta > 0) {
          gridSpace *= 0.9;
        } else {
          gridSpace *= 1.1;
        }
      }

      function beginStroke(e) {
        currentStroke = [e.clientX + camera.x, e.clientY + camera.y];
        drawCurrentStroke(e);
        stroking = true;
      }

      function endStroke() {
        if (currentStroke.length > 0) {
          strokes.push(currentStroke);
          //send new stroke to server
          socket.emit('newStroke', currentStroke)
        }
        currentStroke = [];
        stroking = false;
      }

      function extendStroke(e) {
        if (!stroking) {
          return;
        }
        if (
          Math.abs(
            e.clientX + camera.x - currentStroke[currentStroke.length - 2]
          ) > strokeResolution ||
          Math.abs(
            e.clientY + camera.y - currentStroke[currentStroke.length - 1]
          ) > strokeResolution
        ) {
          currentStroke.push(e.clientX + camera.x, e.clientY + camera.y);
        }
        drawCurrentStroke(e);
      }

      function drawCurrentStroke(e) {
        ctx.strokeStyle = "rgb(255, 0, 0, 1)";
        ctx.fillStyle = "rgb(255, 0, 0, 1)";
        ctx.lineWidth = "6";

        if (currentStroke.length > 2) {
          ctx.beginPath();
          ctx.moveTo(currentStroke[0] - camera.x, currentStroke[1] - camera.y);
          ctx.lineTo(currentStroke[0] - camera.x, currentStroke[1] - camera.y);
          for (let j = 2; j < currentStroke.length - 1; j += 2) {
            ctx.lineTo(
              currentStroke[j] - camera.x,
              currentStroke[j + 1] - camera.y
            );
          }
          ctx.stroke();
        } else {
          //draw dot if current stroke only a point
          ctx.beginPath();
          ctx.arc(
            currentStroke[0] - camera.x,
            currentStroke[1] - camera.y,
            3,
            0,
            Math.PI * 2,
            false
          );
          ctx.fill();
        }
      }

      function drawStrokes() {
        ctx.strokeStyle = "rgb(255, 0, 0, 1)";
        ctx.fillStyle = "rgb(255, 0, 0, 1)";
        ctx.lineWidth = "6";
        for (let i = 0; i < strokes.length; i++) {
          if (strokes[i].length > 2) {
            ctx.beginPath();
            ctx.moveTo(strokes[i][0] - camera.x, strokes[i][1] - camera.y);
            ctx.lineTo(strokes[i][0] - camera.x, strokes[i][1] - camera.y);
            for (let j = 2; j < strokes[i].length - 1; j += 2) {
              ctx.lineTo(
                strokes[i][j] - camera.x,
                strokes[i][j + 1] - camera.y
              );
            }
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.arc(
              strokes[i][0] - camera.x,
              strokes[i][1] - camera.y,
              3,
              0,
              Math.PI * 2,
              false
            );
            ctx.fill();
          }
        }
      }

      function changeTool(e, newTool) {
        document
          .getElementsByClassName("selected")[0]
          .classList.remove("selected");
        currentTool = newTool;
        if (currentTool == "move") {
          moveTool.classList.add("selected");
        } else if (currentTool == "draw") {
          drawTool.classList.add("selected");
        }
        console.log(currentTool);
      }
    } else {
      console.warn("Canvas is not supported by this browser.");
    }
  });
}
