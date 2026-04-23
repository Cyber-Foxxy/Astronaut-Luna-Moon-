
class StartScene extends Phaser.Scene {
  constructor() {
    super("StartScene");
  }

  preload() {
    this.load.setPath("assets/");
    this.load.image("bg", "background.png");
  }

  create() {
    const { width, height } = this.scale;

    this.add.image(width / 2, height / 2, "bg").setDisplaySize(width, height);
    this.add.rectangle(width / 2, height / 2, width, height, 0x120b2f, 0.4);

    this.add.text(width / 2, 120, "Astronaut Luna Moon", {
      fontSize: "44px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(width / 2, 240,
      "Collect stars\nAvoid aliens + spikes\nSpacebar = Jump",
      {
        fontSize: "26px",
        color: "#ffe680",
        align: "center",
        stroke: "#000000",
        strokeThickness: 5
      }
    ).setOrigin(0.5);

    const btn = this.add.rectangle(width / 2, 420, 220, 65, 0x8b5cf6)
      .setInteractive({ useHandCursor: true });

    this.add.text(width / 2, 420, "START", {
      fontSize: "28px",
      color: "#fff"
    }).setOrigin(0.5);

    btn.on("pointerdown", () => {
      this.scene.start("MainScene", { score: 0, level: 1, lives: 3 });
    });
  }
}

class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.timeAlive = 0;
    this.invincible = false;
    this.gameOverFlag = false;
  }

  init(data) {
    this.score = data.score || 0;
    this.level = data.level || 1;
    this.lives = data.lives ?? 3;
    this.timeAlive = 0;
    this.invincible = false;
    this.gameOverFlag = false;
  }

  preload() {
    this.load.setPath("assets/");

    this.load.image("bg", "background.png");
    this.load.image("player", "astronaut.png");
    this.load.image("alien1", "alien1.png");
    this.load.image("alien2", "alien2.png");
    this.load.image("platform", "platform.png");
    this.load.image("spikes", "spikes.png");
    this.load.image("star1", "star1.png");
    this.load.image("star2", "star2.png");
  }

  create() {
    const { width, height } = this.scale;

    this.add.image(width / 2, height / 2, "bg").setDisplaySize(width, height);
    this.add.rectangle(width / 2, height / 2, width, height, 0x120b2f, 0.15);

    this.physics.world.setBounds(0, 0, width, height);

    // groups
    this.platforms = this.physics.add.staticGroup();
    this.spikes = this.physics.add.staticGroup();
    this.collectibles = this.physics.add.group();
    this.hazards = this.physics.add.group();

    this.buildPlatforms();
    this.buildSpikes();
    this.createPlayer();
    this.createEnemies();
    this.createCollectibles();
    this.spawnHazards();
    this.createUI();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // collisions
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.runner, this.platforms);
    this.physics.add.collider(this.collectibles, this.platforms);
    this.physics.add.collider(this.hazards, this.platforms);

    this.physics.add.overlap(this.player, this.collectibles, this.collect, null, this);
    this.physics.add.overlap(this.player, this.runner, this.hit, null, this);
    this.physics.add.overlap(this.player, this.flyer, this.hit, null, this);
    this.physics.add.overlap(this.player, this.spikes, this.hit, null, this);
    this.physics.add.overlap(this.player, this.hazards, this.hit, null, this);
  }

  // ---------------- PLATFORMS ----------------
  buildPlatforms() {
    const data = [
      { x: 400, y: 510, sx: 1.1, sy: 0.6 },
      { x: 170, y: 430, sx: 0.5, sy: 0.42 },
      { x: 330, y: 360, sx: 0.5, sy: 0.42 },
      { x: 500, y: 295, sx: 0.5, sy: 0.42 },
      { x: 670, y: 230, sx: 0.5, sy: 0.42 },
      { x: 230, y: 240, sx: 0.42, sy: 0.36 },
      { x: 690, y: 380, sx: 0.42, sy: 0.36 }
    ];

    data.forEach(p => {
      const plat = this.platforms.create(p.x, p.y, "platform");
      plat.setScale(p.sx, p.sy);
      plat.refreshBody();
    });
  }

  // ---------------- SPIKES (even + small) ----------------
  buildSpikes() {
    const positions = [120, 240, 360, 480, 600, 720];

    positions.forEach(x => {
      const spike = this.spikes.create(x, 485, "spikes");
      spike.setScale(0.12);
      spike.refreshBody();
    });
  }

  // ---------------- PLAYER ----------------
  createPlayer() {
    this.player = this.physics.add.sprite(100, 460, "player");
    this.player.setScale(0.12);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.02);
  }

  // ---------------- ENEMIES ----------------
  createEnemies() {
    // ground alien
    this.runner = this.physics.add.sprite(500, 250, "alien1");
    this.runner.setScale(0.13);
    this.runner.setVelocityX(80);

    // flying alien
    this.flyer = this.physics.add.sprite(300, 160, "alien2");
    this.flyer.setScale(0.14);
    this.flyer.body.allowGravity = false;
    this.flyer.startY = this.flyer.y;
    this.flyer.setVelocityX(60);
  }

  // ---------------- COLLECTIBLES ----------------
  createCollectibles() {
    const items = [
      { x: 170, y: 390, key: "star1", value: 10, scale: 0.08 },
      { x: 330, y: 320, key: "star1", value: 10, scale: 0.08 },
      { x: 500, y: 255, key: "star1", value: 15, scale: 0.08 },
      { x: 670, y: 190, key: "star1", value: 15, scale: 0.08 },

      { x: 700, y: 350, key: "star2", value: 25, scale: 0.04 },
      { x: 220, y: 190, key: "star2", value: 25, scale: 0.04 }
    ];

    items.forEach(i => {
      const s = this.collectibles.create(i.x, i.y, i.key);
      s.setScale(i.scale);
      s.value = i.value;
      s.body.setGravityY(40);
    });
  }

  // ---------------- HAZARDS ----------------
  spawnHazards() {
    for (let i = 0; i < 5; i++) {
      this.spawnHazard();
    }

    this.time.addEvent({
      delay: 1200,
      loop: true,
      callback: () => this.spawnHazard()
    });
  }

  spawnHazard() {
    const h = this.hazards.create(
      Phaser.Math.Between(50, 750),
      -40,
      "star2"
    );

    h.setScale(0.035);
    h.setVelocityY(100);
    h.body.setGravityY(200);
  }

  // ---------------- UI ----------------
  createUI() {
    this.scoreText = this.add.text(20, 20, "Score: 0");
    this.livesText = this.add.text(20, 50, "Lives: 3");
    this.timerText = this.add.text(20, 80, "Time: 0");
  }

  // ---------------- GAME LOGIC ----------------
  collect(player, item) {
    this.score += item.value;
    this.scoreText.setText("Score: " + this.score);
    item.destroy();
  }

  hit() {
    if (this.invincible) return;

    this.lives--;
    this.livesText.setText("Lives: " + this.lives);

    this.invincible = true;
    this.player.setTint(0xff0000);

    this.time.delayedCall(1000, () => {
      this.player.clearTint();
      this.invincible = false;
    });

    if (this.lives <= 0) {
      this.scene.restart();
    }
  }

  // ---------------- UPDATE ----------------
  update(time, delta) {
    this.timeAlive += delta / 1000;
    this.timerText.setText("Time: " + this.timeAlive.toFixed(1));

    const speed = 250;

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
    } else {
      this.player.setVelocityX(0);
    }

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.player.body.blocked.down) {
      this.player.setVelocityY(-420);
    }

    // alien 1 respawn
    if (this.runner.y > 600) {
      this.runner.y = -40;
      this.runner.x = Phaser.Math.Between(100, 700);
    }

    // alien 2 bobbing
    this.flyer.y = this.flyer.startY + Math.sin(time / 300) * 20;
  }
}

// ---------------- CONFIG ----------------
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game",
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 500 }, debug: false }
  },
  scene: [StartScene, MainScene]
};

new Phaser.Game(config);
