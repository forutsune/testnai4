const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const BASE_WIDTH = 64;
const BASE_HEIGHT = 48; // 64:48 は 4:3 ですが、6:4(3:2)にしたい場合はここを調整します
// 6:4にするなら 64 x 42.6... ですが、計算しやすい 72:48 などにするか
// もしくは BASE_WIDTH と BASE_HEIGHT の比率を 6:4 に設定します。

// 比率の定義
const RATIO_W = 6;
const RATIO_H = 4;

let currentScale = 1;

const bg = new Image();
bg.src = "background.png";

const CHARACTER_SCALE = 0.375;
const Y_OFFSET = 10;

const input = { left: false, right: false };
let activeCharacterIndex = 0;
const characters = [];

// キーボード・スマホ操作部分は変更なしのため省略せず記述
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

// ★修正：リサイズ関数
function resize() {
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;

  // 画面サイズに合わせて、比率(6:4)を維持できる最大のスケールを計算
  // 整数倍(Math.floor)にするとドットが綺麗ですが、画面にぴったり合わせるならfloorを外します
  const scaleW = screenW / RATIO_W;
  const scaleH = screenH / RATIO_H;
  const scale = Math.floor(Math.min(scaleW, scaleH)); 

  // 比率に基づいたキャンバスサイズを設定
  canvas.width = RATIO_W * scale;
  canvas.height = RATIO_H * scale;
  
  // ゲーム内解像度(64x48など)に対するスケール比率を保持
  // ここでは BASE_WIDTH を基準にスケールを算出
  currentScale = canvas.width / BASE_WIDTH;

  ctx.imageSmoothingEnabled = false;
  draw();
}
window.addEventListener("resize", resize);

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // 背景もキャンバスサイズに合わせて描画
  ctx.drawImage(bg, 0, 0, bg.width, bg.height, 0, 0, canvas.width, canvas.height);
}

class Character {
  constructor(x, y, idleImg, data) {
    this.x = x;
    this.y = y;
    this.idleImg = idleImg;
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
      this.state = "move";
    } else {
      this.state = "idle";
    }

    if (prevState !== this.state) {
      this.frame = 0;
      this.timer = 0;
    }

    if (isActive) {
      if (input.left) {
        this.x -= this.data.moveSpeed * currentScale;
        this.dir = -1;
      }
      if (input.right) {
        this.x += this.data.moveSpeed * currentScale;
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
    const currentImg = (this.state === "move" && this.moveImg) ? this.moveImg : this.idleImg;

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

function loadCharacter(path, x, y) {
  return fetch(`${path}/data.json`)
    .then(res => res.json())
    .then(data => {
      const idleImg = new Image();
      idleImg.src = `${path}/idle.png`;
      const moveImg = new Image();
      moveImg.src = `${path}/move.png`;
      return new Promise(resolve => {
        let loadedCount = 0;
        const checkLoaded = () => {
          loadedCount++;
          if (loadedCount === 2) {
            const c = new Character(x, y, idleImg, data);
            c.moveImg = moveImg;
            resolve(c);
          }
        };
        idleImg.onload = checkLoaded;
        moveImg.onload = checkLoaded;
      });
    });
}

bg.onload = async () => {
  resize();
  const groundY = canvas.height;
  const charHeight = 64 * currentScale * CHARACTER_SCALE;

  // 初期位置も canvas.width を基準に配置
  const makoto = await loadCharacter("characters/makoto", canvas.width * 0.2, groundY - charHeight - Y_OFFSET * currentScale);
  const masa = await loadCharacter("characters/masa", canvas.width * 0.6, groundY - charHeight - Y_OFFSET * currentScale);

  characters.push(makoto, masa);
  loop();
};

function loop() {
  draw();
  characters.forEach((c, i) => c.update(i === activeCharacterIndex));
  characters.forEach(c => c.draw());
  requestAnimationFrame(loop);
}
