const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// 4:3 のベース解像度
const BASE_WIDTH = 64;
const BASE_HEIGHT = 48;

let currentScale = 1;

const bg = new Image();
bg.src = "background.png";

const CHARACTER_SCALE = 0.375;
const Y_OFFSET = 10;

const input = { left: false, right: false };
let activeCharacterIndex = 0;
const characters = [];

// --- キーボード・スマホ操作 ---
window.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft") input.left = true;
  if (e.key === "ArrowRight") input.right = true;
});
window.addEventListener("keyup", e => {
  if (e.key === "ArrowLeft") input.left = false;
  if (e.key === "ArrowRight") input.right = false;
});

document.getElementById("left").addEventListener("touchstart", () => input.left = true);
document.getElementById("left").addEventListener("touchend", () => input.left = false);
document.getElementById("right").addEventListener("touchstart", () => input.right = true);
document.getElementById("right").addEventListener("touchend", () => input.right = false);

document.getElementById("switchBtn").addEventListener("click", () => {
  activeCharacterIndex = (activeCharacterIndex + 1) % characters.length;
});

// --- リサイズ（4:3固定） ---
function resize() {
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;

  // ウィンドウに合わせて、4:3を維持できる最大の整数倍（または浮動小数）のスケールを計算
  // ドット絵の綺麗さを優先して Math.floor を使用
  const scale = Math.floor(Math.min(screenW / BASE_WIDTH, screenH / BASE_HEIGHT)) || 1;

  canvas.width = BASE_WIDTH * scale;
  canvas.height = BASE_HEIGHT * scale;
  currentScale = scale;

  // キャンバスを画面中央に配置（CSSをJSで制御）
  canvas.style.position = "absolute";
  canvas.style.left = "50%";
  canvas.style.top = "50%";
  canvas.style.transform = "translate(-50%, -50%)";

  ctx.imageSmoothingEnabled = false;
  draw();
}
window.addEventListener("resize", resize);

// --- 描画 ---
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (bg.complete) {
    ctx.drawImage(bg, 0, 0, BASE_WIDTH, BASE_HEIGHT, 0, 0, canvas.width, canvas.height);
  }
}

// --- キャラクタークラス ---
class Character {
  constructor(x, y, idleImg, data) {
    this.x = x;
    this.y = y;
    this.idleImg = idleImg;
    this.moveStateImg = null;
    this.moveImg = null;
    this.data = data;

    this.frame = 0;
    this.timer = 0;
    this.dir = 1;
    this.state = "idle";
  }

  getWidth() {
    return this.data[this.state].frameWidth * currentScale * CHARACTER_SCALE;
  }

  update(isActive = false) {
    const prevState = this.state;

    if (isActive && (input.left || input.right)) {
      if (this.state === "idle") {
        this.state = "move_state";
      } else if (this.state === "move_state") {
        const anim = this.data["move_state"];
        if (this.frame === anim.frames - 1 && this.timer === anim.speed - 1) {
          this.state = "move";
        }
      }
    } else {
      this.state = "idle";
    }

    if (prevState !== this.state) {
      this.frame = 0;
      this.timer = 0;
    }

    if (isActive) {
      let speed = (this.state === "move") ? this.data.moveSpeed : (this.data.moveInitialSpeed || 0.4);
      if (input.left) {
        this.x -= speed * currentScale;
        this.dir = -1;
      }
      if (input.right) {
        this.x += speed * currentScale;
        this.dir = 1;
      }
    }

    const anim = this.data[this.state];
    this.timer++;
    if (this.timer >= anim.speed) {
      this.timer = 0;
      this.frame = (this.frame + 1) % anim.frames;
    }

    const half = this.getWidth() / 2;
    const minX = -half;
    const maxX = canvas.width - half;
    if (this.x < minX) this.x = minX;
    if (this.x > maxX) this.x = maxX;
  }

  draw() {
    const anim = this.data[this.state];
    const fw = anim.frameWidth;
    const fh = anim.frameHeight;
    const scale = currentScale * CHARACTER_SCALE;

    let currentImg;
    if (this.state === "move_state") {
      currentImg = this.moveStateImg;
    } else if (this.state === "move") {
      currentImg = this.moveImg;
    } else {
      currentImg = this.idleImg;
    }

    ctx.save();
    ctx.translate(this.x + (fw * scale) / 2, this.y);
    ctx.scale(this.dir, 1);
    ctx.drawImage(
      currentImg,
      this.frame * fw, 0, fw, fh,
      -(fw * scale) / 2, 0,
      fw * scale, fh * scale
    );
    ctx.restore();
  }
}

// --- キャラクター読み込み ---
function loadCharacter(path, x, y) {
  return fetch(`${path}/data.json`)
    .then(res => res.json())
    .then(data => {
      const idleImg = new Image();
      idleImg.src = `${path}/idle.png`;
      const moveStateImg = new Image();
      moveStateImg.src = `${path}/move_state.png`;
      const moveImg = new Image();
      moveImg.src = `${path}/move.png`;

      return new Promise(resolve => {
        let loadedCount = 0;
        const checkLoaded = () => {
          loadedCount++;
          if (loadedCount === 3) {
            const c = new Character(x, y, idleImg, data);
            c.moveStateImg = moveStateImg;
            c.moveImg = moveImg;
            resolve(c);
          }
        };
        idleImg.onload = checkLoaded;
        moveStateImg.onload = checkLoaded;
        moveImg.onload = checkLoaded;
      });
    });
}

// --- ゲーム開始 ---
bg.onload = async () => {
  resize();
  const groundY = BASE_HEIGHT * currentScale;
  const charHeight = 64 * currentScale * CHARACTER_SCALE;

  const makoto = await loadCharacter("characters/makoto", 12 * currentScale, groundY - charHeight - Y_OFFSET * currentScale);
  const masa = await loadCharacter("characters/masa", 36 * currentScale, groundY - charHeight - Y_OFFSET * currentScale);

  characters.push(makoto, masa);
  loop();
};

function loop() {
  draw();
  characters.forEach((c, i) => c.update(i === activeCharacterIndex));
  characters.forEach(c => c.draw());
  requestAnimationFrame(loop);
}
