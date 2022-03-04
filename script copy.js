window.addEventListener('load', (e) => {
    const canvas = document.getElementById('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    window.addEventListener('resize', (e) => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
    if (canvas.getContext) {
        //Canvas is supported
        const ctx = canvas.getContext('2d');
        let camera = {
            x: -canvas.width/2,
            y: -canvas.height/2
        };
        let dragStart = {
            x: 0,
            y: 0,
            dragging: false
        };
        let strokes = [];
        let currentStroke = [];
        let stroking = false;
        let gridSpace = 50;
        window.addEventListener('resize', draw);
        //window.addEventListener('mouseup', endCameraDrag);
        //canvas.addEventListener('mousedown', startCameraDrag);
        //canvas.addEventListener('mousemove', dragCamera);
        //canvas.addEventListener('wheel', changeZoomLevel);
        canvas.addEventListener('mousedown', beginStroke);
        canvas.addEventListener('mousemove', extendStroke);
        canvas.addEventListener('mouseup', endStroke);
        draw();

        //Draw Functions. This draws and redraws everything
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawGrid();
            drawStroke();
            //drawFunction();
        }
        
        //Draw Grid
        function drawGrid() {
            ctx.lineWidth = '1';
            ctx.strokeStyle = 'rgb(50, 50, 50, 0.3)';
            //draw vertical lines
            for (let x = 0; x < canvas.width + gridSpace; x += gridSpace) {
                ctx.beginPath();
                ctx.moveTo(x - (camera.x % gridSpace), 0);
                ctx.lineTo(x - (camera.x % gridSpace), canvas.height);
                ctx.stroke();
            }
        
            //draw horizontal lines
            for(let y = 0; y < canvas.height + gridSpace; y += gridSpace) {
                ctx.beginPath();
                ctx.moveTo(0, y - (camera.y % gridSpace));
                ctx.lineTo(canvas.width, y - (camera.y % gridSpace));
                ctx.stroke();
            }

            //draw X-axis
            if (0 <= -camera.y && -camera.y <= canvas.height) {
                ctx.lineWidth = '3';
                ctx.strokeStyle = 'rgb(0, 255, 0, 1)';
                ctx.beginPath();
                ctx.moveTo(0, -camera.y);
                ctx.lineTo(canvas.width, -camera.y);
                ctx.stroke()
            }

            //draw Y-axis
            if (0 <= -camera.x && -camera.x <= canvas.width) {
                ctx.lineWidth = '3';
                ctx.strokeStyle = 'rgb(0, 0, 255, 1)';
                ctx.beginPath();
                ctx.moveTo(-camera.x, 0);
                ctx.lineTo(-camera.x, canvas.height);
                ctx.stroke()
            }

            
            ctx.fillStyle = 'rgb(0, 0, 0, 1)';
            //draw X-axis numbering
            for (let x = -1; x < canvas.width/gridSpace; x++) {
                ctx.font = '15px sans-serif'
                //black math magic. barely understand it as i write. good luck future me
                ctx.fillText(Math.round((((-camera.x + x * gridSpace) + camera.x) + (camera.x - camera.x % gridSpace))/gridSpace), (x * gridSpace - camera.x % gridSpace) - 4, -camera.y + 15, gridSpace);
            }

            //draw Y-axis numbering
            for (let y = -1; y < canvas.height/gridSpace; y++) {
                ctx.font = '15px sans-serif'
                ctx.fillText(Math.round((((-camera.y + y * gridSpace) + camera.y) + (camera.y - camera.y % gridSpace))/gridSpace), -camera.x - gridSpace, (y * gridSpace - camera.y % gridSpace), gridSpace);
            }

        }

        function drawFunction() {
            ctx.fillStyle = 'rgb(255, 0, 0, 1)';
            ctx.lineWidth = '1';
            for (let x = camera.x; x < camera.x + canvas.width; x++) {
                let y = Math.sin(x/gridSpace)*gridSpace;
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
                draw();
            }
        }

        function endCameraDrag(e) {
            dragStart.dragging = false;
            console.log(`Camera Position: ${camera.x} ; ${camera.y}`);
        }

        function changeZoomLevel(e) {
            if (e.wheelDelta > 0) {
                gridSpace *= 0.9;
            } else {
                gridSpace *= 1.1;
            }
            draw();
        }

        function beginStroke(e) {
            console.log('Stroke started');
            currentStroke = [e.clientX, e.clientY];
            stroking = true;
        }

        function endStroke() {
            console.log('Stroke ended');
            if (currentStroke.length > 0) {
                strokes.push(currentStroke);
            }
            console.log(`This Stroke: ${currentStroke}\nAll Strokes: ${strokes}`);
            console.log(strokes);
            currentStroke = [];
            stroking = false;
            drawStroke();
        }

        function extendStroke(e) {
            if (!stroking) {return};
            console.log('Stroke extended');
            if (Math.abs(e.clientX - currentStroke[currentStroke.length-2]) > 10 || Math.abs(e.clientY - currentStroke[currentStroke.length-1]) > 10) {
                currentStroke.push(e.clientX, e.clientY);
            }
            drawCurrentStroke();
        }

        function drawCurrentStroke() {
            ctx.strokeStyle = 'rgb(255, 0, 0, 1)';
            ctx.fillStyle = 'rgb(255, 0, 0, 1)';
            ctx.lineWidth = '6';

            if (currentStroke.length > 2) {
                ctx.beginPath();
                ctx.moveTo(currentStroke[0], currentStroke[1]);
                ctx.lineTo(currentStroke[0], currentStroke[1]);
                for (let j = 2; j < currentStroke.length-1; j+=2) {
                    ctx.lineTo(currentStroke[j], currentStroke[j+1]);
                }
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(currentStroke[0], currentStroke[1], 3, 0, Math.PI * 2, false);
                ctx.fill();
            }
        }

        function drawStroke() {
            ctx.strokeStyle = 'rgb(255, 0, 0, 1)';
            ctx.fillStyle = 'rgb(255, 0, 0, 1)';
            ctx.lineWidth = '6';
            for (let i = 0; i < strokes.length; i++) {
                if (strokes[i].length > 2) {
                    ctx.beginPath();
                    ctx.moveTo(strokes[i][0], strokes[i][1]);
                    ctx.lineTo(strokes[i][0], strokes[i][1]);
                    for (let j = 2; j < strokes[i].length-1; j+=2) {
                        ctx.lineTo(strokes[i][j], strokes[i][j+1]);
                    }
                    ctx.stroke();
                } else {
                    ctx.beginPath();
                    ctx.arc(strokes[i][0], strokes[i][1], 3, 0, Math.PI * 2, false);
                    ctx.fill();
                }
            }
        }

    } else {
        console.warn('Canvas is not supported by this browser.')
    }
});