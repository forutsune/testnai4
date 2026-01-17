const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const BASE_WIDTH = 64;
const BASE_HEIGHT = 48;

let currentScale = 1;

const bg = new Image();
bg.src = "background.png";

const CHARACTER_SCALE = 0.375; // 背景の半分サイズ
const Y_OFFSET = 10; // 足元微調整

// 入力状態
const input = { left: false, right: false };
let activeCharacterIndex = 0;
const characters = [];

// キーボード操作
window.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft") input.left = true;
  if (e.key === "ArrowRight") input.right = true;
});
window.addEventListener("keyup", e => {
  if (e.key === "ArrowLeft") input.left = false;
  if (e.key === "ArrowRight") input.right = false;
});

// スマホボタン
document.getElementById("left").addEventListener("touchstart", () => input.left = true);
document.getElementById("left").addEventListener("touchend", () => input.left = false);
document.getElementById("right").addEventListener("touchstart", () => input.right = true);
document.getElementById("right").addEventListener("touchend", () => input.right = false);

// 操作キャラ切替
document.getElementById("switchBtn").addEventListener("click", () => {
  activeCharacterIndex = (activeCharacterIndex + 1) % characters.length;
});

// リサイズ
function resize() {
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;

  const scale = Math.floor(Math.min(screenW / BASE_WIDTH, screenH / BASE_HEIGHT));

  canvas.width = BASE_WIDTH * scale;
  canvas.height = BASE_HEIGHT * scale;
  currentScale = scale;

  ctx.imageSmoothingEnabled = false;
  draw();
}
window.addEventListener("resize", resize);

// 背景描画
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bg, 0, 0, BASE_WIDTH, BASE_HEIGHT, 0, 0, canvas.width, canvas.height);
}

// キャラクタークラス
class Character {
  constructor(x, y, idleImg, data) {
    this.x = x;
    this.y = y;
    this.idleImg = idleImg; // 待機画像
    this.moveImg = null;    // 移動画像（loadCharacterで代入）
    this.data = data;

    this.frame = 0;
    this.timer = 0;
    this.dir = 1; // 1:右, -1:左
    this.state = "idle"; // "idle" または "move"
  }

  getWidth() {
    // 現在の状態のアニメーション設定から幅を取得
    return this.data[this.state].frameWidth * currentScale * CHARACTER_SCALE;
  }

  update(isActive = false) {
    const prevState = this.state;

    // 状態切替
    if (isActive && (input.left || input.right)) {
      this.state = "move";
    } else {
      this.state = "idle";
    }

    // 状態が変わった瞬間にアニメーションを最初から再生
    if (prevState !== this.state) {
      this.frame = 0;
      this.timer = 0;
    }

    // 入力による移動
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

    // アニメ更新
    const anim = this.data[this.state];
    this.timer++;
    if (this.timer >= anim.speed) {
      this.timer = 0;
      this.frame = (this.frame + 1) % anim.frames;
    }

    // 端制御
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

    // 描画する画像を選択（move中でmoveImgがあればそれを使う）
    const currentImg = (this.state === "move" && this.moveImg) ? this.moveImg : this.idleImg;

    ctx.save();
    // キャラクターの中心（足元基準）で反転させるための座標計算
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

// キャラクター読み込み
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

// ゲーム開始
bg.onload = async () => {
  resize();

  const groundY = BASE_HEIGHT * currentScale;
  // 基準となる高さ（64ピクセル）
  const charHeight = 64 * currentScale * CHARACTER_SCALE;

  const makoto = await loadCharacter("characters/makoto", 12 * currentScale, groundY - charHeight - Y_OFFSET * currentScale);
  const masa = await loadCharacter("characters/masa", 36 * currentScale, groundY - charHeight - Y_OFFSET * currentScale);

  characters.push(makoto, masa);

  loop();
};

// メインループ
function loop() {
  draw();
  // 更新処理
  characters.forEach((c, i) => c.update(i === activeCharacterIndex));
  // 描画処理
  characters.forEach(c => c.draw());
  requestAnimationFrame(loop);
}
