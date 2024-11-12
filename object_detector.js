const videos = document.querySelectorAll("video");

const worker = new Worker("worker.js");
let boxes = [[], [], [], []];
let interval = []
let busy = [false, false, false, false];

videos.forEach((video, index) => {
    video.addEventListener("play", () => {
        const canvas = document.querySelector(`#canvas${index}`);
        canvas.width = 0 || video.videoWidth;
        canvas.height = 0 || video.videoHeight;
        const context = canvas.getContext("2d");
        interval[index] = setInterval(() => {
            context.drawImage(video, 0, 0);
            draw_boxes(canvas, boxes[index]);
            const input = prepare_input(canvas);
            const inputObj = {
                input,
                index
            }
            if (!busy[index]) {
                worker.postMessage(inputObj);
                busy[index] = true;
            }
        }, 30)
    });
})

worker.onmessage = (event) => {
    const output = event.data;
    const canvas = document.querySelector(`#canvas${output.index}`);
    boxes[output.index] = process_output(output.output, canvas.width, canvas.height);
    busy[output.index] = false;
};

videos.forEach((video, index) => {
    video.addEventListener("pause", () => {
        clearInterval(interval[index]);
        boxes[index] = [];
    });
})

const cowPlayBtn = document.getElementById("cowPlay");
const cowPauseBtn = document.getElementById("cowPause");

const cowDogPlayBtn = document.getElementById("cowDogPlay");
const cowDogPauseBtn = document.getElementById("cowDogPause");

const catPlayBtn = document.getElementById("catPlay");
const catPauseBtn = document.getElementById("catPause");

const dogPlayBtn = document.getElementById("dogPlay");
const dogPauseBtn = document.getElementById("dogPause");

cowPlayBtn.addEventListener("click", () => {
    videos[0].play();
});
cowPauseBtn.addEventListener("click", () => {
    videos[0].pause();
});

cowDogPlayBtn.addEventListener("click", () => {
    videos[1].play();
});
cowDogPauseBtn.addEventListener("click", () => {
    videos[1].pause();
});

catPlayBtn.addEventListener("click", () => {
    videos[2].play();
});
catPauseBtn.addEventListener("click", () => {
    videos[2].pause();
});

dogPlayBtn.addEventListener("click", () => {
    videos[3].play();
});
dogPauseBtn.addEventListener("click", () => {
    videos[3].pause();
});

function prepare_input(img) {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 640;
    const context = canvas.getContext("2d");
    context.drawImage(img, 0, 0, 640, 640);
    const data = context.getImageData(0, 0, 640, 640).data;
    const red = [],
        green = [],
        blue = [];
    for (let index = 0; index < data.length; index += 4) {
        red.push(data[index] / 255);
        green.push(data[index + 1] / 255);
        blue.push(data[index + 2] / 255);
    }
    return [...red, ...green, ...blue];
}

function process_output(output, img_width, img_height) {
    let boxes = [];
    for (let index = 0; index < 8400; index++) {
        const [class_id, prob] = [...Array(yolo_classes.length).keys()]
        .map(col => [col, output[8400 * (col + 4) + index]])
            .reduce((accum, item) => item[1] > accum[1] ? item : accum, [0, 0]);
        if (prob < 0.5) {
            continue;
        }
        const label = yolo_classes[class_id];
        const xc = output[index];
        const yc = output[8400 + index];
        const w = output[2 * 8400 + index];
        const h = output[3 * 8400 + index];
        const x1 = (xc - w / 2) / 640 * img_width;
        const y1 = (yc - h / 2) / 640 * img_height;
        const x2 = (xc + w / 2) / 640 * img_width;
        const y2 = (yc + h / 2) / 640 * img_height;
        boxes.push([x1, y1, x2, y2, label, prob]);
    }
    boxes = boxes.sort((box1, box2) => box2[5] - box1[5])
    const result = [];
    while (boxes.length > 0) {
        result.push(boxes[0]);
        boxes = boxes.filter(box => iou(boxes[0], box) < 0.7 || boxes[0][4] !== box[4]);
    }
    const objectNames = result.map(box => box[4]);
    console.log(objectNames);
    return result;
}

function iou(box1, box2) {
    return intersection(box1, box2) / union(box1, box2);
}

function union(box1, box2) {
    const [box1_x1, box1_y1, box1_x2, box1_y2] = box1;
    const [box2_x1, box2_y1, box2_x2, box2_y2] = box2;
    const box1_area = (box1_x2 - box1_x1) * (box1_y2 - box1_y1)
    const box2_area = (box2_x2 - box2_x1) * (box2_y2 - box2_y1)
    return box1_area + box2_area - intersection(box1, box2)
}

function intersection(box1, box2) {
    const [box1_x1, box1_y1, box1_x2, box1_y2] = box1;
    const [box2_x1, box2_y1, box2_x2, box2_y2] = box2;
    const x1 = Math.max(box1_x1, box2_x1);
    const y1 = Math.max(box1_y1, box2_y1);
    const x2 = Math.min(box1_x2, box2_x2);
    const y2 = Math.min(box1_y2, box2_y2);
    return (x2 - x1) * (y2 - y1)
}

function draw_boxes(canvas, boxes) {
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 3;
    ctx.font = "18px serif";
    boxes.forEach(([x1, y1, x2, y2, label]) => {
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        ctx.fillStyle = "#00ff00";
        const width = ctx.measureText(label).width;
        ctx.fillRect(x1, y1, width + 10, 25);
        ctx.fillStyle = "#000000";
        ctx.fillText(label, x1, y1 + 18);
    });
}

const yolo_classes = [
    'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
    'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse',
    'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase',
    'frisbee', 'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard',
    'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
    'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch', 'potted plant',
    'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven',
    'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];